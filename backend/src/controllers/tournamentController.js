const Tournament = require('../models/Tournament');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { registerWithWallet } = require('../services/tournamentRegistrationService');
const { getRoomCredentialsCached, setRoomCredentialsCached } = require('../services/cacheService');
const logger = require('../config/logger');

/**
 * @desc    Get all public tournaments with server-computed per-user flags.
 *
 * Hardening contract:
 *  - isRegistered: true only when participant exists with status 'registered'|'confirmed'
 *  - spotsLeft:    maxParticipants - activeParticipantCount  (never negative)
 *  - canJoin:      server-computed; false when full, closed, deadline passed, or already registered
 *  - No per-tournament DB queries (N+1 free)
 *  - Participants projected to {userId, status} only — no bloat
 *  - .lean() for plain JS objects (faster serialization, no Mongoose overhead)
 *
 * @route   GET /api/tournaments
 * @access  Public (optionalAuth enriches response for logged-in users)
 */
exports.getPublicTournaments = asyncHandler(async (req, res) => {
    const { status, game, page = 1, limit = 20 } = req.query;
    const now = new Date();

    // ── 1. Build filter ──────────────────────────────────────────────────────
    const isAdmin = req.user && req.user.role === 'admin';
    const filter = {
        isDeleted: false,
        // Test tournaments: visible to admins, hidden from regular/unauthenticated users
        ...(!isAdmin ? { isTestMode: { $ne: true } } : {}),
        status: { $in: ['upcoming', 'live'] },
    };

    if (status && ['upcoming', 'live'].includes(status)) {
        filter.status = status;
    }
    if (game) {
        filter.game = game;
    }

    const parsedPage = Math.max(1, parseInt(page) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20)); // cap at 100
    const skip = (parsedPage - 1) * parsedLimit;

    // ── 2. Fetch list + count concurrently (no sequential waterfall) ──────────
    // Participants projection: only userId + status — skip rank/score/payment/timestamps
    const [tournaments, total] = await Promise.all([
        Tournament.find(filter)
            .sort({ startDate: 1 })
            .skip(skip)
            .limit(parsedLimit)
            .select('-isDeleted -__v -roomId -roomPassword -rules -prizeDistribution -updatedBy')
            .select({ 'participants.userId': 1, 'participants.status': 1 }) // tight projection
            .lean(),
        Tournament.countDocuments(filter),
    ]);

    // ── 3. Guard: nothing to process ─────────────────────────────────────────
    if (!Array.isArray(tournaments) || tournaments.length === 0) {
        return res.status(200).json({
            success: true,
            data: [],
            pagination: {
                page: parsedPage,
                limit: parsedLimit,
                total: total || 0,
                pages: 0,
            },
        });
    }

    // ── 4. Single aggregation query for registration status ──────────────────
    // Security: req.user._id comes from a verified JWT (optionalAuth) — never from client input.
    let registeredSet = new Set(); // IDs of tournaments the user is actively registered in

    if (req.user) {
        const userId = req.user._id;
        const tournamentIds = tournaments.map((t) => t._id);

        // One query — find tournaments where this user has an active (non-cancelled) registration.
        // $elemMatch with status $in is index-friendly on the embedded array.
        const registeredDocs = await Tournament.find({
            _id: { $in: tournamentIds },
            isDeleted: false,
            participants: {
                $elemMatch: {
                    userId,
                    status: { $in: ['registered', 'confirmed'] }, // explicit: NOT 'cancelled'
                },
            },
        }).select('_id').lean();

        registeredSet = new Set(registeredDocs.map((t) => t._id.toString()));
    }

    // ── 5. Compute derived fields for each tournament ─────────────────────────
    const userId = req.user ? req.user._id.toString() : null;

    const enriched = tournaments.map((t) => {
        // Null-safe participants array
        const participants = Array.isArray(t.participants) ? t.participants : [];

        // Active count: only 'registered' or 'confirmed' entries count toward the cap
        const activeCount = participants.reduce((count, p) => {
            const s = p?.status;
            return (s === 'registered' || s === 'confirmed') ? count + 1 : count;
        }, 0);

        const maxPlayers = typeof t.maxParticipants === 'number' ? t.maxParticipants : 0;
        const spotsLeft = Math.max(0, maxPlayers - activeCount);

        // isRegistered: true only if user has an active entry in THIS tournament
        const isRegistered = userId ? registeredSet.has(t._id.toString()) : false;

        // ── Server-computed 4-state match status (UTC-safe) ──────────────────
        const startTime = t.startDate ? new Date(t.startDate) : null;
        const endTime = t.endDate ? new Date(t.endDate) : null;
        // Registration closes 1 hour before start
        const regCloseTime = startTime ? new Date(startTime.getTime() - 60 * 60 * 1000) : null;

        let tournamentState = 'OPEN';
        if (endTime && now >= endTime) {
            tournamentState = 'COMPLETED';
        } else if (startTime && now >= startTime) {
            tournamentState = 'LIVE';
        } else if (regCloseTime && now >= regCloseTime) {
            tournamentState = 'REGISTRATION_CLOSED';
        }

        // ── Registration open: true only when OPEN state ─────────────────────
        const registrationOpen = tournamentState === 'OPEN';

        // canJoin: every condition must pass — server is the sole authority
        const hasSpots = spotsLeft > 0;
        const canJoin = (
            registrationOpen &&
            hasSpots &&
            !isRegistered
        );

        // Strip internal participants array from response — replaced by computed fields
        const { participants: _p, ...rest } = t;

        return {
            ...rest,
            currentPlayers: activeCount,   // accurate active count
            spotsLeft,                     // server-computed, never trust frontend
            isRegistered,                  // server-computed, always boolean
            canJoin,                       // server-computed, always boolean
            tournamentState,               // 'UPCOMING' | 'LIVE' | 'COMPLETED'
            registrationOpen,              // true only when UPCOMING + deadline open
        };
    });

    // ── 6. Respond ────────────────────────────────────────────────────────────
    res.status(200).json({
        success: true,
        data: enriched,
        pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total,
            pages: Math.ceil(total / parsedLimit),
        },
    });
});

