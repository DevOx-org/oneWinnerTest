const mongoose = require('mongoose');

/**
 * Payment — tracks Razorpay orders used for wallet top-ups.
 * This model is NO LONGER used for tournament entry payments.
 * Tournament registrations are tracked via WalletTransaction + Tournament.participants.
 */
const paymentSchema = new mongoose.Schema(
    {
        // Razorpay order ID (e.g. order_xxxxx) — primary idempotency anchor
        orderId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        // Razorpay payment ID (e.g. pay_xxxxx) — set after successful payment
        paymentId: {
            type: String,
            sparse: true,
            index: true,
        },
        // HMAC signature from Razorpay — stored for audit
        signature: {
            type: String,
        },
        // Who initiated this top-up
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        // Type of payment — currently only wallet top-ups go through here
        type: {
            type: String,
            enum: ['wallet_topup'],
            default: 'wallet_topup',
            required: true,
        },
        // Amount in PAISE (smallest unit). ₹500 = 50000 paise.
        amount: {
            type: Number,
            required: true,
            min: 1,
        },
        currency: {
            type: String,
            default: 'INR',
            enum: ['INR'],
        },
        status: {
            type: String,
            enum: ['created', 'paid', 'failed', 'refunded'],
            default: 'created',
            required: true,
            index: true,
        },
        paidAt: {
            type: Date,
        },
        failureReason: {
            type: String,
        },
        // Caller-supplied idempotency key — prevents duplicate wallet credits
        // on webhook replays or accidental double submission
        idempotencyKey: {
            type: String,
            sparse: true,
            unique: true,
            // Note: unique:true already creates an index; no separate index:true needed
        },
        // Flexible metadata (e.g. user-agent, IP for fraud detection)
        metadata: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

// Index: Fetch a user's payment history sorted by time
paymentSchema.index({ userId: 1, createdAt: -1 });
// Index: Filter by status for admin reporting
paymentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
