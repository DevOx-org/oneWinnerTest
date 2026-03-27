'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    createTopUpOrder,
    verifyTopUp,
    getWalletBalance,
    getTransactionHistory,
    requestWithdrawal,
    getMyWithdrawals,
} = require('../controllers/walletController');

// All wallet routes require authentication
router.use(protect);

/**
 * POST /api/wallet/create-order
 * Create a Razorpay order for wallet top-up.
 * Body: { amount: <number in rupees> }
 */
router.post('/create-order', createTopUpOrder);

/**
 * POST /api/wallet/verify
 * Verify Razorpay payment signature and credit wallet.
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Header: X-Idempotency-Key (optional, recommended)
 */
router.post('/verify', verifyTopUp);

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
