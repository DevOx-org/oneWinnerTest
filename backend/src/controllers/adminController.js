const mongoose = require('mongoose');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const { creditWallet } = require('../services/walletService');
const { distributeWinnings, getPendingSettlements, getPendingSettlementAlerts, getSettlementHistory, getSettlementHistoryById } = require('../services/winningsService');
const {
    approveWithdrawal: approveWithdrawalSvc,
    rejectWithdrawal: rejectWithdrawalSvc,
    getAdminWithdrawals,
} = require('../services/withdrawalService');
const { notifyTournamentLive } = require('../config/email');

// @desc    Get analytics overview
// @route   GET /api/admin/analytics/overview
// @access  Private/Admin
const getAnalytics = asyncHandler(async (req, res) => {
    logger.info(`Admin analytics requested by: ${req.user.email}`);

    const [
        totalUsers,
        totalTournaments,
        activeTournaments,
        completedTournaments,
        totalRevenue,
        newUsersThisMonth,
    ] = await Promise.all([
        User.countDocuments(),
        Tournament.countDocuments({ isDeleted: false }),
        Tournament.countDocuments({ status: 'live', isDeleted: false }),
        Tournament.countDocuments({ status: 'completed', isDeleted: false }),
        Tournament.aggregate([
            { $match: { isDeleted: false } },
            { $group: { _id: null, total: { $sum: '$prizePool' } } },
        ]),
        User.countDocuments({
            createdAt: { $gte: new Date(new Date().setDate(1)) },
        }),
    ]);

    // Calculate growth rate
    const lastMonthUsers = await User.countDocuments({
        createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 1, 1)),
            $lt: new Date(new Date().setDate(1)),
        },
    });

    const growthRate = lastMonthUsers > 0
        ? ((newUsersThisMonth - lastMonthUsers) / lastMonthUsers) * 100
        : 100;

    res.status(200).json({
        success: true,
        analytics: {
            totalUsers,
            totalTournaments,
            activeTournaments,
            completedTournaments,
            totalRevenue: totalRevenue[0]?.total || 0,
            newUsersThisMonth,
            growthRate: Math.round(growthRate * 10) / 10,
        },
    });
});

// @desc    Get user growth metrics
// @route   GET /api/admin/analytics/users
// @access  Private/Admin
const getUserMetrics = asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;
    const daysNum = parseInt(days);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const userGrowth = await User.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate },
            },
        },
        {
            $group: {
                _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    // Role distribution
    const roleDistribution = await User.aggregate([
        {
            $group: {
                _id: '$role',
                count: { $sum: 1 },
            },
        },
    ]);

    res.status(200).json({
        success: true,
        metrics: {
            userGrowth,
            roleDistribution,
        },
    });
});

// @desc    Get tournament metrics
// @route   GET /api/admin/analytics/tournaments
// @access  Private/Admin
const getTournamentMetrics = asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;
    const daysNum = parseInt(days);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    // Tournament status distribution
    const statusDistribution = await Tournament.aggregate([
        { $match: { isDeleted: false } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
            },
        },
    ]);

    // Game popularity
    const gamePopularity = await Tournament.aggregate([
        { $match: { isDeleted: false } },
        {
            $group: {
                _id: '$game',
                count: { $sum: 1 },
                totalParticipants: { $sum: { $size: '$participants' } },
            },
        },
        { $sort: { count: -1 } },
    ]);

    // Recent tournaments
    const recentTournaments = await Tournament.find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('title game status startDate participantCount');

    res.status(200).json({
        success: true,
        metrics: {
            statusDistribution,
            gamePopularity,
            recentTournaments,
        },
    });
});

