'use strict';

const mongoose = require('mongoose');

/**
 * ManualPaymentRequest — tracks QR-based manual UPI deposit requests.
 *
 * FLOW:
 *   1. User submits { amount, paymentMethod, upiReferenceId }
 *   2. Request sits in 'pending' until admin reviews
 *   3. Admin either approves (wallet credited) or rejects (no wallet change)
 *
 * SECURITY:
 *   - Wallet is NEVER credited on creation — only on admin approval
 *   - upiReferenceId is unique (DB enforced) to prevent duplicate/fraud
 *   - idempotencyKey prevents double-credit even on retry
 *   - Atomic status transitions (pending → approved/rejected)
 */
const manualPaymentRequestSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        amount: {
            type: Number,
            required: [true, 'Amount is required'],
            min: [10, 'Minimum deposit is ₹10'],
            max: [50000, 'Maximum deposit is ₹50,000'],
        },
        paymentMethod: {
            type: String,
            required: [true, 'Payment method is required'],
            enum: {
                values: ['gpay', 'phonepe', 'paytm', 'upi_other'],
                message: 'Invalid payment method. Must be gpay, phonepe, paytm, or upi_other',
            },
        },
        // UPI Transaction Reference ID — must be globally unique
        upiReferenceId: {
            type: String,
            required: [true, 'UPI Reference ID is required'],
            trim: true,
            uppercase: true,
            unique: true,
            index: true,
            minlength: [6, 'UPI Reference ID must be at least 6 characters'],
            maxlength: [50, 'UPI Reference ID must not exceed 50 characters'],
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
            required: true,
            index: true,
        },
        // Admin rejection/approval note
        adminNote: {
            type: String,
            trim: true,
            maxlength: [500, 'Admin note must not exceed 500 characters'],
        },
        // When admin verified (approved/rejected)
        verifiedAt: {
            type: Date,
        },
        // Which admin processed this
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        // Idempotency key: "manual:<upiRefId>" — prevents double wallet credit
        idempotencyKey: {
            type: String,
            trim: true,
            sparse: true,
            unique: true,
        },
    },
    {
        timestamps: true,
        strict: true,
    }
);

// Compound indexes for efficient queries
manualPaymentRequestSchema.index({ userId: 1, createdAt: -1 });
manualPaymentRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ManualPaymentRequest', manualPaymentRequestSchema);
