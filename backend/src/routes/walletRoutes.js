'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    getWalletBalance,
    getTransactionHistory,
    requestWithdrawal,
    getMyWithdrawals,
} = require('../controllers/walletController');
const {
    submitManualDeposit,
    getMyManualDeposits,
    getUpiInfo,
} = require('../controllers/manualPaymentController');

// All wallet routes require authentication
router.use(protect);

/**
 * POST /api/wallet/manual-deposit
 * Submit a manual UPI deposit request.
 * Body: { amount, paymentMethod, upiReferenceId }
 */
router.post('/manual-deposit', submitManualDeposit);

/**
 * GET /api/wallet/manual-deposits
 * Get current user's manual deposit request history.
 * Query: ?page=1&limit=20
 */
router.get('/manual-deposits', getMyManualDeposits);

/**
 * GET /api/wallet/upi-info
 * Get admin UPI ID and QR info for display.
 */
router.get('/upi-info', getUpiInfo);

/**
 * GET /api/wallet/balance
 * Get current wallet balance + last 10 transactions.
 */
router.get('/balance', getWalletBalance);

/**
 * GET /api/wallet/transactions
 * Get paginated full transaction history.
 * Query: ?page=1&limit=20
 */
router.get('/transactions', getTransactionHistory);

/**
 * POST /api/wallet/withdraw
 * Submit a withdrawal request (holds the amount from wallet balance).
 * Body: { amount: <number in rupees>, upiId: <string> }
 */
router.post('/withdraw', requestWithdrawal);

/**
 * GET /api/wallet/withdrawals
 * Get the current user's withdrawal request history.
 * Query: ?page=1&limit=20
 */
router.get('/withdrawals', getMyWithdrawals);

module.exports = router;
