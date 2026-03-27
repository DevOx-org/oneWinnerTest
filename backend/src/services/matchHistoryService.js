'use strict';

const mongoose = require('mongoose');
const Tournament = require('../models/Tournament');
const logger = require('../config/logger');

/**
 * matchHistoryService
 *
 * Fetches all tournaments a user has participated in (lifetime history).
 *
 * Query strategy:
 *  - Single Tournament.find() with { 'participants.userId': userId } — uses the
 *    existing multikey index on { 'participants.userId': 1, 'participants.status': 1 }.
 *  - Tight projection: only the fields the frontend needs + the user's own participant entry.
 *  - Sort: startDate DESC (newest first).
 *  - Pagination: page + limit.
 *
 * userStatus derivation:
 *  upcoming  → status = 'upcoming'
 *  live      → status = 'live'
 *  won       → completed + winningAmount > 0
 *  lost      → completed + rank set + winningAmount = 0
 *  pending   → completed (or past endDate) but rank not yet set
 */

/**
 * @param {string|ObjectId} userId
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<{ matches: Array, pagination: object }>}
 */
async function getUserMatchHistory(userId, page = 1, limit = 20) {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const parsedPage = Math.max(1, parseInt(page) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (parsedPage - 1) * parsedLimit;

    // Only show non-deleted tournaments where this user has an active participant entry
    const filter = {
        isDeleted: false,
        participants: {
            $elemMatch: {
                userId: userObjectId,
                status: { $in: ['registered', 'confirmed'] },
            },
        },
    };

    const [tournaments, total] = await Promise.all([
        Tournament.find(filter)
            .sort({ startDate: -1 })
            .skip(skip)
            .limit(parsedLimit)
            .select(
                'title game platform startDate endDate entryFee prizePool maxParticipants status participants'
            )
            .lean(),
        Tournament.countDocuments(filter),
    ]);

    const now = new Date();

    const matches = tournaments.map((t) => {
        // Pick out the user's own participant entry
        const myEntry = t.participants.find(
            (p) => p.userId.toString() === userId.toString()
        );

        const rank = myEntry?.rank ?? null;
        const prizeWon = myEntry?.winningAmount ?? 0;
        const isWinner = prizeWon > 0;
        const registeredAt = myEntry?.registeredAt ?? null;

        // Compute a human-readable userStatus
        let userStatus;
        if (t.status === 'upcoming') {
            userStatus = 'upcoming';
        } else if (t.status === 'live') {
            userStatus = 'live';
        } else if (t.status === 'completed' || new Date(t.endDate) <= now) {
            if (isWinner) {
                userStatus = 'won';
            } else if (rank !== null) {
                userStatus = 'lost';
            } else {
                userStatus = 'pending'; // completed but settlement not done yet
            }
        } else {
            userStatus = 'upcoming';
        }

        return {
            tournamentId: t._id,
            title: t.title,
            game: t.game,
            platform: t.platform,
            startDate: t.startDate,
            endDate: t.endDate,
            entryFee: t.entryFee,
            prizePool: t.prizePool,
            maxParticipants: t.maxParticipants,
            status: t.status,
            userStatus,
            prizeWon,
            rank,
            isWinner,
            registeredAt,
        };
    });

    logger.info('Match history fetched', {
        userId: userId.toString(),
        total,
        page: parsedPage,
        limit: parsedLimit,
    });

    return {
        matches,
        pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total,
            pages: Math.ceil(total / parsedLimit),
        },
    };
}

module.exports = { getUserMatchHistory };
