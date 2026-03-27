const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const { getUserMatchHistory } = require('../services/matchHistoryService');

// @desc    Get current user profile
// @route   GET /api/user/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) {
        throw new ApiError('User not found', 404);
    }

    res.status(200).json({
        success: true,
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
            profileCompleted: user.profileCompleted,
            matchCount: user.matchCount ?? 0,
            winCount: user.winCount ?? 0,
        },
    });
});

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
    const { name, phone, gameId, location, bio } = req.body;

    logger.info(`Profile update request for user: ${req.user.email}`);

    // Build update object (only include fields that are provided)
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (phone !== undefined) {
        updateFields.phone = phone;
        // Auto-complete profile when phone is provided via Edit Profile
        if (phone) updateFields.profileCompleted = true;
    }
    if (gameId !== undefined) updateFields.gameId = gameId;
    if (location !== undefined) updateFields.location = location;
    if (bio !== undefined) updateFields.bio = bio;

    // Update user
    const user = await User.findByIdAndUpdate(
        req.user.id,
        updateFields,
        { new: true, runValidators: true }
    );

    if (!user) {
        throw new ApiError('User not found', 404);
    }

    logger.info(`Profile updated successfully for user: ${user.email}`);

    res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
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
            profileCompleted: user.profileCompleted,
            matchCount: user.matchCount ?? 0,
            winCount: user.winCount ?? 0,
        },
    });
});

// @desc    Complete user profile (phone required)
// @route   POST /api/user/complete-profile
// @access  Private
const completeProfile = asyncHandler(async (req, res) => {
    const { phone, dateOfBirth, location, bio, gameId } = req.body;

    logger.info(`Profile completion request for user: ${req.user.email}`);

    // Check for duplicate phone numbers
    const existingPhone = await User.findOne({ phone, _id: { $ne: req.user.id } });
    if (existingPhone) {
        throw new ApiError('This phone number is already in use', 409);
    }

    // Build update — phone is required, others are optional
    const updateFields = {
        phone,
        profileCompleted: true,
    };
    if (dateOfBirth !== undefined) updateFields.dateOfBirth = dateOfBirth;
    if (location !== undefined) updateFields.location = location;
    if (bio !== undefined) updateFields.bio = bio;
    if (gameId !== undefined) updateFields.gameId = gameId;

    const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updateFields },
        { new: true, runValidators: true }
    );

    if (!user) {
        throw new ApiError('User not found', 404);
    }

    logger.info(`Profile completed successfully for user: ${user.email}`);

    res.status(200).json({
        success: true,
        message: 'Profile completed successfully',
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
            profileCompleted: user.profileCompleted,
            matchCount: user.matchCount ?? 0,
            winCount: user.winCount ?? 0,
        },
    });
});

// @desc    Get user's tournament participation history
// @route   GET /api/user/match-history
// @access  Private
const getMatchHistory = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const { matches, pagination } = await getUserMatchHistory(req.user.id, page, limit);
    res.status(200).json({ success: true, matches, pagination });
});

module.exports = {
    getProfile,
    updateProfile,
    completeProfile,
    getMatchHistory,
};