/**
 * @desc    Get single tournament by ID
 * @route   GET /api/tournaments/:id
 * @access  Public
 */
exports.getTournamentById = asyncHandler(async (req, res) => {
    const tournament = await Tournament.findOne({
        _id: req.params.id,
        isDeleted: false
    }).select('-isDeleted -__v');

    if (!tournament) {
        throw new ApiError('Tournament not found', 404);
    }

    res.status(200).json({
        success: true,
        data: tournament
    });
});

/**
 * @desc    Register for a tournament using wallet balance
 * @route   POST /api/tournaments/:id/register
 * @access  Private
 */
exports.registerForTournament = asyncHandler(async (req, res) => {
    const tournamentId = req.params.id;
    const userId = req.user.id;

    // Team registration data from request body (all optional, validated by schema)
    // NOTE: assignedSlot is NO LONGER accepted from the client — the backend
    // computes sequential slots atomically in the registration service.
    const teamData = {
        teamLeaderName: req.body.teamLeaderName || null,
        leaderGameName: req.body.leaderGameName || null,
        playerGameName: req.body.playerGameName || null,
        teamMember2: req.body.teamMember2 || null,
        teamMember3: req.body.teamMember3 || null,
        teamMember4: req.body.teamMember4 || null,
    };

    logger.info('Tournament registration attempt via wallet', {
        userId,
        tournamentId,
        requestId: req.id,
    });

    // All validation, wallet debit, and participant insert happen
    // atomically inside tournamentRegistrationService
    const result = await registerWithWallet(userId, tournamentId, teamData);

    logger.info('Tournament registration successful', {
        userId,
        tournamentId,
        walletBalanceAfter: result.walletBalance,
        requestId: req.id,
    });

    res.status(200).json({
        success: true,
        message: 'Successfully registered for tournament',
        registration: {
            tournament: result.tournament,
            transactionId: result.transactionId,
            assignedSlot: result.assignedSlot,
        },
        walletBalance: result.walletBalance,
        matchCount: result.matchCount,
    });
});

/**
 * @desc    Check if the authenticated user is registered in a tournament
 * @route   GET /api/tournaments/:id/my-status
 * @access  Private
 */
