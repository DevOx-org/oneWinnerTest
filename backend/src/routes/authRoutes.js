const express = require('express');
const { register, login, sendOtp, verifyOtp, googleLogin } = require('../controllers/authController');
const { registerValidation, loginValidation, googleLoginValidation, validate } = require('../middleware/validator');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/google', googleLoginValidation, validate, googleLogin);

// Protected routes (requires valid JWT)
router.post('/send-otp', protect, sendOtp);
router.post('/verify-otp', protect, verifyOtp);

module.exports = router;
