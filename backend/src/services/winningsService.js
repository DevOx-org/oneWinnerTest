'use strict';

/**
 * winningsService — distributes tournament prize money to winners.
 *
 * SAFETY GUARANTEES:
 * 1. First-layer guard: Tournament.winningsDistributed flag set atomically
 *    (findOneAndUpdate with condition: winningsDistributed:false) BEFORE any
 *    wallet credit fires. If already true → 409, no money moves.
 * 2. Second-layer guard: each WalletTransaction uses idempotencyKey =
 *    "win:<tournamentId>:<userId>". DB-unique sparse index blocks double-credit.
 * 3. Prize goes to winningBalance (NOT depositBalance) — Phase 3 rule.
 * 4. Only participants with explicit rank field are paid.
 * 5. prizeDistribution percentages validated to sum ≤ 100 before any movement.
 */

const mongoose = require('mongoose');
const Tournament = require('../models/Tournament');
const User = require('../models/User');
const { creditWinningBalance } = require('./walletService');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

const RANK_LABELS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];

/**
 * Distribute prize pool winnings for a completed tournament.
 * Credits prize money to each winner's winningBalance (withdraw-only).
 *
 * @param {string|ObjectId} tournamentId
 * @param {string|ObjectId} adminId
 * @returns {Promise<{tournamentId, tournamentTitle, prizePool, totalDistributed, winners, errors}>}
 */
