'use strict';

const ManualPaymentRequest = require('../models/ManualPaymentRequest');
const WalletTransaction = require('../models/WalletTransaction');
const User = require('../models/User');
const { creditWallet } = require('./walletService');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');

// ─── Constants ────────────────────────────────────────────────────────────────
const MIN_AMOUNT = 10;
const MAX_AMOUNT = 50000;
const MAX_PENDING_PER_USER = 5;

// ─── createManualPaymentRequest ───────────────────────────────────────────────

/**
 * Submit a new manual payment request.
 * NEVER credits wallet — that only happens on admin approval.
 *
 * @param {string} userId
 * @param {number} amount           - in rupees
 * @param {string} paymentMethod    - gpay | phonepe | paytm | upi_other
 * @param {string} upiReferenceId   - transaction reference from UPI app
 * @returns {Promise<ManualPaymentRequest>}
 */
async function createManualPaymentRequest(userId, amount, paymentMethod, upiReferenceId) {
    // ── Validate amount ───────────────────────────────────────────────────────
    if (!amount || typeof amount !== 'number' || !isFinite(amount)) {
        throw new ApiError('Amount must be a valid number', 400);
    }
    if (amount < MIN_AMOUNT) {
        throw new ApiError(`Minimum deposit amount is ₹${MIN_AMOUNT}`, 400);
    }
    if (amount > MAX_AMOUNT) {
        throw new ApiError(`Maximum deposit amount is ₹${MAX_AMOUNT.toLocaleString()}`, 400);
    }
    // Ensure integer rupees (no paise for manual flow)
    if (!Number.isInteger(amount)) {
        throw new ApiError('Amount must be a whole number (no decimals)', 400);
    }

    // ── Validate payment method ───────────────────────────────────────────────
    const validMethods = ['gpay', 'phonepe', 'paytm', 'upi_other'];
    if (!paymentMethod || !validMethods.includes(paymentMethod)) {
        throw new ApiError(`Invalid payment method. Must be one of: ${validMethods.join(', ')}`, 400);
    }

    // ── Validate UPI reference ID ─────────────────────────────────────────────
    if (!upiReferenceId || typeof upiReferenceId !== 'string') {
        throw new ApiError('UPI Reference ID is required', 400);
    }
    const cleanedRefId = upiReferenceId.trim().toUpperCase();
    if (cleanedRefId.length < 6 || cleanedRefId.length > 50) {
        throw new ApiError('UPI Reference ID must be between 6 and 50 characters', 400);
    }
    // Allow alphanumeric + some common separators
    if (!/^[A-Z0-9\-_]+$/i.test(cleanedRefId)) {
        throw new ApiError('UPI Reference ID must contain only letters, numbers, hyphens, and underscores', 400);
    }

    // ── Rate limit: max pending requests per user ─────────────────────────────
    const pendingCount = await ManualPaymentRequest.countDocuments({
        userId,
        status: 'pending',
    });
    if (pendingCount >= MAX_PENDING_PER_USER) {
        throw new ApiError(
            `You already have ${MAX_PENDING_PER_USER} pending deposit requests. Please wait for them to be verified before submitting more.`,
            429
        );
    }

    // ── Create request ────────────────────────────────────────────────────────
    let request;
    try {
        request = await ManualPaymentRequest.create({
            userId,
            amount,
            paymentMethod,
            upiReferenceId: cleanedRefId,
            status: 'pending',
            idempotencyKey: `manual:${cleanedRefId}`,
        });
    } catch (err) {
        // Handle MongoDB duplicate key error on upiReferenceId
        if (err.code === 11000) {
            // Check which key caused the duplicate
            const keyPattern = err.keyPattern || {};
            if (keyPattern.upiReferenceId || keyPattern.idempotencyKey) {
                throw new ApiError(
                    'This UPI Reference ID has already been submitted. Each transaction reference can only be used once.',
                    409
                );
            }
        }
        throw err;
    }

    logger.info('Manual payment request created', {
        requestId: request._id.toString(),
        userId: userId.toString(),
        amount,
        paymentMethod,
        upiReferenceId: cleanedRefId,
    });

    return request;
}

// ─── getUserManualPayments ────────────────────────────────────────────────────

/**
 * Get a user's manual deposit request history (paginated).
 */
async function getUserManualPayments(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
        ManualPaymentRequest.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        ManualPaymentRequest.countDocuments({ userId }),
    ]);

    return {
        requests,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
        },
    };
}

