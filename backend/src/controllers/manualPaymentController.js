'use strict';

const {
    createManualPaymentRequest,
    getUserManualPayments,
    getAdminManualPayments,
    approveManualPayment,
    rejectManualPayment,
    getPendingManualPaymentCount,
} = require('../services/manualPaymentService');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

// ─── User endpoints ──────────────────────────────────────────────────────────

/**
 * @desc    Submit a manual deposit request
 * @route   POST /api/wallet/manual-deposit
 * @access  Private
 * @body    { amount, paymentMethod, upiReferenceId }
 */
const submitManualDeposit = asyncHandler(async (req, res) => {
    const { amount, paymentMethod, upiReferenceId } = req.body;

    if (amount === undefined || amount === null) {
        throw new ApiError('amount is required', 400);
    }

    const amountNum = typeof amount === 'string' ? parseInt(amount, 10) : amount;
    if (typeof amountNum !== 'number' || !isFinite(amountNum)) {
        throw new ApiError('amount must be a valid number', 400);
    }

    const request = await createManualPaymentRequest(
        req.user.id,
        amountNum,
        paymentMethod,
        upiReferenceId
    );

    res.status(201).json({
        success: true,
        message: 'Deposit request submitted successfully. It will be verified within 2-3 hours.',
        request: {
            _id: request._id,
            amount: request.amount,
            paymentMethod: request.paymentMethod,
            upiReferenceId: request.upiReferenceId,
            status: request.status,
            createdAt: request.createdAt,
        },
    });
});

/**
 * @desc    Get current user's manual deposit history
 * @route   GET /api/wallet/manual-deposits
 * @access  Private
 * @query   page, limit
 */
const getMyManualDeposits = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;

    if (parseInt(limit) > 100) {
        throw new ApiError('limit cannot exceed 100', 400);
    }

    const result = await getUserManualPayments(req.user.id, page, limit);

    res.status(200).json({
        success: true,
        ...result,
    });
});

/**
 * @desc    Get admin UPI info for QR display
 * @route   GET /api/wallet/upi-info
 * @access  Private
 */
const getUpiInfo = asyncHandler(async (req, res) => {
    res.status(200).json({
        success: true,
        upiId: process.env.ADMIN_UPI_ID || 'medeep@slc',
        accountHolder: 'Deepanshu Kashyap',
        qrImagePath: '/upi-qr.jpeg',
    });
});

// ─── Admin endpoints ─────────────────────────────────────────────────────────

/**
 * @desc    Get all manual payment requests (admin)
 * @route   GET /api/admin/manual-payments
 * @access  Private/Admin
 * @query   status, page, limit, search
 */
const getManualPayments = asyncHandler(async (req, res) => {
    const { status = '', page = 1, limit = 20, search = '' } = req.query;

    if (parseInt(limit) > 100) {
        throw new ApiError('limit cannot exceed 100', 400);
    }

    const result = await getAdminManualPayments(status, parseInt(page), parseInt(limit), search);

    res.status(200).json({
        success: true,
        ...result,
    });
});

/**
 * @desc    Approve a manual payment request
 * @route   PATCH /api/admin/manual-payments/:id/approve
 * @access  Private/Admin
 */
const approveManualPaymentHandler = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await approveManualPayment(id, req.user.id);

    logger.info('Admin approved manual payment', {
        requestId: id,
        adminId: req.user.id,
        adminEmail: req.user.email,
        amount: result.request.amount,
        userId: result.request.userId.toString(),
    });

    res.status(200).json({
        success: true,
        message: `₹${result.request.amount} has been credited to the user's wallet.`,
        request: result.request,
        walletCredited: result.walletCredited,
    });
});

/**
 * @desc    Reject a manual payment request
 * @route   PATCH /api/admin/manual-payments/:id/reject
 * @access  Private/Admin
 * @body    { adminNote? }
 */
const rejectManualPaymentHandler = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { adminNote } = req.body;

    const result = await rejectManualPayment(id, req.user.id, adminNote);

    logger.info('Admin rejected manual payment', {
        requestId: id,
        adminId: req.user.id,
        adminEmail: req.user.email,
        amount: result.request.amount,
        userId: result.request.userId.toString(),
        adminNote: adminNote || '(none)',
    });

    res.status(200).json({
        success: true,
        message: 'Payment request rejected.',
        request: result.request,
    });
});

/**
 * @desc    Get count of pending manual payments (for admin badge)
 * @route   GET /api/admin/manual-payments/pending-count
 * @access  Private/Admin
 */
const getPendingCount = asyncHandler(async (req, res) => {
    const count = await getPendingManualPaymentCount();

    res.status(200).json({
        success: true,
        pendingCount: count,
    });
});

module.exports = {
    // User endpoints
    submitManualDeposit,
    getMyManualDeposits,
    getUpiInfo,
    // Admin endpoints
    getManualPayments,
    approveManualPayment: approveManualPaymentHandler,
    rejectManualPayment: rejectManualPaymentHandler,
    getPendingCount,
};