// @desc    Get all users with pagination
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, search = '', role = '', sortBy = 'createdAt', order = 'desc' } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query - exclude deleted users
    const query = { isDeleted: { $ne: true } };

    if (search) {
        const { escapeRegex } = require('../utils/escapeRegex');
        const safeSearch = escapeRegex(String(search).trim().slice(0, 100));
        query.$or = [
            { name: { $regex: safeSearch, $options: 'i' } },
            { email: { $regex: safeSearch, $options: 'i' } },
        ];
    }
    if (role) {
        query.role = role;
    }

    // Build sort
    const sort = {};
    sort[sortBy] = order === 'asc' ? 1 : -1;

    const [users, total] = await Promise.all([
        User.find(query)
            .select('-password')
            .sort(sort)
            .skip(skip)
            .limit(limitNum),
        User.countDocuments(query),
    ]);

    logger.info(`Admin ${req.user.email} fetched ${users.length} users`);

    res.status(200).json({
        success: true,
        users,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
        },
    });
});

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
        throw new ApiError('User not found', 404);
    }

    // Get user's tournament participation
    const tournaments = await Tournament.find({
        'participants.userId': user._id,
        isDeleted: false,
    }).select('title game status startDate');

    res.status(200).json({
        success: true,
        user,
        tournaments,
    });
});

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
    try {
        const { role, name, phone, gameId, location, bio } = req.body;

        logger.info(`Admin ${req.user.email} attempting to update user ${req.params.id}`);
        logger.info(`Update data: ${JSON.stringify({ role, name, phone, gameId, location, bio })}`);

        const user = await User.findById(req.params.id);

        if (!user) {
            throw new ApiError('User not found', 404);
        }

        // Update fields only if provided
        if (role !== undefined) user.role = role;
        if (name !== undefined) user.name = name;
        if (phone !== undefined) user.phone = phone;
        if (gameId !== undefined) user.gameId = gameId;
        if (location !== undefined) user.location = location;
        if (bio !== undefined) user.bio = bio;

        logger.info(`Saving user with updated fields...`);
        await user.save({ validateBeforeSave: true });

        logger.info(`User ${user.email} updated successfully`);

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                gameId: user.gameId,
                location: user.location,
                bio: user.bio,
            },
        });
    } catch (error) {
        logger.error(`Error updating user: ${error.message}`);
        logger.error(`Error stack: ${error.stack}`);
        throw error;
    }
});

// @desc    Delete user (soft delete)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            throw new ApiError('User not found', 404);
        }

        // Prevent deleting yourself
        if (user._id.toString() === req.user.id) {
            throw new ApiError('Cannot delete your own account', 400);
        }

        // Prevent deleting already deleted users
        if (user.isDeleted) {
            throw new ApiError('User is already deleted', 400);
        }

        // Soft delete using findByIdAndUpdate to bypass hooks
        await User.findByIdAndUpdate(
            req.params.id,
            {
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy: req.user.id
            },
            { runValidators: false }
        );

        logger.warn(`Admin ${req.user.email} deleted user ${user.email} (ID: ${user._id})`);

        res.status(200).json({
            success: true,
            message: 'User deleted successfully',
            deletedUserId: user._id
        });
    } catch (error) {
        logger.error(`Error deleting user: ${error.message}`);
        logger.error(`Error stack: ${error.stack}`);
        throw error;
    }
});

// @desc    Get all tournaments
// @route   GET /api/admin/tournaments
// @access  Private/Admin
const getAllTournaments = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status = '', game = '', sortBy = 'createdAt', order = 'desc' } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = { isDeleted: false };
    if (status) query.status = status;
    if (game) query.game = game;

    // Build sort
    const sort = {};
    sort[sortBy] = order === 'asc' ? 1 : -1;

    const [tournaments, total] = await Promise.all([
        Tournament.find(query)
            .populate('createdBy', 'name email')
            .sort(sort)
            .skip(skip)
            .limit(limitNum),
        Tournament.countDocuments(query),
    ]);

    res.status(200).json({
        success: true,
        tournaments,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
        },
    });
});

// ─── Helper: derive correct status from dates ──────────────────────────────
// Admin can still manually override to 'cancelled' or 'draft',
// but start/end dates must always agree with the computed status.
const computeStatus = ({ startDate, endDate, status }) => {
    // Honour explicit admin overrides for non-time-based statuses
    if (status === 'cancelled' || status === 'draft') return status;
    const now = new Date();
    const start = new Date(startDate);
    const end   = new Date(endDate);
    if (now < start)  return 'upcoming';
    if (now <= end)   return 'live';
    return 'completed';
};