// ─── getAdminManualPayments ───────────────────────────────────────────────────

/**
 * Admin: get all manual deposit requests with filters (paginated).
 */
async function getAdminManualPayments(status = '', page = 1, limit = 20, search = '') {
    const query = {};

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
        query.status = status;
    }

    // If search term, look up matching users first then filter by userId OR upiRefId
    if (search && search.trim()) {
        const { escapeRegex } = require('../utils/escapeRegex');
        const searchTerm = escapeRegex(search.trim().slice(0, 100)); // Escape + length cap
        // Direct UPI reference ID match (case-insensitive)
        const upiMatch = { upiReferenceId: { $regex: searchTerm, $options: 'i' } };

        // User name/email match
        const matchingUsers = await User.find({
            $or: [
                { name: { $regex: searchTerm, $options: 'i' } },
                { email: { $regex: searchTerm, $options: 'i' } },
            ],
        }).select('_id').limit(50).lean();

        const matchingUserIds = matchingUsers.map(u => u._id);

        query.$or = [
            upiMatch,
            ...(matchingUserIds.length > 0 ? [{ userId: { $in: matchingUserIds } }] : []),
        ];
    }

    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
        ManualPaymentRequest.find(query)
            .populate('userId', 'name email phone')
            .populate('verifiedBy', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        ManualPaymentRequest.countDocuments(query),
    ]);

    return {
        requests,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
        },
    };
}

// ─── approveManualPayment ─────────────────────────────────────────────────────

/**
 * Admin approves a pending manual payment request.
 *
 * ATOMIC: findOneAndUpdate with { status: 'pending' } guard.
 * Only succeeds once — prevents double approval.
 *
 * On success: credits user's depositBalance via walletService.creditWallet().
 * The walletService.creditWallet() call uses idempotencyKey = "manual:<upiRefId>"
 * so even if this function is called twice, the wallet credit only happens once.
 */
async function approveManualPayment(requestId, adminId) {
    // ── Atomic status transition ──────────────────────────────────────────────
    const request = await ManualPaymentRequest.findOneAndUpdate(
        {
            _id: requestId,
            status: 'pending',      // Guard: only pending requests can be approved
        },
        {
            $set: {
                status: 'approved',
                verifiedAt: new Date(),
                verifiedBy: adminId,
            },
        },
        { new: true }
    );

    if (!request) {
        // Either not found or already processed
        const existing = await ManualPaymentRequest.findById(requestId).lean();
        if (!existing) {
            throw new ApiError('Manual payment request not found', 404);
        }
        if (existing.status === 'approved') {
            throw new ApiError('This request has already been approved', 409);
        }
        if (existing.status === 'rejected') {
            throw new ApiError('This request has already been rejected and cannot be approved', 409);
        }
        throw new ApiError('Unable to approve this request', 400);
    }

    // ── Credit wallet — idempotent via idempotencyKey ─────────────────────────
    const idempotencyKey = `manual:${request.upiReferenceId}`;

    const PAYMENT_METHOD_LABELS = {
        gpay: 'Google Pay',
        phonepe: 'PhonePe',
        paytm: 'Paytm',
        upi_other: 'UPI',
    };
    const methodLabel = PAYMENT_METHOD_LABELS[request.paymentMethod] || 'UPI';

    let walletResult;
    try {
        walletResult = await creditWallet(
            request.userId,
            request.amount,
            `Manual deposit via ${methodLabel} (Ref: ${request.upiReferenceId})`,
            request._id.toString(),
            'ManualPaymentRequest',
            {
                paymentMethod: request.paymentMethod,
                upiReferenceId: request.upiReferenceId,
                source: 'upi_qr',
                approvedBy: adminId.toString(),
            },
            null,           // no session (no replica set required)
            idempotencyKey
        );
    } catch (creditErr) {
        // If wallet credit fails (e.g. duplicate idempotency key), log but DON'T
        // roll back the approval — the request IS approved, the wallet just needs
        // reconciliation. This is safer than leaving status as 'pending'.
        if (creditErr.code === 11000 || creditErr.message?.includes('idempotency')) {
            logger.warn('Manual payment approved but wallet credit was duplicate (idempotency key collision)', {
                requestId: requestId.toString(),
                userId: request.userId.toString(),
                idempotencyKey,
            });
            // Still return success — the credit was already applied
            return {
                request,
                walletCredited: true,
                note: 'Credit was already applied (idempotent)',
            };
        }
        // Genuine failure — log critical error
        logger.error('CRITICAL: Manual payment approved but wallet credit FAILED — manual reconciliation needed', {
            requestId: requestId.toString(),
            userId: request.userId.toString(),
            amount: request.amount,
            error: creditErr.message,
        });
        throw new ApiError(
            'Request approved but wallet credit failed. The system has logged this for manual reconciliation. Please contact support.',
            500
        );
    }

    logger.info('Manual payment approved and wallet credited', {
        requestId: requestId.toString(),
        userId: request.userId.toString(),
        amount: request.amount,
        adminId: adminId.toString(),
        newBalance: walletResult.balance,
        upiReferenceId: request.upiReferenceId,
    });

    return {
        request,
        walletCredited: true,
        newBalance: walletResult.balance,
    };
}

