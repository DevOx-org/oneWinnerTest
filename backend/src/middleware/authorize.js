const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

/**
 * Middleware to check if user has required role(s)
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'tester', 'user')
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            logger.warn('Authorization failed: No user found in request');
            throw new ApiError('Not authorized to access this route', 401);
        }

        if (!roles.includes(req.user.role)) {
            logger.warn(`Authorization failed: User ${req.user.email} with role ${req.user.role} attempted to access route requiring roles: ${roles.join(', ')}`);
            throw new ApiError('You do not have permission to perform this action', 403);
        }

        logger.info(`User ${req.user.email} authorized with role ${req.user.role}`);
        next();
    };
};

module.exports = { authorize };