// @desc    Create tournament
// @route   POST /api/admin/tournaments
// @access  Private/Admin
const createTournament = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.body;
    const derivedStatus = computeStatus({
        startDate,
        endDate,
        status: req.body.status,
    });

    const tournamentData = {
        ...req.body,
        createdBy: req.user.id,
        status: derivedStatus,
    };

    const tournament = await Tournament.create(tournamentData);

    logger.info(`Admin ${req.user.email} created tournament: ${tournament.title} [status=${derivedStatus}]`);

    res.status(201).json({
        success: true,
        message: 'Tournament created successfully',
        tournament,
    });
});

// @desc    Update tournament
// @route   PUT /api/admin/tournaments/:id
// @access  Private/Admin
const updateTournament = asyncHandler(async (req, res) => {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) throw new ApiError('Tournament not found', 404);
    if (tournament.isDeleted) throw new ApiError('Cannot update deleted tournament', 400);

    const wasLive = tournament.status === 'live';

    // Update fields (protect immutable fields)
    Object.keys(req.body).forEach(key => {
        if (key !== 'createdBy' && key !== 'participants' && key !== 'status') {
            tournament[key] = req.body[key];
        }
    });

    // Re-derive status from updated dates (honours admin overrides for cancelled/draft)
    tournament.status = computeStatus({
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        status: req.body.status ?? tournament.status,
    });

    const goingLive = tournament.status === 'live' && !wasLive;

    tournament.updatedBy = req.user.id;
    await tournament.save();

    logger.info(`Admin ${req.user.email} updated tournament: ${tournament.title} [status=${tournament.status}]`);

    // ── Tournament-Live Email Notification ────────────────────────────────────
    // Fire non-blocking: fetch all registered participants and email them.
    if (goingLive && tournament.participants?.length > 0) {
        const participantIds = tournament.participants.map(p => p.userId ?? p);
        User.find({ _id: { $in: participantIds } }).select('name email').lean()
            .then(users => notifyTournamentLive(tournament, users))
            .catch(err => logger.error('Tournament-live email batch failed:', err.message));
    }

    res.status(200).json({
        success: true,
        message: 'Tournament updated successfully',
        tournament,
    });
});

// @desc    Delete tournament (soft delete)
// @route   DELETE /api/admin/tournaments/:id
// @access  Private/Admin
const deleteTournament = asyncHandler(async (req, res) => {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
        throw new ApiError('Tournament not found', 404);
    }

    tournament.isDeleted = true;
    tournament.updatedBy = req.user.id;
    await tournament.save();

    logger.warn(`Admin ${req.user.email} deleted tournament: ${tournament.title}`);

    res.status(200).json({
        success: true,
        message: 'Tournament deleted successfully',
    });
});

// @desc    Set / update room credentials for a specific tournament
// @route   PATCH /api/admin/tournaments/:id/room-credentials
// @access  Private/Admin
const setRoomCredentials = asyncHandler(async (req, res) => {
    const { roomId, roomPassword } = req.body;

    // --- Input validation ---
    if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
        throw new ApiError('roomId is required and must be a non-empty string', 400);
    }
    if (roomId.trim().length > 50) {
        throw new ApiError('roomId must not exceed 50 characters', 400);
    }
    if (!roomPassword || typeof roomPassword !== 'string' || roomPassword.trim().length === 0) {
        throw new ApiError('roomPassword is required and must be a non-empty string', 400);
    }
    if (roomPassword.trim().length > 100) {
        throw new ApiError('roomPassword must not exceed 100 characters', 400);
    }

    const tournament = await Tournament.findOne({
        _id: req.params.id,
        isDeleted: false,
    });

    if (!tournament) {
        throw new ApiError('Tournament not found', 404);
    }

    const isUpdate = !!tournament.get('roomId', null, { getters: false });

    // Update credentials — only these two fields are touched
    tournament.roomId = roomId.trim();
    tournament.roomPassword = roomPassword.trim();
    tournament.updatedBy = req.user.id;
    await tournament.save();

    // --- Audit log: roomId is logged, roomPassword is NEVER logged ---
    logger.info(`Room credentials ${isUpdate ? 'updated' : 'set'} by admin`, {
        adminId: req.user.id,
        adminEmail: req.user.email,
        tournamentId: tournament._id,
        tournamentTitle: tournament.title,
        roomId: roomId.trim(),   // room ID is not sensitive — OK to log
        hasPassword: true,       // confirms password was set WITHOUT logging it
        action: isUpdate ? 'update_credentials' : 'set_credentials',
        requestId: req.id,
        userRole: 'admin',
    });

    // Response also NEVER includes the password value
    res.status(200).json({
        success: true,
        message: `Room credentials ${isUpdate ? 'updated' : 'set'} successfully.`,
        tournamentId: tournament._id,
        roomIdSet: true,
        roomPasswordSet: true,
    });
});

