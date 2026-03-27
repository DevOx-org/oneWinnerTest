const { body, validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Validation rules for registration
const registerValidation = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Name should only contain letters and spaces'),

    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),

    body('phone')
        .trim()
        .notEmpty()
        .withMessage('Phone number is required'),

    body('dateOfBirth')
        .notEmpty()
        .withMessage('Date of birth is required'),

    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain uppercase, lowercase, and number'),
];

// Validation rules for login
const loginValidation = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),

    body('password')
        .notEmpty()
        .withMessage('Password is required'),
];

// Validation rules for Google login
const googleLoginValidation = [
    body('idToken')
        .notEmpty()
        .withMessage('Google ID token is required')
        .isString()
        .withMessage('Google ID token must be a string'),
];

// Validation rules for profile completion
const completeProfileValidation = [
    body('phone')
        .trim()
        .notEmpty()
        .withMessage('Phone number is required')
        .matches(/^(\+91)?[6-9]\d{9}$/)
        .withMessage('Please provide a valid Indian phone number'),

    body('dateOfBirth')
        .optional()
        .isString()
        .withMessage('Date of birth must be a string'),

    body('location')
        .optional()
        .trim()
        .isString()
        .withMessage('Location must be a string'),

    body('bio')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Bio cannot exceed 500 characters'),

    body('gameId')
        .optional()
        .trim()
        .isString()
        .withMessage('Game ID must be a string'),
];

// Middleware to handle validation errors
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg).join(', ');
        throw new ApiError(errorMessages, 400);
    }
    next();
};

module.exports = {
    registerValidation,
    loginValidation,
    googleLoginValidation,
    completeProfileValidation,
    validate,
};
