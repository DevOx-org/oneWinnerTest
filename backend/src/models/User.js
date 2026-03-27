const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide a name'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [50, 'Name cannot exceed 50 characters'],
        },
        email: {
            type: String,
            required: [true, 'Please provide an email'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [
                /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                'Please provide a valid email',
            ],
        },
        phone: {
            type: String,
            trim: true,
        },
        dateOfBirth: {
            type: String,
        },
        password: {
            type: String,
            minlength: [6, 'Password must be at least 6 characters'],
            select: false, // Don't return password by default
        },
        // ─── Google OAuth ──────────────────────────────────────────────────────
        googleId: {
            type: String,
            sparse: true,
            unique: true,
        },
        authProvider: {
            type: String,
            enum: ['local', 'google'],
            default: 'local',
        },
        gameId: {
            type: String,
            trim: true,
        },
        location: {
            type: String,
            trim: true,
        },
        bio: {
            type: String,
            trim: true,
            maxlength: [500, 'Bio cannot exceed 500 characters'],
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
        deletedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        role: {
            type: String,
            enum: ['user', 'admin', 'tester'],
            default: 'user',
            required: true,
        },
        // ─── Wallet ──────────────────────────────────────────────────────────
        depositBalance: {
            type: Number,
            default: 0,
            min: [0, 'Deposit balance cannot be negative'],
        },
        winningBalance: {
            type: Number,
            default: 0,
            min: [0, 'Winning balance cannot be negative'],
        },
        lockedBalance: {
            type: Number,
            default: 0,
            min: [0, 'Locked balance cannot be negative'],
        },
        lifetimeWithdrawn: {
            type: Number,
            default: 0,
            min: [0, 'Lifetime withdrawn cannot be negative'],
        },
        // ─── Lifetime participation counter ────────────────────────────────────
        matchCount: {
            type: Number,
            default: 0,
            min: [0, 'Match count cannot be negative'],
        },
        // ─── Lifetime win counter (incremented during admin settlement) ──────
        winCount: {
            type: Number,
            default: 0,
            min: [0, 'Win count cannot be negative'],
        },
        // Incremented on every credit/debit — used for optimistic locking
        walletVersion: {
            type: Number,
            default: 0,
        },
        // ─── UPI Details (for withdrawal) ─────────────────────────────────────
        upiId: {
            type: String,
            trim: true,
            lowercase: true,
        },
        // ─── Email Verification (OTP) ─────────────────────────────────────────
        emailVerified: {
            type: Boolean,
            default: false,
        },
        emailOtp: {
            type: String,
            select: false,   // never returned in regular queries
        },
        emailOtpExpires: {
            type: Date,
            select: false,
        },
        emailOtpAttempts: {
            type: Number,
            default: 0,
            select: false,
        },
        // ─── Profile Completion ────────────────────────────────────────────────
        profileCompleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        // Include virtual fields in JSON/object serialisation automatically
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ─── walletBalance virtual (backward-compat) ────────────────────────────────────
// All existing code that reads user.walletBalance keeps working.
// Value = depositBalance + winningBalance (spendable total before lock).
userSchema.virtual('walletBalance').get(function () {
    return (this.depositBalance ?? 0) + (this.winningBalance ?? 0);
});

// Indexes for performance
userSchema.index({ isDeleted: 1, createdAt: -1 });
// Note: email has unique:true at field level, no separate index needed here
// Sparse index on googleId is handled at field level (sparse: true, unique: true)

// Conditional validation: password, phone, dateOfBirth required only for local auth
userSchema.pre('validate', function () {
    if (this.authProvider !== 'google') {
        if (!this.password) {
            this.invalidate('password', 'Please provide a password');
        }
        if (!this.phone) {
            this.invalidate('phone', 'Please provide a phone number');
        }
        if (!this.dateOfBirth) {
            this.invalidate('dateOfBirth', 'Please provide date of birth');
        }
    }
});

// Hash password before saving
userSchema.pre('save', async function () {
    // Skip password hashing for deleted users or if password is not being modified
    if (this.isDeleted || !this.isModified('password')) {
        return;
    }

    // Only hash if password exists and is being modified
    if (this.password) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
userSchema.methods.generateToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    });
};

module.exports = mongoose.model('User', userSchema);