// @desc    Get all participants for a specific tournament (enriched)
// @route   GET /api/admin/tournaments/:id/participants
// @access  Private/Admin
const getTournamentParticipants = asyncHandler(async (req, res) => {
    const tournament = await Tournament.findOne({
        _id: req.params.id,
        isDeleted: false,
    })
        .select('title game entryFee maxParticipants participants status')
        .populate({
            path: 'participants.userId',
            select: '_id name email',
            model: 'User',
        })
        .lean();

    if (!tournament) {
        throw new ApiError('Tournament not found', 404);
    }

    const participants = (tournament.participants || []).map((p) => ({
        participantId: p._id,
        userId: p.userId?._id || null,
        username: p.userId?.name || 'Unknown',
        email: p.userId?.email || 'Unknown',
        status: p.status,
        registeredAt: p.registeredAt,
        entryFee: tournament.entryFee,
        refunded: p.refunded ?? false,
        banReason: p.banReason || null,
        bannedAt: p.bannedAt || null,
        // Registration details (filled during tournament signup)
        rank: p.rank ?? null,
        winningAmount: p.winningAmount ?? 0,
        winsDistributedAt: p.winsDistributedAt ?? null,
        teamLeaderName: p.teamLeaderName || null,
        leaderGameName: p.leaderGameName || null,
        teamMember2: p.teamMember2 || null,
        teamMember3: p.teamMember3 || null,
        teamMember4: p.teamMember4 || null,
        assignedSlot: p.assignedSlot ?? null,
    }));

    // Sort: active first, then banned, then cancelled — within each group by join time
    const statusOrder = { confirmed: 0, registered: 1, banned: 2, cancelled: 3 };
    participants.sort((a, b) => {
        const statusDiff = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
        if (statusDiff !== 0) return statusDiff;
        return new Date(a.registeredAt) - new Date(b.registeredAt);
    });

    logger.info('Admin viewed tournament participants', {
        adminId: req.user.id,
        adminEmail: req.user.email,
        tournamentId: tournament._id,
        requestId: req.id,
    });

    res.status(200).json({
        success: true,
        tournament: {
            _id: tournament._id,
            title: tournament.title,
            game: tournament.game,
            status: tournament.status,
            entryFee: tournament.entryFee,
            maxParticipants: tournament.maxParticipants,
        },
        participants,
        total: participants.length,
    });
});



// @desc    Get detailed registration info for a specific participant
// @route   GET /api/admin/tournaments/:id/participants/:userId
// @access  Private/Admin
const getRegistrationDetail = asyncHandler(async (req, res) => {
    const { id: tournamentId, userId: targetUserId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        throw new ApiError('Invalid userId', 400);
    }

    const tournament = await Tournament.findOne({
        _id: tournamentId,
        isDeleted: false,
    })
        .select('title game entryFee prizePool maxParticipants startDate endDate participants status')
        .populate({
            path: 'participants.userId',
            select: '_id name email gameId',
            model: 'User',
        })
        .lean();

    if (!tournament) {
        throw new ApiError('Tournament not found', 404);
    }

    const participant = (tournament.participants || []).find(
        (p) => p.userId?._id?.toString() === targetUserId
    );

    if (!participant) {
        throw new ApiError('User is not a participant in this tournament', 404);
    }

    logger.info('Admin viewed registration detail', {
        adminId: req.user.id,
        adminEmail: req.user.email,
        tournamentId,
        targetUserId,
        requestId: req.id,
    });

    res.status(200).json({
        success: true,
        registration: {
            participantId: participant._id,
            status: participant.status,
            registeredAt: participant.registeredAt,
            assignedSlot: participant.assignedSlot || null,
            teamLeaderName: participant.teamLeaderName || null,
            leaderGameName: participant.leaderGameName || null,
            teamMember2: participant.teamMember2 || null,
            teamMember3: participant.teamMember3 || null,
            teamMember4: participant.teamMember4 || null,
            entryFee: tournament.entryFee,
            refunded: participant.refunded ?? false,
            banReason: participant.banReason || null,
            bannedAt: participant.bannedAt || null,
        },
        user: {
            _id: participant.userId?._id || null,
            name: participant.userId?.name || 'Unknown',
            email: participant.userId?.email || 'Unknown',
            gameId: participant.userId?.gameId || null,
        },
        tournament: {
            _id: tournament._id,
            title: tournament.title,
            game: tournament.game,
            prizePool: tournament.prizePool,
            entryFee: tournament.entryFee,
            startDate: tournament.startDate,
            endDate: tournament.endDate,
            status: tournament.status,
        },
    });
});

