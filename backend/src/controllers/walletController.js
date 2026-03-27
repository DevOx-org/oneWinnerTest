const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const { creditWallet, getTransactionHistory, getWalletBalanceDetails } = require('../services/walletService');
const { createWithdrawalRequest, getUserWithdrawals } = require('../services/withdrawalService');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { InvalidPaymentError, DuplicatePaymentError } = require('../utils/errors');
const logger = require('../config/logger');

// Lazily initialise Razorpay so missing env vars produce a clear runtime error
// rather than crashing the whole server on import.
let _razorpay = null;
function getRazorpay() {
    if (!_razorpay) {
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            throw new ApiError('Razorpay keys (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are not configured', 500);
        }
        _razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }
    return _razorpay;
}

// ─── Limits ───────────────────────────────────────────────────────────────────
const MIN_TOPUP_RUPEES = parseInt(process.env.WALLET_MIN_TOPUP || '10');
const MAX_TOPUP_RUPEES = parseInt(process.env.WALLET_MAX_TOPUP || '50000');

/**
 * @desc    Create a Razorpay order for wallet top-up
 * @route   POST /api/wallet/create-order
 * @access  Private
 * @body    { amount: number }  — amount in rupees
 */
const createTopUpOrder = asyncHandler(async (req, res) => {
    const { amount } = req.body;

    if (!amount || typeof amount !== 'number') {
        throw new ApiError('amount (in rupees) is required and must be a number', 400);
    }
    if (amount < MIN_TOPUP_RUPEES) {
        throw new ApiError(`Minimum top-up amount is ₹${MIN_TOPUP_RUPEES}`, 400);
    }
    if (amount > MAX_TOPUP_RUPEES) {
        throw new ApiError(`Maximum top-up amount is ₹${MAX_TOPUP_RUPEES}`, 400);
    }

    const amountPaise = Math.round(amount * 100);

    // Create Razorpay order
    let razorpayOrder;
    try {
        razorpayOrder = await getRazorpay().orders.create({
            amount: amountPaise,
            currency: 'INR',
            receipt: `wlt_${Date.now()}_${req.user.id.toString().slice(-6)}`,
            notes: {
                userId: req.user.id.toString(),
                type: 'wallet_topup',
            },
        });
    } catch (err) {
        logger.error('Razorpay order creation failed', { error: err.message, userId: req.user.id });
        throw new ApiError(`Failed to create payment order: ${err.description || err.message}`, 500);
    }

    // Persist the pending payment record
    await Payment.create({
        orderId: razorpayOrder.id,
        userId: req.user.id,
        type: 'wallet_topup',
        amount: amountPaise,
        currency: 'INR',
        status: 'created',
        metadata: new Map([['source', 'wallet_topup']]),
    });

    logger.info('Wallet top-up order created', {
        userId: req.user.id,
        orderId: razorpayOrder.id,
        amountPaise,
    });

    res.status(201).json({
        success: true,
        order: {
            id: razorpayOrder.id,
            amount: razorpayOrder.amount,   // in paise
            amountRupees: amount,
            currency: razorpayOrder.currency,
        },
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
});

/**
 * @desc    Verify Razorpay payment and credit wallet
 * @route   POST /api/wallet/verify
 * @access  Private
 * @body    { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * @header  X-Idempotency-Key  (optional but recommended)
 */
const verifyTopUp = asyncHandler(async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new ApiError('razorpay_order_id, razorpay_payment_id, and razorpay_signature are required', 400);
    }

    // ── Idempotency: check if this paymentId was already processed ────────────
    const existing = await Payment.findOne({ paymentId: razorpay_payment_id, status: 'paid' }).lean();
    if (existing) {
        logger.warn('Duplicate wallet top-up verify attempt', {
            paymentId: razorpay_payment_id,
            userId: req.user.id,
        });
        throw new DuplicatePaymentError();
    }

    // ── Find the pending payment record ───────────────────────────────────────
    const payment = await Payment.findOne({ orderId: razorpay_order_id });

    if (!payment) {
        throw new ApiError('Payment order not found', 404);
    }
    if (payment.userId.toString() !== req.user.id.toString()) {
        throw new ApiError('This payment order does not belong to your account', 403);
    }
    if (payment.status === 'paid') {
        throw new DuplicatePaymentError();
    }

    // ── Verify HMAC signature — the only source of truth ─────────────────────
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

    // Constant-time comparison to prevent timing attacks
    const signaturesMatch = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(razorpay_signature, 'hex')
    );

    if (!signaturesMatch) {
        payment.status = 'failed';
        payment.failureReason = 'HMAC signature mismatch';
        await payment.save();

        logger.warn('Wallet top-up signature mismatch', {
            orderId: razorpay_order_id,
            userId: req.user.id,
        });
        throw new InvalidPaymentError('Signature verification failed. Payment not credited.');
    }

    // ── Signature valid → Mark payment paid, then credit wallet ──────────────
    // Note: We intentionally avoid MongoDB sessions/transactions here because
    // they require a replica set. The idempotency check above (payment.status
    // already === 'paid') prevents double-crediting if this endpoint is hit twice.
    payment.paymentId = razorpay_payment_id;
    payment.signature = razorpay_signature;
    payment.status = 'paid';
    payment.paidAt = new Date();
    payment.idempotencyKey = `pay_${razorpay_payment_id}`;
    await payment.save();

    const amountRupees = payment.amount / 100; // paise → rupees

    let walletResult;
    try {
        walletResult = await creditWallet(
            req.user.id,
            amountRupees,
            `Wallet top-up via Razorpay`,
            razorpay_payment_id,
            'Payment',
            { orderId: razorpay_order_id, paymentId: razorpay_payment_id }
        );
    } catch (creditErr) {
        // If crediting fails after payment was marked paid, log it but don't
        // leave the user without their money — admin can reconcile via Payment record.
        logger.error('Wallet credit failed after payment was marked paid', {
            userId: req.user.id,
            paymentId: razorpay_payment_id,
            error: creditErr.message,
        });
        throw creditErr;
    }

    logger.info('Wallet top-up successful', {
        userId: req.user.id,
        paymentId: razorpay_payment_id,
        amountRupees: payment.amount / 100,
        newBalance: walletResult.balance,
    });

    res.status(200).json({
        success: true,
        message: 'Wallet topped up successfully',
        walletBalance: walletResult.balance,
        transaction: {
            id: walletResult.transaction._id,
            amount: payment.amount / 100,
            type: 'credit',
            description: 'Wallet top-up via Razorpay',
        },
    });
});

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
    createTopUpOrder,
    verifyTopUp,
    getWalletBalance,
    getTransactionHistory: getTransactionHistoryHandler,
    requestWithdrawal,
    getMyWithdrawals,
};