async function distributeWinnings(tournamentId, adminId, manualPrizes = null) {
    const now = new Date();

    // ── Step 0: Auto-transition ────────────────────────────────────────────────
    // If this tournament has ended but is still 'live'/'upcoming', mark it completed.
    // This is safe and idempotent. The settlement list query calls updateMany too,
    // but we also do it here so distribute-winnings works even if called directly.
    await Tournament.updateOne(
        { _id: tournamentId, isDeleted: false, endDate: { $lt: now }, status: { $in: ['upcoming', 'live'] } },
        { $set: { status: 'completed' } }
    );

    // ── Step 1: Atomic claim of distribution lock ──────────────────────────────
    // Condition: status must be 'completed' (guaranteed after Step 0 for expired tournaments)
    // AND winningsDistributed must be false.
    // A concurrent second call will find winningsDistributed=true → returns null → 409.
    const claimed = await Tournament.findOneAndUpdate(
        {
            _id: tournamentId,
            isDeleted: false,
            status: 'completed',
            winningsDistributed: false,
        },
        {
            $set: {
                winningsDistributed: true,
                distributedAt: now,
                distributedBy: adminId,
            },
        },
        { new: true }
    );

    if (!claimed) {
        const existing = await Tournament.findOne({ _id: tournamentId, isDeleted: false })
            .select('status winningsDistributed title endDate')
            .lean();

        if (!existing) throw new ApiError('Tournament not found', 404);
        if (existing.winningsDistributed) {
            throw new ApiError(
                `Winnings for "${existing.title}" have already been distributed. This operation cannot be repeated.`,
                409
            );
        }
        if (new Date(existing.endDate) > now) {
            throw new ApiError(
                'This tournament has not ended yet. Winnings can only be distributed after the tournament finishes.',
                400
            );
        }
        throw new ApiError('Failed to acquire distribution lock — please retry', 500);
    }
    const tournament = claimed;

    // ── Step 2: Resolve eligible participants ──────────────────────────────────
    // BR Solo (perKillAmount > 0): participants win via calculatedAmount (kills + rank)
    // Other modes: participants must have a rank for percentage-based distribution
    const isBRSolo = Boolean(tournament.perKillAmount && tournament.perKillAmount > 0);

    const eligibleParticipants = tournament.participants
        .filter(p => {
            if (p.status !== 'registered' && p.status !== 'confirmed') return false;
            if (isBRSolo) {
                // BR Solo: eligible if calculatedAmount > 0 OR has a rank
                return (p.calculatedAmount > 0) || (typeof p.rank === 'number' && p.rank >= 1);
            }
            // Other modes: must have a rank
            return typeof p.rank === 'number' && p.rank >= 1;
        })
        .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

    if (eligibleParticipants.length === 0) {
        throw new ApiError(
            isBRSolo
                ? 'No participants have settlements saved. Save kill/rank data for participants first.'
                : 'No ranked participants found. Set participant ranks before distributing winnings.',
            400
        );
    }

    const prizePool = tournament.prizePool;
    if (!isBRSolo && prizePool <= 0) {
        throw new ApiError('Tournament prize pool is 0 — nothing to distribute', 400);
    }

    // ── Step 3: Determine prize amount per participant ────────────────────────
    // BR Solo: use pre-saved calculatedAmount (kills*perKill + rankAmount)
    // Other modes: manualPrizes or percentage-based from prizeDistribution
    const prizeDistribution = tournament.prizeDistribution;
    const distMap = prizeDistribution
        ? (prizeDistribution instanceof Map
            ? Object.fromEntries(prizeDistribution)
            : (typeof prizeDistribution === 'object' && Object.keys(prizeDistribution).length > 0
                ? prizeDistribution
                : {}))
        : {};

    function resolveAmount(participant) {
        const userId = participant.userId.toString();

        // BR Solo mode: use calculatedAmount
        if (isBRSolo) {
            const amount = participant.calculatedAmount || 0;
            if (amount > 0) return { amount: Math.floor(amount), source: 'calculated' };
            return { amount: 0, source: 'none' };
        }

        // Manual override takes priority (other modes)
        if (manualPrizes && manualPrizes[userId] != null) {
            const amount = Math.floor(Number(manualPrizes[userId]));
            if (amount > 0) return { amount, source: 'manual' };
        }
        // Fallback: percentage from prizeDistribution
        const rankLabel = RANK_LABELS[participant.rank - 1];
        if (rankLabel && distMap[rankLabel] > 0) {
            const amount = Math.floor(prizePool * distMap[rankLabel] / 100);
            return { amount, source: 'percentage', rankLabel };
        }
        return { amount: 0, source: 'none' };
    }

    // ── Step 4: Credit each winner's winningBalance ───────────────────────────
    const winners = [];
    let totalDistributed = 0;
    const creditErrors = [];

    for (const participant of eligibleParticipants) {
        const { amount: prizeAmount, source, rankLabel: rl } = resolveAmount(participant);
        if (prizeAmount <= 0) continue;

        const rankLabel = rl || RANK_LABELS[participant.rank - 1] || `Rank ${participant.rank}`;
        const userId = participant.userId.toString();
        // Idempotency key: DB-unique per tournament+user → prevents double-credit on retry
        const idempotencyKey = `win:${tournamentId}:${userId}`;

        try {
            const { balance, winningBalance } = await creditWinningBalance(
                userId,
                prizeAmount,
                `Prize: ${rankLabel} place in "${tournament.title}"`,
                tournamentId,
                {
                    rank: participant.rank,
                    rankLabel,
                    prizePool,
                    prizeSource: source,
                    adminId: adminId.toString(),
                    tournamentTitle: tournament.title,
                },
                null,           // no Mongoose session (standalone-safe; idempotency key is guard)
                idempotencyKey
            );

            // Stamp per-participant winningAmount for the admin to see
            await Tournament.updateOne(
                { _id: tournamentId, 'participants.userId': participant.userId },
                {
                    $set: {
                        'participants.$.winningAmount': prizeAmount,
                        'participants.$.winsDistributedAt': now,
                    },
                }
            );

            winners.push({ userId, rank: participant.rank, rankLabel, prizeAmount, newBalance: balance, newWinningBalance: winningBalance });
            totalDistributed += prizeAmount;

            // ── Increment lifetime win count ─────────────────────────────────
            // Safe: executes only after creditWinningBalance succeeds, which
            // itself is blocked by idempotencyKey on retry.  The outer
            // winningsDistributed flag prevents the entire loop from re-running.
            try {
                await User.findByIdAndUpdate(userId, { $inc: { winCount: 1 } });
            } catch (wcErr) {
                // Non-fatal: wallet credit already succeeded — log for reconciliation
                logger.error('winCount increment failed — manual reconciliation needed', {
                    tournamentId: tournamentId.toString(), userId, error: wcErr.message,
                });
            }

            logger.info('Winner credited to winningBalance', {
                tournamentId: tournamentId.toString(), userId,
                rank: participant.rank, prizeAmount, prizeSource: source, adminId: adminId.toString(),
            });
        } catch (err) {
            creditErrors.push({ userId, rank: participant.rank, error: err.message });
            logger.error('Winner credit to winningBalance FAILED — manual reconciliation required', {
                tournamentId: tournamentId.toString(), userId,
                rank: participant.rank, prizeAmount, idempotencyKey, error: err.message,
            });
        }
    }

    // ── Step 5: Audit summary ─────────────────────────────────────────────────
    logger.warn('Winnings distribution completed', {
        adminId: adminId.toString(), tournamentId: tournamentId.toString(),
        tournamentTitle: tournament.title, totalDistributed,
        winnerCount: winners.length, errorCount: creditErrors.length, prizePool,
    });

    return {
        tournamentId: tournament._id,
        tournamentTitle: tournament.title,
        prizePool,
        totalDistributed,
        winners,
        errors: creditErrors,
    };
}

/**
 * Get tournaments that have ended but have not had winnings distributed yet.
 * Used by the admin "Pending Settlements" panel.
 *
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<{settlements, total, pagination}>}
 */