// @desc    Ban a participant from a tournament (with optional wallet refund)
// @route   PATCH /api/admin/tournaments/:id/participants/:userId/ban
// @access  Private/Admin
const banTournamentParticipant = asyncHandler(async (req, res) => {
    const { reason, refund = false } = req.body;
    const { id: tournamentId, userId: targetUserId } = req.params;

    // ── Validate inputs ──────────────────────────────────────────────────────
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        throw new ApiError('Ban reason is required', 400);
    }
    if (reason.trim().length > 500) {
        throw new ApiError('Ban reason must not exceed 500 characters', 400);
    }
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        throw new ApiError('Invalid userId', 400);
    }

    const now = new Date();
    const adminId = req.user._id;

    // ── Fetch tournament + locate participant ─────────────────────────────────
    const tournament = await Tournament.findOne({
        _id: tournamentId,
        isDeleted: false,
    }).select('title game entryFee participants');

    if (!tournament) {
        throw new ApiError('Tournament not found', 404);
    }

    const participant = tournament.participants.find(
        (p) => p.userId.toString() === targetUserId
    );

    if (!participant) {
        throw new ApiError('User is not a participant in this tournament', 404);
    }

    if (participant.status === 'banned') {
        throw new ApiError('User is already banned from this tournament', 409);
    }

    if (!['registered', 'confirmed'].includes(participant.status)) {
        throw new ApiError(
            `Cannot ban a participant with status "${participant.status}"`,
            400
        );
    }

    // ── Atomic ban update — conditional on participant still being active ─────
    // Prevents race condition between multiple admin sessions.
    const updated = await Tournament.findOneAndUpdate(
        {
            _id: tournamentId,
            isDeleted: false,
            participants: {
                $elemMatch: {
                    userId: new mongoose.Types.ObjectId(targetUserId),
                    status: { $in: ['registered', 'confirmed'] },
                },
            },
        },
        {
            $set: {
                'participants.$[entry].status': 'banned',
                'participants.$[entry].bannedAt': now,
                'participants.$[entry].bannedBy': adminId,
                'participants.$[entry].banReason': reason.trim(),
            },
        },
        {
            arrayFilters: [{
                'entry.userId': new mongoose.Types.ObjectId(targetUserId),
                'entry.status': { $in: ['registered', 'confirmed'] },
            }],
            new: true,
        }
    );

    if (!updated) {
        // Another admin may have already banned this participant concurrently
        throw new ApiError('Ban failed — participant may have already been banned or removed', 409);
    }

    // ── Optional wallet refund ────────────────────────────────────────────────
    let refundProcessed = false;
    const entryFee = tournament.entryFee;

    if (refund && entryFee > 0) {
        try {
            await creditWallet(
                targetUserId,
                entryFee,
                `Refund: banned from "${tournament.title}"`,
                tournamentId,
                'Tournament',
                { tournamentTitle: tournament.title, reason: 'admin_ban_refund' }
            );

            // Mark refunded on the participant record
            await Tournament.updateOne(
                {
                    _id: tournamentId,
                    'participants.userId': new mongoose.Types.ObjectId(targetUserId),
                },
                { $set: { 'participants.$.refunded': true } }
            );

            refundProcessed = true;
        } catch (refundErr) {
            // Ban stands even if refund fails — log for manual resolution
            logger.error('Refund failed after ban — manual action required', {
                adminId: adminId.toString(),
                targetUserId,
                tournamentId,
                entryFee,
                error: refundErr.message,
            });
        }
    }

    // ── Audit log — no passwords, no sensitive data ────────────────────────
    logger.warn('Admin banned tournament participant', {
        adminId: adminId.toString(),
        adminEmail: req.user.email,
        tournamentId,
        tournamentTitle: tournament.title,
        targetUserId,
        reason: reason.trim(),
        refundRequested: refund,
        refundProcessed,
        entryFee,
        requestId: req.id,
    });

    res.status(200).json({
        success: true,
        message: `User banned from "${tournament.title}" successfully.`,
        refundProcessed,
        refundAmount: refundProcessed ? entryFee : 0,
    });
});

