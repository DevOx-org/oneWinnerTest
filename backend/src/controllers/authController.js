'use strict';

const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const bcrypt = require('bcryptjs');
const { sendWelcomeEmail, sendOtpEmail, sendLoginEmail } = require('../config/email');
const { verifyGoogleToken } = require('../services/googleAuthService');

// ─── Register ────────────────────────────────────────────────────────────────

// @route   POST /api/auth/register
const register = asyncHandler(async (req, res) => {
    const { name, email, phone, dateOfBirth, password } = req.body;
    logger.info(`Registration attempt for email: ${email}`);

    const userExists = await User.findOne({ email });
    if (userExists) throw new ApiError('Email already exists', 400);

    const user = await User.create({ name, email, phone, dateOfBirth, password, profileCompleted: true });
    const token = user.generateToken();
    logger.info(`User registered successfully: ${email}`);

    // Non-blocking welcome email
    sendWelcomeEmail(user.email, user.name).catch(() => { });

    res.status(201).json({
        success: true,
        token,
        user: {
            id: user._id, name: user.name, email: user.email,
            phone: user.phone, dateOfBirth: user.dateOfBirth,
            role: user.role, emailVerified: user.emailVerified,
            profileCompleted: user.profileCompleted,
        },
    });
});

// ─── Login ────────────────────────────────────────────────────────────────────

// @route   POST /api/auth/login
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    logger.info(`Login attempt for email: ${email}`);

    const user = await User.findOne({ email }).select('+password');
    if (!user) throw new ApiError('Invalid credentials', 401);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new ApiError('Invalid credentials', 401);

    const token = user.generateToken();
    logger.info(`User logged in successfully: ${email}`);

    // Non-blocking login notification email
    sendLoginEmail(user.email, user.name);

    res.status(200).json({
        success: true,
        token,
        user: {
            id: user._id, name: user.name, email: user.email,
            phone: user.phone, dateOfBirth: user.dateOfBirth,
            gameId: user.gameId, location: user.location, bio: user.bio,
            role: user.role, walletBalance: user.walletBalance,
            emailVerified: user.emailVerified,
            profileCompleted: user.profileCompleted,
            matchCount: user.matchCount ?? 0,
            winCount: user.winCount ?? 0,
        },
    });
});

// ─── Send OTP ─────────────────────────────────────────────────────────────────

// @route   POST /api/auth/send-otp   (Private — requires JWT)
const sendOtp = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id)
        .select('+emailOtp +emailOtpExpires +emailOtpAttempts');
    if (!user) throw new ApiError('User not found', 404);

    if (user.emailVerified) {
        return res.status(200).json({ success: true, message: 'Email is already verified.' });
    }

    // Cooldown: block if an OTP was sent within the last 60 seconds
    // (expiry is 10 min, so if > 9 min remain, it was sent < 1 min ago)
    if (user.emailOtpExpires && user.emailOtpExpires > new Date(Date.now() + 9 * 60 * 1000)) {
        throw new ApiError('Please wait 60 seconds before requesting a new OTP.', 429);
    }

    const rawOtp = String(Math.floor(100000 + Math.random() * 900000));
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(rawOtp, salt);

    user.emailOtp = hashedOtp;
    user.emailOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.emailOtpAttempts = 0;
    await user.save();

    await sendOtpEmail(user.email, user.name, rawOtp, 10);
    logger.info(`OTP sent to ${user.email}`);

    res.status(200).json({ success: true, message: `Verification code sent to ${user.email}` });
});

// ─── Verify OTP ───────────────────────────────────────────────────────────────

