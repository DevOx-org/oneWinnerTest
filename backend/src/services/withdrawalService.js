'use strict';

/**
 * withdrawalService — manages the full lifecycle of withdrawal requests.
 *
 * PHASE 4 ARCHITECTURE — winningBalance only:
 *   CREATE:  holdForWithdrawal()  → winningBalance -= amount, lockedBalance += amount
 *   APPROVE: releaseWithdrawalHold('approve') → lockedBalance -= amount, lifetimeWithdrawn += amount
 *   REJECT:  releaseWithdrawalHold('reject')  → lockedBalance -= amount, winningBalance += amount
 *
 * RULES:
 *   • Only winningBalance is eligible for withdrawal. depositBalance is NEVER touched.
 *   • Funds are moved from winningBalance → lockedBalance at request creation.
 *   • This prevents double-spend: the same winning balance cannot be used again.
 *   • lockedBalance shows in the dashboard as "Pending Withdrawal" (not spendable).
 *   • On approval: lockedBalance cleared + lifetimeWithdrawn incremented (audit).
 *   • On rejection: lockedBalance cleared + winningBalance restored.
 *
 * RACE CONDITION PREVENTION:
 *   • holdForWithdrawal uses findOneAndUpdate with winningBalance >= amount guard.
 *   • Status transitions (approve/reject) use findOneAndUpdate + status:'pending' condition.
 *   • idempotency keys on every WalletTransaction prevent double-credit on retry.
 */

const mongoose = require('mongoose');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const User = require('../models/User');
const {
    holdForWithdrawal,
    releaseWithdrawalHold,
} = require('./walletService');
const { InsufficientBalanceError } = require('../utils/errors');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const { sendWithdrawalApprovedEmail, sendWithdrawalRejectedEmail } = require('../config/email');

const MIN_WITHDRAWAL = parseInt(process.env.WALLET_MIN_WITHDRAWAL || '100');
const MAX_WITHDRAWAL = parseInt(process.env.WALLET_MAX_WITHDRAWAL || '100000');
// UPI ID format: username@provider (e.g. user@paytm, 9999999999@ybl)
const UPI_REGEX = /^[\w.\-]+@[\w]+$/;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validateUpiId(upiId) {
    if (!upiId || typeof upiId !== 'string') {
        throw new ApiError('UPI ID is required', 400);
    }
    const trimmed = upiId.trim().toLowerCase();
    if (trimmed.length < 5) {
        throw new ApiError('UPI ID is too short', 400);
    }
    if (trimmed.length > 50) {
        throw new ApiError('UPI ID is too long', 400);
    }
    if (!UPI_REGEX.test(trimmed)) {
        throw new ApiError('Invalid UPI ID format. Expected format: username@provider (e.g. name@paytm)', 400);
    }
}

// ─── createWithdrawalRequest ──────────────────────────────────────────────────

/**
 * Create a withdrawal request and hold funds from winningBalance → lockedBalance.
 *
 * @param {string|ObjectId} userId
 * @param {number}          amountRupees
 * @param {string} upiId — user's UPI ID (e.g. name@paytm)
 * @returns {Promise<{request, walletBalance, winningBalance, lockedBalance}>}
 */
