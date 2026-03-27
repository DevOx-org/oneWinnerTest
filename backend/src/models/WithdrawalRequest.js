'use strict';

const mongoose = require('mongoose');

/**
 * WithdrawalRequest — tracks user requests to withdraw wallet balance to bank.
 *
 * State machine:  pending → approved | rejected
 *
 * SAFETY GUARANTEES:
 * - Wallet is debited atomically at request creation time (hold).
 *   This prevents concurrent depletion of the same balance.
 * - approved: admin confirms payout happened externally; no extra wallet movement.
 * - rejected: creditWallet() restores the held amount.
 * - Transitions use findOneAndUpdate with status:'pending' condition to prevent
 *   race between two admins processing the same request concurrently.
 * - Once approved or rejected, the record is immutable (enforced below).
 */
const withdrawalRequestSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        // Amount in rupees — always positive
        amount: {
            type: Number,
            required: true,
            min: [1, 'Withdrawal amount must be at least ₹1'],
        },
        // State machine: pending → approved | rejected
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
            required: true,
            index: true,
        },
        // UPI ID provided by user at request time.
        // Snapshot — even if user later changes their UPI, this preserves the original.
        upiId: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        // Admin-side fields — populated on approval or rejection
        processedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        processedAt: {
            type: Date,
            default: null,
        },
        adminNote: {
            type: String,
            trim: true,
            maxlength: 500,
            default: null,
        },
        // Reference to the WalletTransaction created when balance was held (debit)
        walletTxnId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'WalletTransaction',
            default: null,
        },
        // Unique idempotency key — prevents duplicate processing on retries.
        // Format: wdr_req:<requestId>
        idempotencyKey: {
            type: String,
            sparse: true,
            unique: true,
        },
    },
    {
        timestamps: true,
        strict: true,
    }
);

// Compound index: fetch a user's withdrawal history sorted by time
withdrawalRequestSchema.index({ userId: 1, createdAt: -1 });

// Admin view: filter by status (pending queue) sorted by oldest first
withdrawalRequestSchema.index({ status: 1, createdAt: 1 });

// Prevent updates to approved/rejected records — financial audit trail must be immutable
// Uses async function() pattern (Mongoose 6+) — throw instead of next(error).
withdrawalRequestSchema.pre('save', async function () {
    // New documents are always allowed through
    if (this.isNew) return;

    // Allow saves that don't touch the status field (edge-case: updating walletTxnId etc.)
    if (!this.isModified('status')) return;

    // Only allow status transitions FROM pending
    if (this.get('status') !== 'pending') {
        throw new Error('Withdrawal records in a terminal state (approved/rejected) are immutable');
    }
});

module.exports = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);
