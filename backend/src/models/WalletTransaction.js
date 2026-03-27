const mongoose = require('mongoose');

/**
 * WalletTransaction — immutable audit trail for every wallet movement.
 * A record is created for every credit and debit. Never updated after creation.
 */
const walletTransactionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: [
                'credit',           // Generic wallet top-up / refund credit
                'debit',            // Generic debit / withdrawal hold
                'tournament_entry', // Entry fee deducted from depositBalance
                'tournament_refund',// Entry fee refunded (cancellation / rejection)
                'winning_credit',   // Prize money credited to winningBalance
                'withdrawal_request',// winningBalance held → lockedBalance on withdrawal request
                'withdrawal_refund', // lockedBalance → winningBalance restored on rejection
            ],
            required: true,
        },
        // Amount in rupees — always a positive number regardless of credit/debit
        amount: {
            type: Number,
            required: true,
            min: [0.01, 'Transaction amount must be positive'],
        },
        // Snapshot of wallet balance immediately after this transaction completed
        balanceAfter: {
            type: Number,
            required: true,
            min: 0,
        },
        // Which wallet bucket does balanceAfter refer to?
        // Makes the DB self-documenting for admins reviewing raw records.
        balanceType: {
            type: String,
            enum: ['depositBalance', 'winningBalance', 'lockedBalance', 'combined'],
            default: 'combined',
        },
        // Human-readable description: e.g. "Wallet top-up" or "Tournament entry: Valorant Masters"
        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },
        // Reference to the source document (Razorpay Payment doc or Tournament doc)
        reference: {
            type: String,
            trim: true,
            index: true,
        },
        referenceModel: {
            type: String,
            enum: ['Payment', 'Tournament', 'WithdrawalRequest', null],
            default: null,
        },
        // Flexible metadata bucket
        meta: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            default: {},
        },
        // Idempotency key — unique per logical operation.
        // Enforced at DB layer: duplicate inserts with colliding key are rejected,
        // preventing double-credit on retries or crash recovery.
        // Format examples:
        //   win:<tournamentId>:<userId>   — winnings credit
        //   pay_<razorpayId>              — wallet top-up
        //   wdr:<withdrawalRequestId>     — withdrawal hold debit
        idempotencyKey: {
            type: String,
            trim: true,
            select: false, // never leaked in general queries
        },
    },
    {
        timestamps: true,
        // Prevent accidental updates to financial records
        strict: true,
    }
);

// Query index: user's transactions sorted by time (most common query)
walletTransactionSchema.index({ userId: 1, createdAt: -1 });

// Unique sparse index on idempotencyKey — the DB-level double-credit guard.
// sparse:true means null/undefined keys are excluded from the uniqueness constraint
// (only populated keys must be unique).
walletTransactionSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

// Prevent updates after creation — wallet transactions are immutable
walletTransactionSchema.pre('save', async function () {
    if (!this.isNew) {
        throw new Error('WalletTransaction records are immutable and cannot be updated');
    }
});

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
