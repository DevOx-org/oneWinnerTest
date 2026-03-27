const User = require('../models/User');
const Tournament = require('../models/Tournament');

/**
 * Helper: build a date filter for weekly / monthly periods.
 * Returns null for "all" (no date constraint).
 */
const getDateRange = (period) => {
    if (period === 'weekly') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d;
    }
    if (period === 'monthly') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d;
    }
    return null; // all-time
};

/**
 * GET /api/leaderboard/global?period=all&limit=50
 *
 * All-time  → straight User query sorted by winningBalance
 * Weekly/Monthly → aggregate WalletTransactions of type winning_credit
 */
const getGlobalLeaderboard = async (req, res) => {
    try {
        const period = req.query.period || 'all';
        const limit = Math.min(parseInt(req.query.limit) || 50, 50);

        // All periods use Tournament aggregation for consistent data
        // (winningBalance reflects current balance after withdrawals, not total earnings)
        const since = getDateRange(period);

        const pipeline = [
            // Only completed tournaments distributed after the date
            {
                $match: {
                    isDeleted: { $ne: true },
                    winningsDistributed: true,
                    ...(since ? { distributedAt: { $gte: since } } : {}),
                },
            },
            { $unwind: '$participants' },
            {
                $match: {
                    'participants.winningAmount': { $gt: 0 },
                    'participants.status': { $ne: 'cancelled' },
                },
            },
            {
                $group: {
                    _id: '$participants.userId',
                    earnings: { $sum: '$participants.winningAmount' },
                    wins: { $sum: 1 },
                },
            },
            { $sort: { earnings: -1 } },
            { $limit: limit },
            // Populate user info
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: '$user' },
            {
                $match: { 'user.isDeleted': { $ne: true } },
            },
            {
                $project: {
                    userId: '$_id',
                    name: '$user.name',
                    earnings: 1,
                    wins: 1,
                    matches: { $ifNull: ['$user.matchCount', 0] },
                },
            },
        ];

        const results = await Tournament.aggregate(pipeline);
        const data = results.map((r, i) => ({
            rank: i + 1,
            userId: r.userId,
            name: r.name,
            earnings: r.earnings,
            wins: r.wins,
            matches: r.matches,
        }));

        return res.status(200).json({ success: true, period, data });
    } catch (err) {
        console.error('Leaderboard global error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch leaderboard' });
    }
};

/**
 * GET /api/leaderboard/game/:game?period=all&limit=50
 *
 * game param: "PUBG Mobile" | "Call of Duty Mobile" | "Free Fire"
 */
const getGameLeaderboard = async (req, res) => {
    try {
        const { game } = req.params;
        const period = req.query.period || 'all';
        const limit = Math.min(parseInt(req.query.limit) || 50, 50);

        // Validate game name
        const validGames = ['PUBG Mobile', 'Free Fire', 'Call of Duty Mobile', 'Valorant'];
        if (!validGames.includes(game)) {
            return res.status(400).json({
                success: false,
                message: `Invalid game. Must be one of: ${validGames.join(', ')}`,
            });
        }

        const since = getDateRange(period);

        const pipeline = [
            {
                $match: {
                    game,
                    isDeleted: { $ne: true },
                    winningsDistributed: true,
                    ...(since ? { distributedAt: { $gte: since } } : {}),
                },
            },
            { $unwind: '$participants' },
            {
                $match: {
                    'participants.winningAmount': { $gt: 0 },
                    'participants.status': { $ne: 'cancelled' },
                },
            },
            {
                $group: {
                    _id: '$participants.userId',
                    earnings: { $sum: '$participants.winningAmount' },
                    wins: { $sum: 1 },
                },
            },
            { $sort: { earnings: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: '$user' },
            {
                $match: { 'user.isDeleted': { $ne: true } },
            },
            {
                $project: {
                    userId: '$_id',
                    name: '$user.name',
                    earnings: 1,
                    wins: 1,
                },
            },
        ];

        const results = await Tournament.aggregate(pipeline);
        const data = results.map((r, i) => ({
            rank: i + 1,
            userId: r.userId,
            name: r.name,
            earnings: r.earnings,
            wins: r.wins,
        }));

        return res.status(200).json({ success: true, game, period, data });
    } catch (err) {
        console.error('Leaderboard game error:', err);
        return res.status(500).json({ success: false, message: 'Failed to fetch leaderboard' });
    }
};

module.exports = { getGlobalLeaderboard, getGameLeaderboard };