async function createWithdrawalRequest(userId, amountRupees, upiId) {
    // ── Input validation ──────────────────────────────────────────────────────
    if (!amountRupees || typeof amountRupees !== 'number') {
        throw new ApiError('amount must be a number', 400);
    }
    if (amountRupees < MIN_WITHDRAWAL) {
        throw new ApiError(`Minimum withdrawal amount is ₹${MIN_WITHDRAWAL}`, 400);
    }
    if (amountRupees > MAX_WITHDRAWAL) {
        throw new ApiError(`Maximum withdrawal amount is ₹${MAX_WITHDRAWAL}`, 400);
    }

    validateUpiId(upiId);
    const sanitizedUpiId = upiId.trim().toLowerCase();

    // ── Verify user has sufficient winningBalance (pre-flight) ────────────────
    // The actual guard is atomic inside holdForWithdrawal. This pre-check gives
    // a friendly, detailed error before touching the DB.
    const userSnap = await User.findById(userId)
        .select('winningBalance lockedBalance depositBalance')
        .lean();

    if (!userSnap) throw new ApiError('User not found', 404);

    const winningBal = userSnap.winningBalance ?? 0;
    const depositBal = userSnap.depositBalance ?? 0;

    if (winningBal < amountRupees) {
        if (depositBal >= amountRupees) {
            throw new ApiError(
                `Withdrawals can only be made from your winning balance (₹${winningBal}). ` +
                `Your deposit balance (₹${depositBal}) cannot be withdrawn — it can only be used for tournament entries.`,
                402
            );
        }
        throw new ApiError(
            `Insufficient winning balance. You have ₹${winningBal} but requested ₹${amountRupees}.`,
            402
        );
    }

    // ── One pending request per user at a time ────────────────────────────────
    const existingPending = await WithdrawalRequest.findOne({ userId, status: 'pending' }).lean();
    if (existingPending) {
        throw new ApiError(
            'You already have a pending withdrawal request. Please wait for it to be processed before submitting another.',
            409
        );
    }

    // ── Atomic hold: winningBalance -= amount, lockedBalance += amount ────────
    // holdForWithdrawal re-checks winningBalance atomically — no TOCTOU risk.
    let holdResult;
    try {
        holdResult = await holdForWithdrawal(userId, amountRupees);
    } catch (err) {
        if (err instanceof InsufficientBalanceError || err instanceof ApiError) throw err;
        throw new ApiError(`Failed to hold withdrawal amount: ${err.message}`, 500);
    }

    // ── Create the WithdrawalRequest record ───────────────────────────────────
    // CRITICAL: if this fails after the hold, we MUST restore winningBalance.
    let request;
    try {
        request = await WithdrawalRequest.create({
            userId,
            amount: amountRupees,
            status: 'pending',
            upiId: sanitizedUpiId,
            walletTxnId: holdResult.transaction._id,
        });
    } catch (createErr) {
        // Rollback: restore winningBalance by reversing the hold
        const rollbackKey = `rollback:hold:${holdResult.transaction._id}`;
        try {
            await releaseWithdrawalHold(userId, amountRupees, 'reject', null, rollbackKey);
            logger.warn('Withdrawal hold rolled back after request creation failure', {
                userId: userId.toString(), amount: amountRupees,
                txnId: holdResult.transaction._id?.toString(),
                createError: createErr.message,
            });
        } catch (rollbackErr) {
            logger.error('CRITICAL — withdrawal hold rollback FAILED. MANUAL ACTION REQUIRED', {
                userId: userId.toString(), amount: amountRupees,
                txnId: holdResult.transaction._id?.toString(),
                createError: createErr.message,
                rollbackError: rollbackErr.message,
            });
        }
        throw new ApiError(
            `Could not save the withdrawal request: ${createErr.message}. Your balance has been restored.`,
            500
        );
    }

    logger.info('Withdrawal request created — funds moved to lockedBalance', {
        userId: userId.toString(),
        requestId: request._id.toString(),
        amount: amountRupees,
        upiId: sanitizedUpiId,
        winningBalanceAfter: holdResult.winningBalance,
        lockedBalanceAfter: holdResult.lockedBalance,
    });

    return {
        request,
        walletBalance: holdResult.balance,
        winningBalance: holdResult.winningBalance,
        lockedBalance: holdResult.lockedBalance,
    };
}

// ─── approveWithdrawal ────────────────────────────────────────────────────────

/**
 * Admin approves a withdrawal — confirms external payout happened.
 * Releases the locked hold: lockedBalance -= amount, lifetimeWithdrawn += amount.
 */
async function approveWithdrawal(requestId, adminId, adminNote = null) {
    const now = new Date();

    const updated = await WithdrawalRequest.findOneAndUpdate(
        { _id: requestId, status: 'pending' },
        {
            $set: {
                status: 'approved',
                processedBy: adminId,
                processedAt: now,
                adminNote: adminNote?.trim() || null,
                idempotencyKey: `approve:${requestId}`,
            },
        },
        { new: true }
    );

    if (!updated) {
        const existing = await WithdrawalRequest.findById(requestId).select('status').lean();
        if (!existing) throw new ApiError('Withdrawal request not found', 404);
        throw new ApiError(
            `Cannot approve a request with status "${existing.status}". Only pending can be approved.`,
            409
        );
    }

    // Release the hold: lockedBalance → lifetimeWithdrawn (payout)
    try {
        await releaseWithdrawalHold(
            updated.userId,
            updated.amount,
            'approve',
            requestId,
            `approve:lock:${requestId}`
        );
    } catch (releaseErr) {
        logger.error('Approval hold release FAILED — MANUAL ACTION REQUIRED', {
            requestId: requestId.toString(), userId: updated.userId.toString(),
            amount: updated.amount, error: releaseErr.message,
        });
        // Request is already approved — log and continue; don't crash the admin panel.
    }

    logger.warn('Withdrawal approved', {
        adminId: adminId.toString(), requestId: requestId.toString(),
        userId: updated.userId.toString(), amount: updated.amount,
    });

    // Non-blocking email
    User.findById(updated.userId).select('name email').lean()
        .then((u) => {
            if (u?.email) {
                sendWithdrawalApprovedEmail(u.email, u.name, {
                    amount: updated.amount,
                    upiId: updated.upiId ?? '',

                    requestId: requestId.toString(),
                    processedAt: updated.processedAt,
                });
            }
        })
        .catch(() => { /* non-critical */ });

    return { request: updated };
}

