'use strict';

const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

/**
 * paymentController — covers wallet top-up payment history only.
 *
 * NOTE: createOrder and verifyPayment for tournament entry have been REMOVED.
 * Tournament registration now goes through walletController + tournamentRegistrationService.
 * These functions have been moved to walletController.js.
 */

/**
 * @desc    Get current user's wallet top-up history
 * @route   GET /api/payments/my-payments
 * @access  Private
 */
const getMyPayments = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    const [payments, total] = await Promise.all([
        Payment.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean(),
        Payment.countDocuments({ userId: req.user.id }),
    ]);

    res.status(200).json({
        success: true,
        payments: payments.map((p) => ({
            id: p._id,
            orderId: p.orderId,
            paymentId: p.paymentId,
            type: p.type,
            amount: p.amount / 100, // paise to rupees
            currency: p.currency,
            status: p.status,
            paidAt: p.paidAt,
            createdAt: p.createdAt,
        })),
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
        },
    });
});

/**
 * @desc    Get a single payment by ID (Admin only)
 * @route   GET /api/payments/:paymentId
 * @access  Private/Admin
 */
const getPaymentById = asyncHandler(async (req, res) => {
    const payment = await Payment.findById(req.params.paymentId)
        .populate('userId', 'name email')
        .lean();

    if (!payment) {
        throw new ApiError('Payment not found', 404);
    }

    res.status(200).json({
        success: true,
        payment: {
            id: payment._id,
            orderId: payment.orderId,
            paymentId: payment.paymentId,
            type: payment.type,
            amount: payment.amount / 100,
            currency: payment.currency,
            status: payment.status,
            user: payment.userId,
            paidAt: payment.paidAt,
            createdAt: payment.createdAt,
            metadata: payment.metadata,
        },
    });
});

module.exports = { getMyPayments, getPaymentById };