async function getPendingSettlements(page = 1, limit = 20) {
    const now = new Date();
    const skip = (page - 1) * limit;

    // Auto-transition: mark any tournament that has passed its endDate but is still
    // 'upcoming' or 'live' as 'completed'. Safe, idempotent, and atomic.
    await Tournament.updateMany(
        { isDeleted: false, endDate: { $lt: now }, status: { $in: ['upcoming', 'live'] } },
        { $set: { status: 'completed' } }
    );

    const query = {
        isDeleted: false,
        winningsDistributed: false,
        endDate: { $lt: now },           // tournament has ended
        status: 'completed',             // all expired ones are now 'completed' after auto-transition
        prizePool: { $gt: 0 },           // only tournaments with actual prize money
    };

    const [settlements, total] = await Promise.all([
        Tournament.find(query)
            .select('title game startDate endDate prizePool prizeDistribution status participants winningsDistributed distributedAt matchType')
            .sort({ endDate: 1 })         // oldest pending first
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Tournament.countDocuments(query),
    ]);

    // Enrich with participant statistics for the admin dashboard
    const enriched = settlements.map(t => {
        const activeParticipants = t.participants.filter(
            p => p.status === 'registered' || p.status === 'confirmed'
        );
        const rankedCount = activeParticipants.filter(
            p => typeof p.rank === 'number' && p.rank >= 1
        ).length;

        return {
            _id: t._id,
            title: t.title,
            game: t.game,
            startDate: t.startDate,
            endDate: t.endDate,
            prizePool: t.prizePool,
            status: t.status,
            prizeDistribution: (() => {
                const pd = t.prizeDistribution;
                if (!pd) return {};
                // After .lean(), Mongoose Map fields become plain objects, not Maps.
                // Object.fromEntries() needs an iterable - guard against plain objects.
                if (pd instanceof Map) return Object.fromEntries(pd);
                if (typeof pd === 'object') return pd;
                return {};
            })(),
            participantCount: activeParticipants.length,
            rankedCount,
            readyToDistribute: rankedCount > 0,
            winningsDistributed: t.winningsDistributed,
            matchType: t.matchType || null,
        };
    });

    return {
        settlements: enriched,
        total,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    };
}


/**
 * getPendingSettlementAlerts — lightweight alert query for the admin banner.
 *
 * Returns tournaments that have finished (endDate < now) but have not had
 * winnings distributed yet, along with ranked participant counts.
 *
 * Designed to be called frequently (every 30–60s) so it:
 *  - Uses a lean query (no populate)
 *  - Only fetches the fields needed for the alert banner
 *  - Uses existing compound indexes (winningsDistributed:1 + endDate)
 *
 * @returns {Promise<{ total: number, alerts: Array }>}
 */
async function getPendingSettlementAlerts() {
    const now = new Date();

    // Auto-transition: mark any tournament that has passed its endDate but is still
    // 'upcoming' or 'live' as 'completed'. Same guard used in getPendingSettlements.
    await Tournament.updateMany(
        { isDeleted: false, endDate: { $lt: now }, status: { $in: ['upcoming', 'live'] } },
        { $set: { status: 'completed' } }
    );

    const query = {
        isDeleted: false,
        winningsDistributed: false,
        endDate: { $lt: now },
        status: 'completed',  // all expired ones are 'completed' after auto-transition
        prizePool: { $gt: 0 },
    };

    // Fetch only required fields — participants is needed for rank count
    const tournaments = await Tournament.find(query)
        .select('title endDate prizePool participants')
        .sort({ endDate: 1 })   // oldest unsettled first
        .limit(50)              // cap at 50 to keep response lightweight
        .lean();

    const alerts = tournaments.map(t => {
        const active = (t.participants ?? []).filter(
            p => p.status === 'registered' || p.status === 'confirmed'
        );
        const rankedCount = active.filter(
            p => typeof p.rank === 'number' && p.rank >= 1
        ).length;

        const nowMs = now.getTime();
        const endMs = new Date(t.endDate).getTime();
        const diffMs = nowMs - endMs;
        const diffMinutes = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        let timeSinceFinish;
        if (diffDays >= 1) timeSinceFinish = `${diffDays}d ago`;
        else if (diffHours >= 1) timeSinceFinish = `${diffHours}h ago`;
        else if (diffMinutes >= 1) timeSinceFinish = `${diffMinutes}m ago`;
        else timeSinceFinish = 'just now';

        return {
            tournamentId: t._id,
            name: t.title,
            endDate: t.endDate,
            prizePool: t.prizePool,
            participantCount: active.length,
            rankedCount,
            readyToDistribute: rankedCount > 0,
            timeSinceFinish,
        };
    });

    return { total: alerts.length, alerts };
}