// ─── rejectWithdrawal ─────────────────────────────────────────────────────────

/**
 * Admin rejects a withdrawal — restores funds to winningBalance.
 * Releases the locked hold: lockedBalance -= amount, winningBalance += amount.
 */
async function rejectWithdrawal(requestId, adminId, adminNote) {
    if (!adminNote || typeof adminNote !== 'string' || adminNote.trim().length === 0) {
        throw new ApiError('adminNote (rejection reason) is required', 400);
    }
    if (adminNote.trim().length > 500) {
        throw new ApiError('adminNote must not exceed 500 characters', 400);
    }

    const now = new Date();

    const updated = await WithdrawalRequest.findOneAndUpdate(
        { _id: requestId, status: 'pending' },
        {
            $set: {
                status: 'rejected',
                processedBy: adminId,
                processedAt: now,
                adminNote: adminNote.trim(),
                idempotencyKey: `reject:${requestId}`,
            },
        },
        { new: true }
    );

    if (!updated) {
        const existing = await WithdrawalRequest.findById(requestId).select('status').lean();
        if (!existing) throw new ApiError('Withdrawal request not found', 404);
        throw new ApiError(
            `Cannot reject a request with status "${existing.status}". Only pending can be rejected.`,
            409
        );
    }

    // Release the hold: lockedBalance → winningBalance (restore)
    try {
        await releaseWithdrawalHold(
            updated.userId,
            updated.amount,
            'reject',
            requestId,
            `reject:lock:${requestId}`     // idempotency key — safe on retry
        );
    } catch (releaseErr) {
        logger.error('Rejection hold release FAILED — MANUAL ACTION REQUIRED', {
            requestId: requestId.toString(), userId: updated.userId.toString(),
            amount: updated.amount, error: releaseErr.message,
        });
    }

    logger.warn('Withdrawal rejected — balance restored to winningBalance', {
        adminId: adminId.toString(), requestId: requestId.toString(),
        userId: updated.userId.toString(), amount: updated.amount,
        reason: adminNote.trim(),
    });

    // Non-blocking email
    User.findById(updated.userId).select('name email').lean()
        .then((u) => {
            if (u?.email) {
                sendWithdrawalRejectedEmail(u.email, u.name, {
                    amount: updated.amount,
                    reason: adminNote.trim(),
                    requestId: requestId.toString(),
                    processedAt: updated.processedAt,
                });
            }
        })
        .catch(() => { /* non-critical */ });

    return { request: updated };
}

// ─── getUserWithdrawals ────────────────────────────────────────────────────────

async function getUserWithdrawals(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
        WithdrawalRequest.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))

            .lean(),
        WithdrawalRequest.countDocuments({ userId }),
    ]);
    return {
        requests,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    };
}

// ─── getAdminWithdrawals ──────────────────────────────────────────────────────

async function getAdminWithdrawals({ status, page = 1, limit = 20, userId } = {}) {
    const skip = (page - 1) * limit;
    const query = {};
    if (status) query.status = status;
    if (userId) query.userId = userId;

    const [requests, total] = await Promise.all([
        WithdrawalRequest.find(query)
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('userId', 'name email phone')
            .populate('processedBy', 'name email')
            .lean(),
        WithdrawalRequest.countDocuments(query),
    ]);
    return {
        requests,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    };
}

module.exports = {
    createWithdrawalRequest,
    approveWithdrawal,
    rejectWithdrawal,
    getUserWithdrawals,
    getAdminWithdrawals,
};
