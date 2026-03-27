const ApiError = require('./ApiError');

/**
 * Typed error subclasses for domain-specific failures.
 * These allow controllers and error handlers to branch precisely on error type.
 */

class InsufficientBalanceError extends ApiError {
    constructor(available, required) {
        super(
            `Insufficient wallet balance. Available: ₹${available}, Required: ₹${required}`,
            400
        );
        this.name = 'InsufficientBalanceError';
        this.available = available;
        this.required = required;
    }
}

class DuplicateRegistrationError extends ApiError {
    constructor(tournamentTitle) {
        super(
            `You are already registered for "${tournamentTitle}"`,
            409
        );
        this.name = 'DuplicateRegistrationError';
    }
}

class TournamentFullError extends ApiError {
    constructor(tournamentTitle) {
        super(
            `Tournament "${tournamentTitle}" is full. No slots remaining.`,
            409
        );
        this.name = 'TournamentFullError';
    }
}

class RegistrationClosedError extends ApiError {
    constructor(tournamentTitle, reason) {
        super(
            `Registration for "${tournamentTitle}" is closed. ${reason || ''}`.trim(),
            400
        );
        this.name = 'RegistrationClosedError';
    }
}

class InvalidPaymentError extends ApiError {
    constructor(detail) {
        super(
            `Payment verification failed. ${detail || 'Invalid signature or payload.'}`.trim(),
            400
        );
        this.name = 'InvalidPaymentError';
    }
}

class DuplicatePaymentError extends ApiError {
    constructor() {
        super('This payment has already been processed (idempotency key already used).', 409);
        this.name = 'DuplicatePaymentError';
    }
}

module.exports = {
    InsufficientBalanceError,
    DuplicateRegistrationError,
    TournamentFullError,
    RegistrationClosedError,
    InvalidPaymentError,
    DuplicatePaymentError,
};
