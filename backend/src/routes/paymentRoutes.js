const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { getMyPayments, getPaymentById } = require('../controllers/paymentController');

// All routes require authentication
router.use(protect);

// Get current user's wallet top-up history
router.get('/my-payments', getMyPayments);

// Get specific payment details (admin only)
router.get('/:paymentId', authorize('admin'), getPaymentById);

module.exports = router;