// @desc    Distribute winnings for a completed tournament
// @route   POST /api/admin/tournaments/:id/distribute-winnings
// @access  Private/Admin
const distributeWinningsHandler = asyncHandler(async (req, res) => {
    const { id: tournamentId } = req.params;
    // manualPrizes: { [userId]: amountRupees } — sent from admin UI when manually entering prizes
    const { manualPrizes = null } = req.body;

    if (!mongoose.Types.ObjectId.isValid(tournamentId)) {
        throw new ApiError('Invalid tournament ID', 400);
    }

    const result = await distributeWinnings(tournamentId, req.user._id, manualPrizes);

    logger.warn('Admin triggered winnings distribution', {
        adminId: req.user.id,
        adminEmail: req.user.email,
        tournamentId,
        totalDistributed: result.totalDistributed,
        winnerCount: result.winners.length,
        errorCount: result.errors.length,
        requestId: req.id,
    });

    res.status(200).json({
        success: true,
        message: `Winnings distributed for "${result.tournamentTitle}".`,
        ...result,
    });
});


// @desc    Get all withdrawal requests (admin)
// @route   GET /api/admin/withdrawals
// @access  Private/Admin
// @query   status (pending|approved|rejected), page, limit, userId
const getWithdrawalRequests = asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20, userId } = req.query;

    if (status && !['pending', 'approved', 'rejected'].includes(status)) {
        throw new ApiError('status must be one of: pending, approved, rejected', 400);
    }
    if (parseInt(limit) > 100) {
        throw new ApiError('limit cannot exceed 100', 400);
    }

    const result = await getAdminWithdrawals({ status, page, limit, userId });

    res.status(200).json({
        success: true,
        ...result,
    });
});

// @desc    Approve a withdrawal request
// @route   PATCH /api/admin/withdrawals/:id/approve
// @access  Private/Admin
const approveWithdrawalHandler = asyncHandler(async (req, res) => {
    const { id: requestId } = req.params;
    const { adminNote } = req.body;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
        throw new ApiError('Invalid withdrawal request ID', 400);
    }

    const { request } = await approveWithdrawalSvc(requestId, req.user._id, adminNote);

    logger.warn('Admin approved withdrawal request', {
        adminId: req.user.id,
        adminEmail: req.user.email,
        requestId,
        userId: request.userId.toString(),
        amount: request.amount,
        requestId: req.id,
    });

    res.status(200).json({
        success: true,
        message: `Withdrawal of ₹${request.amount} approved successfully.`,
        request: {
            _id: request._id,
            status: request.status,
            amount: request.amount,
            processedAt: request.processedAt,
        },
    });
});

// @desc    Reject a withdrawal request and refund the hold
// @route   PATCH /api/admin/withdrawals/:id/reject
// @access  Private/Admin
const rejectWithdrawalHandler = asyncHandler(async (req, res) => {
    const { id: requestId } = req.params;
    const { adminNote } = req.body;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
        throw new ApiError('Invalid withdrawal request ID', 400);
    }

    const { request } = await rejectWithdrawalSvc(requestId, req.user._id, adminNote);

    logger.warn('Admin rejected withdrawal request', {
        adminId: req.user.id,
        adminEmail: req.user.email,
        requestId,
        userId: request.userId.toString(),
        amount: request.amount,
        reason: adminNote,
        requestId: req.id,
    });

    res.status(200).json({
        success: true,
        message: `Withdrawal request rejected. ₹${request.amount} restored to user's wallet.`,
        request: {
            _id: request._id,
            status: request.status,
            amount: request.amount,
            processedAt: request.processedAt,
        },
    });
});


