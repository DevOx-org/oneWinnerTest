const express = require('express');
const { getProfile, updateProfile, completeProfile, getMatchHistory } = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { completeProfileValidation, validate } = require('../middleware/validator');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get user profile
router.get('/profile', getProfile);

// Update user profile
router.put('/profile', updateProfile);

// Complete profile (phone required — for Google OAuth users)
router.post('/complete-profile', completeProfileValidation, validate, completeProfile);

// Get user's lifetime tournament participation history
router.get('/match-history', getMatchHistory);

module.exports = router;
