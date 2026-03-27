const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

const protect = asyncHandler(async (req, res, next) => {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
        logger.warn('No token provided in request');
        throw new ApiError('Not authorized to access this route', 401);
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from token
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            throw new ApiError('User not found', 404);
        }

        logger.info(`User ${req.user.email} authenticated successfully`);
        next();
    } catch (error) {
        logger.error(`Token verification failed: ${error.message}`);
        throw new ApiError('Not authorized to access this route', 401);
    }
});

/**
 * Soft authentication middleware for public routes that benefit from knowing
 * who the user is (if logged in) but must remain accessible to guests.
 *
 * - Valid token   → req.user populated, next() called
 * - No token      → req.user = null, next() called (no error)
 * - Invalid token → req.user = null, next() called (graceful degradation)
 */
const optionalAuth = async (req, res, next) => {
    req.user = null; // default: unauthenticated

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(); // no token — guest access
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('_id email role');
        if (user) {
            req.user = user;
        }
    } catch {
        // Token expired / tampered — treat as guest, don't expose error
    }

    next();
};

module.exports = { protect, optionalAuth };