// ─── rejectManualPayment ──────────────────────────────────────────────────────

/**
 * Admin rejects a pending manual payment request.
 * No wallet changes — just marks as rejected.
 */
async function rejectManualPayment(requestId, adminId, adminNote = '') {
    const request = await ManualPaymentRequest.findOneAndUpdate(
        {
            _id: requestId,
            status: 'pending',      // Guard: only pending requests can be rejected
        },
        {
            $set: {
                status: 'rejected',
                verifiedAt: new Date(),
                verifiedBy: adminId,
                ...(adminNote ? { adminNote: adminNote.trim().slice(0, 500) } : {}),
            },
        },
        { new: true }
    );

    if (!request) {
        const existing = await ManualPaymentRequest.findById(requestId).lean();
        if (!existing) {
            throw new ApiError('Manual payment request not found', 404);
        }
        if (existing.status === 'rejected') {
            throw new ApiError('This request has already been rejected', 409);
        }
        if (existing.status === 'approved') {
            throw new ApiError('This request has already been approved and cannot be rejected', 409);
        }
        throw new ApiError('Unable to reject this request', 400);
    }

    logger.info('Manual payment rejected', {
        requestId: requestId.toString(),
        userId: request.userId.toString(),
        amount: request.amount,
        adminId: adminId.toString(),
        adminNote: adminNote || '(none)',
        upiReferenceId: request.upiReferenceId,
    });

    // ── Create a WalletTransaction record for audit trail ─────────────────────
    // No balance change — just a record so the user sees the rejection in history.
    const PAYMENT_METHOD_LABELS = {
        gpay: 'Google Pay',
        phonepe: 'PhonePe',
        paytm: 'Paytm',
        upi_other: 'UPI',
    };
    const methodLabel = PAYMENT_METHOD_LABELS[request.paymentMethod] || 'UPI';

    try {
        // Get the user's current deposit balance for the snapshot
        const userDoc = await User.findById(request.userId).select('depositBalance').lean();
        const currentBalance = userDoc?.depositBalance ?? 0;

        await WalletTransaction.create({
            userId: request.userId,
            type: 'manual_deposit_rejected',
            balanceType: 'depositBalance',
            amount: request.amount,
            balanceAfter: currentBalance,   // No change — snapshot of current balance
            description: `Deposit rejected: ${methodLabel} (Ref: ${request.upiReferenceId})${adminNote ? ' — ' + adminNote.trim().slice(0, 100) : ''}`,
            reference: request._id.toString(),
            referenceModel: 'ManualPaymentRequest',
            meta: new Map(Object.entries({
                paymentMethod: request.paymentMethod,
                upiReferenceId: request.upiReferenceId,
                rejectedBy: adminId.toString(),
                adminNote: adminNote || '',
            })),
            idempotencyKey: `manual_reject:${request.upiReferenceId}`,
        });
    } catch (txnErr) {
        // Non-critical: don't fail the rejection if the audit record fails
        // (e.g. duplicate idempotency key means it was already logged)
        if (txnErr.code !== 11000) {
            logger.error('Failed to create rejection transaction record', {
                requestId: requestId.toString(),
                error: txnErr.message,
            });
        }
    }

    return { request };
}

// ─── getPendingManualPaymentCount ─────────────────────────────────────────────

/**
 * Get count of pending manual payments (for admin alert badge).
 */
async function getPendingManualPaymentCount() {
    return ManualPaymentRequest.countDocuments({ status: 'pending' });
}

module.exports = {
    createManualPaymentRequest,
    getUserManualPayments,
    getAdminManualPayments,
    approveManualPayment,
    rejectManualPayment,
    getPendingManualPaymentCount,
};