exports.getMyRegistrationStatus = asyncHandler(async (req, res) => {
    const tournamentId = req.params.id;
    const userId = req.user.id;

    const tournament = await Tournament.findOne({
        _id: tournamentId,
        isDeleted: false,
    }).select('participants');

    if (!tournament) {
        throw new ApiError('Tournament not found', 404);
    }

    // Check participants array server-side — never trust the client
    // Explicit allowlist: 'cancelled' and 'banned' both yield isRegistered=false
    const isRegistered = tournament.participants.some(
        (p) =>
            p.userId.toString() === userId.toString() &&
            (p.status === 'registered' || p.status === 'confirmed')
    );

    logger.info('Registration status check', {
        userId,
        tournamentId,
        isRegistered,
        requestId: req.id,
    });

    res.status(200).json({
        success: true,
        isRegistered,
    });
});

/**
 * @desc    Get room credentials for a registered user
 * @route   GET /api/tournaments/:id/room-details
 * @access  Private — registered participants only
 *
 * Security model:
 *  1. Caller must be authenticated (protect middleware)
 *  2. Caller must be a registered (non-cancelled) participant
 *  3. Server computes release window (startDate - 30 min) — client never decides this
 *  4. roomId/roomPassword are only fetched from DB when the window has opened
 */
exports.getRoomDetails = asyncHandler(async (req, res) => {
    const tournamentId = req.params.id;
    const userId = req.user.id;

    // 1. Verify caller is a registered participant (without fetching credentials)
    const tournamentCheck = await Tournament.findOne({
        _id: tournamentId,
        isDeleted: false,
    }).select('participants startDate');

    if (!tournamentCheck) {
        throw new ApiError('Tournament not found', 404);
    }

    // Active participant: registered or confirmed only — banned users denied access
    const myParticipant = tournamentCheck.participants.find(
        (p) =>
            p.userId.toString() === userId.toString() &&
            (p.status === 'registered' || p.status === 'confirmed')
    );

    if (!myParticipant) {
        throw new ApiError('Access denied. You are not registered in this tournament.', 403);
    }

    // Extract slot + match time for the response
    const assignedSlot = myParticipant.assignedSlot || null;
    const matchTime = tournamentCheck.startDate ? new Date(tournamentCheck.startDate).toISOString() : null;

    // 2. Compute release time: startDate - 30 minutes (all UTC, no client trust)
    const startDate = new Date(tournamentCheck.startDate);
    const releaseTime = new Date(startDate.getTime() - 30 * 60 * 1000);
    const now = new Date();

    logger.info('Room details requested', {
        userId,
        tournamentId,
        releaseTime: releaseTime.toISOString(),
        windowOpen: now >= releaseTime,
        requestId: req.id,
    });

    // 3. Window not yet open — return countdown anchor only
    if (now < releaseTime) {
        return res.status(200).json({
            success: true,
            roomVisible: false,
            releaseTime: releaseTime.toISOString(),
            assignedSlot,
            matchTime,
        });
    }

    // 4. Window open — try Redis cache first, then fallback to DB
    let roomId = null;
    let roomPassword = null;

    // Check cache (serves 100 concurrent users from 1 DB query)
    const cached = await getRoomCredentialsCached(tournamentId);
    if (cached) {
        roomId = cached.roomId;
        roomPassword = cached.roomPassword;
    } else {
        // Cache miss — fetch from DB and populate cache for subsequent requests
        const tournamentWithCreds = await Tournament.findById(tournamentId)
            .select('+roomId +roomPassword');

        if (tournamentWithCreds.roomId) {
            roomId = tournamentWithCreds.roomId;
            roomPassword = tournamentWithCreds.roomPassword;

            // Cache for next burst of requests
            await setRoomCredentialsCached(tournamentId, { roomId, roomPassword });
        }
    }

    // Safety net: admin has not set credentials yet
    if (!roomId) {
        logger.warn('Room details window open but credentials not set by admin', {
            tournamentId,
            requestId: req.id,
        });
        return res.status(200).json({
            success: true,
            roomVisible: false,
            releaseTime: releaseTime.toISOString(),
            assignedSlot,
            matchTime,
            message: 'Credentials not yet available. Please check back shortly.',
        });
    }

    return res.status(200).json({
        success: true,
        roomVisible: true,
        roomId,
        roomPassword,
        releaseTime: releaseTime.toISOString(),
        assignedSlot,
        matchTime,
    });
});