// @desc    Get pending settlement tournaments (ended, not yet distributed)
// @route   GET /api/admin/settlements/pending
// @access  Private/Admin
const getPendingSettlementsHandler = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const result = await getPendingSettlements(parseInt(page), parseInt(limit));
    res.status(200).json({ success: true, ...result });
});

// @desc    Set a participant's rank in a tournament (required before distributing winnings)
// @route   PATCH /api/admin/tournaments/:id/participants/:userId/rank
// @access  Private/Admin
const setParticipantRank = asyncHandler(async (req, res) => {
    const { id: tournamentId, userId } = req.params;
    const { rank } = req.body;

    if (!rank || typeof rank !== 'number' || rank < 1 || !Number.isInteger(rank)) {
        throw new ApiError('rank must be a positive integer', 400);
    }

    const updated = await Tournament.findOneAndUpdate(
        {
            _id: tournamentId,
            isDeleted: false,
            winningsDistributed: false,              // cannot re-rank after distribution
            'participants.userId': mongoose.Types.ObjectId.createFromHexString(userId),
        },
        {
            $set: {
                'participants.$.rank': rank,
                'participants.$.status': 'confirmed', // ensure confirmed status
            },
        },
        { new: true }
    );

    if (!updated) {
        const t = await Tournament.findById(tournamentId).select('winningsDistributed isDeleted').lean();
        if (!t || t.isDeleted) throw new ApiError('Tournament not found', 404);
        if (t.winningsDistributed) throw new ApiError('Cannot change ranks after winnings have been distributed', 409);
        throw new ApiError('Participant not found in this tournament', 404);
    }

    const participant = updated.participants.find(p => p.userId.toString() === userId);

    logger.info(`Admin ${req.user.email} set rank ${rank} for user ${userId} in tournament ${tournamentId}`);
    res.status(200).json({
        success: true,
        message: `Rank ${rank} set for participant`,
        participant: {
            userId: participant.userId,
            rank: participant.rank,
            status: participant.status,
        },
    });
});


// @desc    Get settlement alert summary for admin dashboard banner
// @route   GET /api/admin/alerts/settlements
// @access  Private/Admin
// NOTE: Designed to be polled every 30-60s. Lean query, no populate.
const getSettlementAlertsHandler = asyncHandler(async (req, res) => {
    const { total, alerts } = await getPendingSettlementAlerts();
    res.status(200).json({
        success: true,
        totalPendingSettlements: total,
        tournaments: alerts,
    });
});

// @desc    Get settlement history (all distributed tournaments)
// @route   GET /api/admin/settlements/history
// @access  Private/Admin
const getSettlementHistoryHandler = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    if (parseInt(limit) > 100) throw new ApiError('limit cannot exceed 100', 400);
    const result = await getSettlementHistory(parseInt(page), parseInt(limit));
    res.status(200).json({ success: true, ...result });
});

// @desc    Get full detail of a single past settlement
// @route   GET /api/admin/settlements/history/:id
// @access  Private/Admin
const getSettlementHistoryByIdHandler = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError('Invalid tournament ID', 400);
    const data = await getSettlementHistoryById(id);
    res.status(200).json({ success: true, ...data });
});

module.exports = {
    getAnalytics,
    getUserMetrics,
    getTournamentMetrics,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    getAllTournaments,
    createTournament,
    updateTournament,
    deleteTournament,
    setRoomCredentials,
    getTournamentParticipants,
    getRegistrationDetail,
    banTournamentParticipant,
    distributeWinnings: distributeWinningsHandler,
    getPendingSettlements: getPendingSettlementsHandler,
    getSettlementAlerts: getSettlementAlertsHandler,
    getSettlementHistory: getSettlementHistoryHandler,
    getSettlementHistoryById: getSettlementHistoryByIdHandler,
    setParticipantRank,
    getWithdrawalRequests,
    approveWithdrawal: approveWithdrawalHandler,
    rejectWithdrawal: rejectWithdrawalHandler,
};
