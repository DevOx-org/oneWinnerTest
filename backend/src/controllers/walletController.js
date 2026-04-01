'use strict';

const { getTransactionHistory, getWalletBalanceDetails } = require('../services/walletService');
const { createWithdrawalRequest, getUserWithdrawals } = require('../services/withdrawalService');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

// ─── Limits ───────────────────────────────────────────────────────────────────
const MIN_TOPUP_RUPEES = parseInt(process.env.WALLET_MIN_TOPUP || '10');
const MAX_TOPUP_RUPEES = parseInt(process.env.WALLET_MAX_TOPUP || '50000');

/**
 * @desc    Get wallet balance + last 10 transactions
 * @route   GET /api/wallet/balance
 * @access  Private
 */
const getWalletBalance = asyncHandler(async (req, res) => {
    const { balance, wallet, transactions, pagination } = await getTransactionHistory(
        req.user.id, 1, 10
    );

    res.status(200).json({
        success: true,
        // Legacy field — total spendable (backward-compat)
        walletBalance: balance,
        // Phase 1: full balance breakdown
        wallet,
        recentTransactions: transactions,
        pagination,
    });
});

/**
 * @desc    Get paginated transaction history
 * @route   GET /api/wallet/transactions
 * @access  Private
 * @query   page, limit
 */
const getTransactionHistoryHandler = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;

    if (parseInt(limit) > 100) {
        throw new ApiError('limit cannot exceed 100', 400);
    }

    const result = await getTransactionHistory(req.user.id, page, limit);

    res.status(200).json({
        success: true,
        ...result,
    });
});

/**
 * @desc    Submit a withdrawal request (debit hold from wallet)
 * @route   POST /api/wallet/withdraw
 * @access  Private
 * @body    { amount: number, upiId: string }
 */
const requestWithdrawal = asyncHandler(async (req, res) => {
    const { amount, upiId } = req.body;

    if (amount === undefined || amount === null) {
        throw new ApiError('amount (in rupees) is required', 400);
    }
    // Coerce string numbers from JSON (safety belt — body-parser should already give number)
    const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (typeof amountNum !== 'number' || !isFinite(amountNum) || amountNum <= 0) {
        throw new ApiError('amount must be a valid positive number', 400);
    }

    const { request, walletBalance, winningBalance, lockedBalance } = await createWithdrawalRequest(
        req.user.id,
        amountNum,
        upiId
    );

    res.status(201).json({
        success: true,
        message: `Withdrawal request of ₹${amountNum} submitted. It will be processed within 1-3 business days.`,
        request: {
            _id: request._id,
            amount: request.amount,
            status: request.status,
            createdAt: request.createdAt,
            upiId: request.upiId ?? '',
        },
        walletBalance,
    });
});

/**
 * @desc    Get user's own withdrawal request history
 * @route   GET /api/wallet/withdrawals
 * @access  Private
 * @query   page, limit
 */
const getMyWithdrawals = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;

    if (parseInt(limit) > 100) {
        throw new ApiError('limit cannot exceed 100', 400);
    }

    const result = await getUserWithdrawals(req.user.id, page, limit);

    res.status(200).json({
        success: true,
        ...result,
    });
});

module.exports = {
    getWalletBalance,
    getTransactionHistory: getTransactionHistoryHandler,
    requestWithdrawal,
    getMyWithdrawals,
};
