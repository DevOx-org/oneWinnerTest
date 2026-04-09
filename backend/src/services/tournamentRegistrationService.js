'use strict';

const mongoose = require('mongoose');
const Tournament = require('../models/Tournament');
const User = require('../models/User');
const { debitTournamentEntry } = require('./walletService');
const {
    DuplicateRegistrationError,
    TournamentFullError,
    RegistrationClosedError,
    InsufficientBalanceError,
} = require('../utils/errors');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

/**
 * tournamentRegistrationService
 *
 * Handles the complete tournament registration flow.
 *
 * Atomicity layers:
 *   1. Outer: mongoose session.withTransaction — rolls back wallet debit if participant
 *      insert fails (requires replica set; gracefully degrades on standalone).
 *   2. Inner: conditional findOneAndUpdate with $expr and $elemMatch guards — enforces
 *      slot cap and duplicate check AT THE MONGODB QUERY LAYER, preventing overfill
 *      even under concurrent requests *without* relying on the replica-set transaction.
 *
 * Validation checks (all server-side, never trust frontend canJoin):
 *   ✔ Tournament exists
 *   ✔ Status is 'upcoming'
 *   ✔ Registration deadline not passed
 *   ✔ User not already registered (status 'registered' or 'confirmed')
 *   ✔ Slots available (active count < maxParticipants)
 *   ✔ Entry fee is non-negative
 */

/**
 * Register a user for a tournament by debiting their wallet.
 *
 * @param {string|ObjectId} userId
 * @param {string|ObjectId} tournamentId
 * @returns {Promise<{tournament, walletBalance, transactionId, assignedSlot, matchCount}>}}
 */