/**
 * getSettlementHistory — paginated list of all tournaments where winnings have been distributed.
 * Provides admin full audit trail of past payouts.
 *
 * @param {number} page
 * @param {number} limit
 * @returns {Promise<{history, total, pagination}>}
 */
async function getSettlementHistory(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const query = {
        isDeleted: false,
        winningsDistributed: true,
        status: 'completed',
    };

    const [tournaments, total] = await Promise.all([
        Tournament.find(query)
            .select('title game startDate endDate prizePool prizeDistribution status participants winningsDistributed distributedAt distributedBy')
            .populate('distributedBy', 'name email')
            .sort({ distributedAt: -1 })   // most recently settled first
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        Tournament.countDocuments(query),
    ]);

    const history = tournaments.map(t => {
        const activeParticipants = (t.participants || []).filter(
            p => p.status === 'registered' || p.status === 'confirmed'
        );
        // Winners: participants who received prize money
        const winners = activeParticipants
            .filter(p => typeof p.rank === 'number' && p.rank >= 1 && p.winningAmount > 0)
            .sort((a, b) => a.rank - b.rank)
            .map(p => ({
                userId: p.userId,
                rank: p.rank,
                rankLabel: ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'][p.rank - 1] || `${p.rank}th`,
                winningAmount: p.winningAmount,
                teamLeaderName: p.teamLeaderName || null,
            }));

        const totalDistributed = winners.reduce((sum, w) => sum + (w.winningAmount || 0), 0);

        return {
            _id: t._id,
            title: t.title,
            game: t.game,
            startDate: t.startDate,
            endDate: t.endDate,
            prizePool: t.prizePool,
            prizeDistribution: (() => {
                const pd = t.prizeDistribution;
                if (!pd) return {};
                if (pd instanceof Map) return Object.fromEntries(pd);
                if (typeof pd === 'object') return pd;
                return {};
            })(),
            participantCount: activeParticipants.length,
            winnerCount: winners.length,
            totalDistributed,
            winners,
            distributedAt: t.distributedAt,
            distributedBy: t.distributedBy
                ? { name: t.distributedBy.name, email: t.distributedBy.email }
                : null,
        };
    });

    return {
        history,
        total,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    };
}

/**
 * getSettlementHistoryById — full detail for a single distributed settlement.
 * Includes complete winner + participant list with all registration fields.
 *
 * @param {string|ObjectId} tournamentId
 * @returns {Promise<object>}
 */
async function getSettlementHistoryById(tournamentId) {
    const t = await Tournament.findOne({ _id: tournamentId, isDeleted: false, winningsDistributed: true })
        .select('title game startDate endDate prizePool prizeDistribution status participants winningsDistributed distributedAt distributedBy')
        .populate('distributedBy', 'name email')
        .lean();

    if (!t) throw new ApiError('Settlement record not found', 404);

    const activeParticipants = (t.participants || []).filter(
        p => p.status === 'registered' || p.status === 'confirmed'
    );

    const enrichedParticipants = activeParticipants.map(p => ({
        userId: p.userId,
        status: p.status,
        rank: p.rank || null,
        rankLabel: p.rank ? (['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'][p.rank - 1] || `${p.rank}th`) : null,
        winningAmount: p.winningAmount || 0,
        winsDistributedAt: p.winsDistributedAt || null,
        registeredAt: p.registeredAt,
        teamLeaderName: p.teamLeaderName || null,
        leaderGameName: p.leaderGameName || null,
        teamMember2: p.teamMember2 || null,
        teamMember3: p.teamMember3 || null,
        teamMember4: p.teamMember4 || null,
        assignedSlot: p.assignedSlot || null,
        totalKills: p.totalKills || 0,
    }));

    const totalDistributed = enrichedParticipants.reduce((sum, p) => sum + p.winningAmount, 0);

    return {
        _id: t._id,
        title: t.title,
        game: t.game,
        startDate: t.startDate,
        endDate: t.endDate,
        prizePool: t.prizePool,
        prizeDistribution: (() => {
            const pd = t.prizeDistribution;
            if (!pd) return {};
            if (pd instanceof Map) return Object.fromEntries(pd);
            if (typeof pd === 'object') return pd;
            return {};
        })(),
        participantCount: activeParticipants.length,
        totalDistributed,
        participants: enrichedParticipants,
        distributedAt: t.distributedAt,
        distributedBy: t.distributedBy
            ? { name: t.distributedBy.name, email: t.distributedBy.email }
            : null,
    };
}

module.exports = { distributeWinnings, getPendingSettlements, getPendingSettlementAlerts, getSettlementHistory, getSettlementHistoryById };