// @route   POST /api/auth/verify-otp   (Private)
const verifyOtp = asyncHandler(async (req, res) => {
    const { otp } = req.body;
    if (!otp || typeof otp !== 'string') throw new ApiError('OTP is required', 400);

    const user = await User.findById(req.user.id)
        .select('+emailOtp +emailOtpExpires +emailOtpAttempts');
    if (!user) throw new ApiError('User not found', 404);

    if (user.emailVerified) {
        return res.status(200).json({ success: true, message: 'Email already verified.' });
    }
    if (!user.emailOtp || !user.emailOtpExpires) {
        throw new ApiError('No OTP pending. Request a new one first.', 400);
    }
    if (user.emailOtpExpires < new Date()) {
        throw new ApiError('OTP expired. Please request a new one.', 400);
    }
    if ((user.emailOtpAttempts || 0) >= 5) {
        throw new ApiError('Too many failed attempts. Please request a new OTP.', 429);
    }

    const isMatch = await bcrypt.compare(otp.trim(), user.emailOtp);
    if (!isMatch) {
        user.emailOtpAttempts = (user.emailOtpAttempts || 0) + 1;
        await user.save();
        const remaining = 5 - user.emailOtpAttempts;
        throw new ApiError(
            remaining > 0
                ? `Incorrect OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
                : 'Too many failed attempts. Please request a new OTP.',
            400
        );
    }

    // ✅ Correct OTP — mark verified, clear OTP data
    user.emailVerified = true;
    user.emailOtp = undefined;
    user.emailOtpExpires = undefined;
    user.emailOtpAttempts = 0;
    await user.save();

    logger.info(`Email verified for user: ${user.email}`);
    res.status(200).json({ success: true, message: 'Email verified successfully! ✅' });
});

// ─── Google Login ─────────────────────────────────────────────────────────────

// @route   POST /api/auth/google
const googleLogin = asyncHandler(async (req, res) => {
    const { idToken } = req.body;
    logger.info('Google login attempt');

    // Step 1 — Verify token on backend (NEVER trust frontend data)
    const googleData = await verifyGoogleToken(idToken);
    const { email, name, googleId, picture } = googleData;

    // Step 2 — Check for duplicate googleId on a different email
    const existingByGoogleId = await User.findOne({ googleId });
    if (existingByGoogleId && existingByGoogleId.email !== email) {
        logger.warn(`Duplicate googleId attempt: ${googleId} already linked to ${existingByGoogleId.email}`);
        throw new ApiError('This Google account is already linked to a different user', 409);
    }

    // Step 3 — Find or create user (single query for performance)
    let user = await User.findOne({ email });
    let isNewUser = false;

    if (user) {
        // Case A / Case C — Existing user (email/password or previously google-linked)
        // Attach googleId if not present; DO NOT overwrite wallet, stats, or password
        const updates = {};
        if (!user.googleId) {
            updates.googleId = googleId;
        }
        if (!user.emailVerified) {
            updates.emailVerified = true;
        }
        // If user already has a phone, ensure profileCompleted is true
        if (user.phone && !user.profileCompleted) {
            updates.profileCompleted = true;
        }

        if (Object.keys(updates).length > 0) {
            await User.updateOne({ _id: user._id }, { $set: updates });
            // Refresh the user object
            user = await User.findById(user._id);
        }

        logger.info(`Existing user Google login (merged): ${email}`);

        // Non-blocking login notification for returning Google users
        sendLoginEmail(user.email, user.name);
    } else {
        // Case B — New user via Google
        user = await User.create({
            name,
            email,
            googleId,
            authProvider: 'google',
            password: null,
            emailVerified: true,
            profileCompleted: false,
        });
        isNewUser = true;

        logger.info(`New user created via Google: ${email}`);

        // Non-blocking welcome email
        sendWelcomeEmail(user.email, user.name).catch(() => {});
    }

    // Step 4 — Generate JWT (same as existing login)
    const token = user.generateToken();

    res.status(isNewUser ? 201 : 200).json({
        success: true,
        token,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            dateOfBirth: user.dateOfBirth,
            gameId: user.gameId,
            location: user.location,
            bio: user.bio,
            role: user.role,
            walletBalance: user.walletBalance,
            emailVerified: user.emailVerified,
            profileCompleted: user.profileCompleted,
            matchCount: user.matchCount ?? 0,
            winCount: user.winCount ?? 0,
        },
    });
});

module.exports = { register, login, sendOtp, verifyOtp, googleLogin };