async function registerWithWallet(userId, tournamentId, teamData = {}) {
    const session = await mongoose.startSession();

    try {
        let result;

        await session.withTransaction(async () => {
            // ── Step 1: Fetch & validate tournament inside the transaction ────────
            const tournament = await Tournament.findOne(
                { _id: tournamentId, isDeleted: false },
                null,
                { session }
            );

            if (!tournament) {
                logger.warn('Registration rejected: tournament not found', {
                    userId: userId.toString(),
                    tournamentId: tournamentId.toString(),
                });
                throw new RegistrationClosedError('Tournament', 'Tournament not found.');
            }

            // ── Step 2: Status check ─────────────────────────────────────────────
            if (tournament.status !== 'upcoming') {
                logger.warn('Registration rejected: tournament not upcoming', {
                    userId: userId.toString(),
                    tournamentId: tournamentId.toString(),
                    status: tournament.status,
                });
                throw new RegistrationClosedError(
                    tournament.title,
                    `Tournament status is "${tournament.status}".`
                );
            }

            // ── Step 3: Deadline check ───────────────────────────────────────────
            const now = new Date();
            if (now > tournament.registrationDeadline) {
                logger.warn('Registration rejected: deadline passed', {
                    userId: userId.toString(),
                    tournamentId: tournamentId.toString(),
                    deadline: tournament.registrationDeadline,
                });
                throw new RegistrationClosedError(
                    tournament.title,
                    'Registration deadline has passed.'
                );
            }

            // ── Step 3b: Time-based match status validation ──────────────────────
            // Registration closes 1 hour before startDate, regardless of deadline
            const startDate = new Date(tournament.startDate);
            const endDate = new Date(tournament.endDate);
            const regCloseTime = new Date(startDate.getTime() - 60 * 60 * 1000);

            if (now >= endDate) {
                logger.warn('Registration rejected: match completed', {
                    userId: userId.toString(),
                    tournamentId: tournamentId.toString(),
                });
                throw new RegistrationClosedError(
                    tournament.title,
                    'This match has already been completed.'
                );
            }

            if (now >= startDate) {
                logger.warn('Registration rejected: match is live', {
                    userId: userId.toString(),
                    tournamentId: tournamentId.toString(),
                });
                throw new RegistrationClosedError(
                    tournament.title,
                    'This match is currently live. Registration is not allowed.'
                );
            }

            if (now >= regCloseTime) {
                logger.warn('Registration rejected: registration closed (within 1 hour of start)', {
                    userId: userId.toString(),
                    tournamentId: tournamentId.toString(),
                    startDate: startDate.toISOString(),
                });
                throw new RegistrationClosedError(
                    tournament.title,
                    'Registration is closed. It closes 1 hour before the match starts.'
                );
            }

            // ── Step 4a: Banned user check ───────────────────────────────────────
            // A banned user has status='banned' — they would NOT match the active
            // duplicate check below (which uses $in:['registered','confirmed']).
            // Without this explicit check they could slip through and re-register.
            const isBanned = tournament.participants.some(
                (p) =>
                    p.userId.toString() === userId.toString() &&
                    p.status === 'banned'
            );
            if (isBanned) {
                logger.warn('Registration rejected: user is banned', {
                    userId: userId.toString(),
                    tournamentId: tournamentId.toString(),
                });
                throw new ApiError(
                    `You have been banned from "${tournament.title}" and cannot register.`,
                    403
                );
            }

            // ── Step 4b: Duplicate registration check ────────────────────────────
            // Explicit allowlist — 'cancelled' registrations do NOT block re-join
            const alreadyRegistered = tournament.participants.some(
                (p) =>
                    p.userId.toString() === userId.toString() &&
                    (p.status === 'registered' || p.status === 'confirmed')
            );
            if (alreadyRegistered) {
                logger.warn('Registration rejected: duplicate', {
                    userId: userId.toString(),
                    tournamentId: tournamentId.toString(),
                });
                throw new DuplicateRegistrationError(tournament.title);
            }

            // ── Step 5: Slot availability check ─────────────────────────────────
            // Count only active registrations — explicit allowlist, not $ne:cancelled
            const activeCount = tournament.participants.filter(
                (p) => p.status === 'registered' || p.status === 'confirmed'
            ).length;
            if (activeCount >= tournament.maxParticipants) {
                logger.warn('Registration rejected: tournament full', {
                    userId: userId.toString(),
                    tournamentId: tournamentId.toString(),
                    activeCount,
                    maxParticipants: tournament.maxParticipants,
                });
                throw new TournamentFullError(tournament.title);
            }

            // ── Step 6: Validate entry fee ───────────────────────────────────────
            const entryFeeRupees = tournament.entryFee;
            if (entryFeeRupees < 0) {
                throw new Error('Negative entry fee is not allowed');
            }

            // ── Step 7: Debit depositBalance only (Phase 2 rule) ─────────────────────────
            let walletResult = { balance: 0, transaction: null };

            if (entryFeeRupees > 0) {
                // Pre-flight check: clear error if funds are in winningBalance only
                const userSnap = await User.findById(userId)
                    .select('depositBalance winningBalance').session(session).lean();
                const depositBal = userSnap?.depositBalance ?? 0;
                const winningBal = userSnap?.winningBalance ?? 0;

                if (depositBal < entryFeeRupees) {
                    const reason = winningBal >= entryFeeRupees
                        ? `Tournament entries require deposit balance. You have Rs.${winningBal} in winning balance but it cannot be used for entries. Please top up your wallet.`
                        : `Insufficient deposit balance. You need Rs.${entryFeeRupees} but only have Rs.${depositBal}.`;
                    throw new ApiError(reason, 402);
                }

                // Atomic: guards only depositBalance; creates tournament_entry txn record
                const idemKey = `entry:${tournamentId}:${userId}`;
                walletResult = await debitTournamentEntry(
                    userId, entryFeeRupees, tournament.title, tournament._id, session, idemKey
                );
            }

            // ── Step 8: Atomic conditional participant insert ─────────────────────
            //
            // This is the race-condition safety net. Instead of tournament.save(),
            // we use a conditional findOneAndUpdate that checks BOTH:
            //   (a) no active registration for this userId ($not + $elemMatch)
            //   (b) active slot count < maxParticipants ($expr + $size equivalent via $lt)
            //
            // If another request inserts a participant between Step 5 and Step 8,
            // MongoDB rejects this update and returns null — we then throw TournamentFullError.
            // This guard works even on standalone MongoDB (no replica set required).
            const newParticipant = {
                userId: new mongoose.Types.ObjectId(userId),
                status: 'confirmed',
                registeredAt: now,
                paymentId: walletResult.transaction?._id || null,
                // assignedSlot is computed AFTER atomic insert (Step 8b)
                // — the backend owns sequential slot assignment, frontend value is ignored
                ...(teamData.teamLeaderName && { teamLeaderName: teamData.teamLeaderName }),
                ...(teamData.leaderGameName && { leaderGameName: teamData.leaderGameName }),
                ...(teamData.teamMember2 && { teamMember2: teamData.teamMember2 }),
                ...(teamData.teamMember3 && { teamMember3: teamData.teamMember3 }),
                ...(teamData.teamMember4 && { teamMember4: teamData.teamMember4 }),
            };

            const updated = await Tournament.findOneAndUpdate(
                {
                    _id: tournamentId,
                    isDeleted: false,
                    status: 'upcoming',
                    // Slot guard: active count must still be < maxParticipants
                    $expr: {
                        $lt: [
                            {
                                $size: {
                                    $filter: {
                                        input: '$participants',
                                        as: 'p',
                                        cond: {
                                            $in: ['$$p.status', ['registered', 'confirmed']],
                                        },
                                    },
                                },
                            },
                            '$maxParticipants',
                        ],
                    },
                    // Duplicate guard: no active entry for this user
                    participants: {
                        $not: {
                            $elemMatch: {
                                userId: new mongoose.Types.ObjectId(userId),
                                status: { $in: ['registered', 'confirmed'] },
                            },
                        },
                    },
                },
                {
                    $push: { participants: newParticipant },
                },
                { session, new: true }
            );

            // If update returns null, slot was taken or duplicate appeared concurrently
            if (!updated) {
                // Re-fetch to give a precise error (full vs duplicate)
                const check = await Tournament.findById(tournamentId)
                    .select('participants maxParticipants')
                    .session(session)
                    .lean();

                const stillDuplicate = check?.participants?.some(
                    (p) =>
                        p.userId.toString() === userId.toString() &&
                        (p.status === 'registered' || p.status === 'confirmed')
                );

                if (stillDuplicate) {
                    logger.warn('Registration race: concurrent duplicate blocked', {
                        userId: userId.toString(),
                        tournamentId: tournamentId.toString(),
                    });
                    throw new DuplicateRegistrationError(tournament.title);
                }

                logger.warn('Registration race: concurrent overfill blocked', {
                    userId: userId.toString(),
                    tournamentId: tournamentId.toString(),
                });
                throw new TournamentFullError(tournament.title);
            }

            logger.info('Tournament registration completed', {
                userId: userId.toString(),
                tournamentId: tournamentId.toString(),
                tournamentTitle: tournament.title,
                entryFee: entryFeeRupees,
                walletBalanceAfter: walletResult.balance,
            });

            // ── Step 8b: Compute and set sequential slot ─────────────────────
            // Slot number = (total non-cancelled participants at time of insert).
            // We use the returned document from findOneAndUpdate (which includes
            // our newly-pushed participant) to derive the slot.
            //
            // Ordering: participants are pushed in order, so array index reflects
            // registration sequence. We count only non-cancelled entries so that
            // cancelled registrations do NOT create gaps in the slot sequence.
            // Slots are never recycled — a cancelled slot stays empty.
            const allParticipants = updated.participants;
            const nonCancelledParticipants = allParticipants.filter(
                (p) => p.status !== 'cancelled'
            );
            // Our entry is the last non-cancelled one pushed
            const myEntry = nonCancelledParticipants.find(
                (p) =>
                    p.userId.toString() === userId.toString() &&
                    (p.status === 'registered' || p.status === 'confirmed')
            );
            const sequentialSlot = myEntry
                ? nonCancelledParticipants.indexOf(myEntry) + 1
                : nonCancelledParticipants.length;

            // Atomic set on the specific participant sub-document
            await Tournament.updateOne(
                { _id: tournamentId, 'participants._id': myEntry._id },
                { $set: { 'participants.$.assignedSlot': sequentialSlot } },
                { session }
            );

            logger.info('Sequential slot assigned', {
                userId: userId.toString(),
                tournamentId: tournamentId.toString(),
                assignedSlot: sequentialSlot,
            });

            result = {
                tournament: {
                    id: tournament._id.toString(),
                    title: tournament.title,
                    game: tournament.game,
                    startDate: tournament.startDate,
                    entryFee: entryFeeRupees,
                },
                walletBalance: walletResult.balance,
                transactionId: walletResult.transaction?._id?.toString() || null,
                assignedSlot: sequentialSlot,
            };
        });

        // ── Step 9: Increment lifetime matchCount OUTSIDE the transaction ────────
        // Kept outside session.withTransaction() so it works reliably on both
        // standalone MongoDB (no replica set) and replica sets.
        // The participant insert (Step 8) uses a conditional findOneAndUpdate with
        // duplicate + slot guards — so this $inc only reaches here after a genuinely
        // successful registration. On duplicate/error, withTransaction throws and
        // execution never reaches this line.
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $inc: { matchCount: 1 } },
            { new: true }
        );

        logger.info('Lifetime match count incremented', {
            userId: userId.toString(),
            tournamentId: tournamentId.toString(),
            matchCount: updatedUser?.matchCount,
        });

        // Attach the updated matchCount to the result so the controller can return it
        result.matchCount = updatedUser?.matchCount ?? 0;

        return result;
    } finally {
        await session.endSession();
    }
}

module.exports = { registerWithWallet };
