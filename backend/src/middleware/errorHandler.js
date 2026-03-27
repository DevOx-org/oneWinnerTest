const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');
const {
    InsufficientBalanceError,
    DuplicateRegistrationError,
    TournamentFullError,
    RegistrationClosedError,
    InvalidPaymentError,
    DuplicatePaymentError,
} = require('../utils/errors');

const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    error.statusCode = err.statusCode;

    // Log error
    logger.error(`Error: ${err.message}`, {
        name: err.name,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
    });

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        error = new ApiError('Resource not found', 404);
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
        error = new ApiError(message, 400);
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map((val) => val.message).join(', ');
        error = new ApiError(message, 400);
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        error = new ApiError('Invalid token. Please log in again', 401);
    }
    if (err.name === 'TokenExpiredError') {
        error = new ApiError('Token expired. Please log in again', 401);
    }

    // Build response
    const statusCode = error.statusCode || err.statusCode || 500;
    const body = {
        success: false,
        message: error.message || err.message || 'Server Error',
    };

    // Attach domain-specific fields for structured client handling
    if (err instanceof InsufficientBalanceError) {
        body.available = err.available;
        body.required = err.required;
        body.errorCode = 'INSUFFICIENT_BALANCE';
    } else if (err instanceof DuplicateRegistrationError) {
        body.errorCode = 'DUPLICATE_REGISTRATION';
    } else if (err instanceof TournamentFullError) {
        body.errorCode = 'TOURNAMENT_FULL';
    } else if (err instanceof RegistrationClosedError) {
        body.errorCode = 'REGISTRATION_CLOSED';
    } else if (err instanceof InvalidPaymentError) {
        body.errorCode = 'INVALID_PAYMENT';
    } else if (err instanceof DuplicatePaymentError) {
        body.errorCode = 'DUPLICATE_PAYMENT';
    }

    if (process.env.NODE_ENV === 'development') {
        body.stack = err.stack;
    }

    res.status(statusCode).json(body);
};

module.exports = errorHandler;
