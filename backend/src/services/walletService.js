'use strict';

const mongoose = require('mongoose');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const { InsufficientBalanceError } = require('../utils/errors');
const logger = require('../config/logger');

/**
 * walletService — all wallet operations are atomic server-side only.
 *
 * PHASE 1 MULTI-BALANCE ARCHITECTURE:
 *   depositBalance  — funded via payment gateway; used for tournament entry debits
 *   winningBalance  — prize money; credited by settlement; withdrawable
 *   lockedBalance   — held while a withdrawal request is pending
 *   lifetimeWithdrawn — audit cumulative total (never decremented)
 *
 * VIRTUAL walletBalance = depositBalance + winningBalance
 *   All legacy code that reads walletBalance continues to work.
 *
 * SAFETY GUARANTEES:
 * - creditWallet / debitWallet use findOneAndUpdate with atomic conditions.
 *   No read-then-write (TOCTOU). MongoDB applies the update in a single op.
 * - debitWallet condition: { depositBalance: { $gte: amount } }
 *   If balance is insufficient, MongoDB returns null and we throw immediately.
 * - walletVersion is incremented on every operation for optimistic locking.
 * - Every operation creates an immutable WalletTransaction audit record.
 * - All functions accept an optional Mongoose session for multi-doc transactions.
 */

// ─── creditWallet ─────────────────────────────────────────────────────────────

/**
 * Credit (add money to) a user's depositBalance.
 * Used for: Razorpay top-ups, withdrawal rollbacks, refunds.
 *
 * @param {string|ObjectId} userId
 * @param {number}          amountRupees    - positive number in INR
 * @param {string}          description     - human-readable label
 * @param {string}          [reference]     - e.g. Razorpay paymentId
 * @param {string}          [refModel]      - 'Payment' | 'Tournament' | 'WithdrawalRequest'
 * @param {Map|object}      [meta]          - extra metadata (stored as Mongoose Map)
 * @param {ClientSession}   [session]       - Mongoose session for transactions
 * @param {string}          [idempotencyKey]- DB-unique key; prevents double-credit on retry
 * @returns {Promise<{balance: number, transaction: WalletTransaction}>}
 */
async function creditWallet(
    userId, amountRupees, description,
    reference = null, refModel = null,
    meta = {}, session = null, idempotencyKey = null
) {
    const metaMap = meta instanceof Map ? meta : new Map(Object.entries(meta ?? {}));
    if (amountRupees <= 0) throw new Error('Credit amount must be positive');

    const opts = session ? { session, new: true } : { new: true };

    // Atomic: increment depositBalance + version in a single MongoDB op
    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $inc: { depositBalance: amountRupees, walletVersion: 1 } },
        opts
    );
    if (!updatedUser) throw new Error(`User ${userId} not found during wallet credit`);

    // balanceAfter = depositBalance only (the bucket this credit goes to)
    const balanceAfter = updatedUser.depositBalance ?? 0;

    const txnDoc = {
        userId,
        type: 'credit',
        balanceType: 'depositBalance',
        amount: amountRupees,
        balanceAfter,
        description,
        reference,
        referenceModel: refModel,
        meta: metaMap,
    };
    if (idempotencyKey) txnDoc.idempotencyKey = idempotencyKey;

    const createArgs = [[txnDoc]];
    if (session) createArgs.push({ session });
    const [txn] = await WalletTransaction.create(...createArgs);
    const plainTxn = txn.toObject();

    logger.info('Wallet credited', {
        userId: userId.toString(), amount: amountRupees, balanceAfter, reference, idempotencyKey,
    });

    return { balance: balanceAfter, transaction: plainTxn };
}

// ─── debitWallet ──────────────────────────────────────────────────────────────

/**
 * Debit (subtract money from) a user's depositBalance.
 * Atomically enforces sufficient balance — no read-then-write.
 *
 * Phase 1: deducts from depositBalance only.
 * Future phases may add winningBalance fallback logic.
 *
 * @param {string|ObjectId} userId
 * @param {number}          amountRupees    - positive number in INR
 * @param {string}          description
 * @param {string}          [reference]
 * @param {string}          [refModel]
 * @param {Map|object}      [meta]
 * @param {ClientSession}   [session]
 * @param {string}          [idempotencyKey]
 * @returns {Promise<{balance: number, transaction: WalletTransaction}>}
 * @throws  {InsufficientBalanceError} if depositBalance < amountRupees
 */
async function debitWallet(
    userId, amountRupees, description,
    reference = null, refModel = null,
    meta = {}, session = null, idempotencyKey = null
) {
    const metaMap = meta instanceof Map ? meta : new Map(Object.entries(meta ?? {}));
    if (amountRupees <= 0) throw new Error('Debit amount must be positive');

    const opts = session ? { session, new: true } : { new: true };

    // Atomic guard: condition { depositBalance: { $gte: amount } } ensures
    // MongoDB only applies the $inc if funds are available.
    const updatedUser = await User.findOneAndUpdate(
        { _id: userId, depositBalance: { $gte: amountRupees } },
        { $inc: { depositBalance: -amountRupees, walletVersion: 1 } },
        opts
    );

    if (!updatedUser) {
        const current = await User.findById(userId).select('depositBalance winningBalance').lean();
        const available = current
            ? (current.depositBalance ?? 0) + (current.winningBalance ?? 0)
            : 0;
        throw new InsufficientBalanceError(available, amountRupees);
    }

    const balanceAfter = updatedUser.depositBalance ?? 0;

    const txnDoc = {
        userId,
        type: 'debit',
        balanceType: 'depositBalance',
        amount: amountRupees,
        balanceAfter,
        description,
        reference,
        referenceModel: refModel,
        meta: metaMap,
    };
    if (idempotencyKey) txnDoc.idempotencyKey = idempotencyKey;

    const createArgsDebit = [[txnDoc]];
    if (session) createArgsDebit.push({ session });
    const [txn] = await WalletTransaction.create(...createArgsDebit);
    const plainTxn = txn.toObject();

    logger.info('Wallet debited', {
        userId: userId.toString(), amount: amountRupees, balanceAfter, reference, idempotencyKey,
    });

    return { balance: balanceAfter, transaction: plainTxn };
}

// ─── debitTournamentEntry ─────────────────────────────────────────────────────

/**
 * Debit tournament entry fee ONLY from depositBalance.
 *
 * Business rule (Phase 2):
 *   - Only depositBalance is eligible for tournament entries.
 *   - winningBalance cannot be used for entries (it is withdraw-only).
 *   - Atomic: findOneAndUpdate with depositBalance >= entryFee as the guard.
 *
 * @param {string|ObjectId}  userId
 * @param {number}           entryFeeRupees   - positive amount in INR
 * @param {string}           tournamentTitle  - for the transaction description
 * @param {string|ObjectId}  tournamentId     - reference stored in txn record
 * @param {ClientSession}    [session]        - Mongoose session for multi-doc txn
 * @param {string}           [idempotencyKey] - prevents double-debit on retry
 * @returns {Promise<{balance: number, transaction: WalletTransaction}>}
 * @throws  {InsufficientBalanceError} if depositBalance < entryFeeRupees
 */
async function debitTournamentEntry(
    userId, entryFeeRupees, tournamentTitle, tournamentId,
    session = null, idempotencyKey = null
) {
    if (entryFeeRupees <= 0) throw new Error('Entry fee must be positive');

    const opts = session ? { session, new: true } : { new: true };

    // ── Atomic guard: only depositBalance is checked — winningBalance is NOT eligible ──
    const updatedUser = await User.findOneAndUpdate(
        {
            _id: userId,
            depositBalance: { $gte: entryFeeRupees },   // ONLY depositBalance
        },
        {
            $inc: { depositBalance: -entryFeeRupees, walletVersion: 1 },
        },
        opts
    );

    if (!updatedUser) {
        // Fetch current state to build a precise error message
        const current = await User.findById(userId)
            .select('depositBalance winningBalance')
            .lean();
        const depositBal = current?.depositBalance ?? 0;
        const winningBal = current?.winningBalance ?? 0;

        if (depositBal < entryFeeRupees && winningBal >= entryFeeRupees) {
            // User has enough TOTAL but it's in winningBalance — explain the separation
            throw new InsufficientBalanceError(
                depositBal,
                entryFeeRupees,
                'Tournament entries require deposit balance. Your winning balance cannot be used for entries — please top up your wallet.'
            );
        }
        throw new InsufficientBalanceError(depositBal + winningBal, entryFeeRupees);
    }

    // Balance snapshot after deduction — depositBalance only (the debited bucket)
    const balanceAfter = updatedUser.depositBalance ?? 0;

    // Create immutable audit record with tournament_entry type
    const txnDoc = {
        userId,
        type: 'tournament_entry',
        balanceType: 'depositBalance',
        amount: entryFeeRupees,
        balanceAfter,
        description: `Tournament entry: ${tournamentTitle}`,
        reference: tournamentId.toString(),
        referenceModel: 'Tournament',
        meta: new Map([
            ['tournamentId', tournamentId.toString()],
            ['tournamentTitle', tournamentTitle],
            ['source', 'tournament'],
        ]),
    };
    if (idempotencyKey) txnDoc.idempotencyKey = idempotencyKey;

    const createArgs = [[txnDoc]];
    if (session) createArgs.push({ session });
    const [txn] = await WalletTransaction.create(...createArgs);
    const plainTxn = txn.toObject();

    logger.info('Tournament entry debit', {
        userId: userId.toString(),
        tournamentId: tournamentId.toString(),
        entryFee: entryFeeRupees,
        depositAfter: updatedUser.depositBalance,
        balanceAfter,
        idempotencyKey,
    });

    return { balance: balanceAfter, transaction: plainTxn };
}



/**
 * Get the current total wallet balance (depositBalance + winningBalance).
 * @param {string|ObjectId} userId
 * @returns {Promise<number>}
 */
async function getBalance(userId) {
    const user = await User.findById(userId)
        .select('depositBalance winningBalance')
        .lean();
    if (!user) throw new Error(`User ${userId} not found`);
    return (user.depositBalance ?? 0) + (user.winningBalance ?? 0);
}

// ─── getWalletDetails ─────────────────────────────────────────────────────────

/**
 * Returns the full multi-balance breakdown + paginated transaction history.
 * Replaces the old getTransactionHistory response shape (backward-compatible:
 * still returns `balance` = total spendable).
 */
async function getTransactionHistory(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [transactions, total, user] = await Promise.all([
        WalletTransaction.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        WalletTransaction.countDocuments({ userId }),
        User.findById(userId)
            .select('depositBalance winningBalance lockedBalance lifetimeWithdrawn')
            .lean(),
    ]);

    const depositBalance = user?.depositBalance ?? 0;
    const winningBalance = user?.winningBalance ?? 0;
    const lockedBalance = user?.lockedBalance ?? 0;
    const lifetimeWithdrawn = user?.lifetimeWithdrawn ?? 0;

    return {
        // Legacy field — total spendable (virtual walletBalance)
        balance: depositBalance + winningBalance,
        // New breakdown
        wallet: { depositBalance, winningBalance, lockedBalance, lifetimeWithdrawn },
        transactions,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
        },
    };
}

// ─── getWalletBalance (used by walletController.getWalletBalance) ─────────────

/**
 * Returns full wallet details for the /api/wallet/balance endpoint.
 */
async function getWalletBalanceDetails(userId) {
    const user = await User.findById(userId)
        .select('depositBalance winningBalance lockedBalance lifetimeWithdrawn')
        .lean();
    if (!user) throw new Error(`User ${userId} not found`);

    const depositBalance = user.depositBalance ?? 0;
    const winningBalance = user.winningBalance ?? 0;
    const lockedBalance = user.lockedBalance ?? 0;
    const lifetimeWithdrawn = user.lifetimeWithdrawn ?? 0;

    return {
        // Backward-compat total
        walletBalance: depositBalance + winningBalance,
        // New breakdown for UI
        depositBalance,
        winningBalance,
        lockedBalance,
        lifetimeWithdrawn,
    };
}


// ─── creditWinningBalance ────────────────────────────────────────────────────
/**
 * Credit tournament prize money ONLY to winningBalance (Phase 3).
 *
 * Business rule: prize money goes to winningBalance (withdraw-only balance).
 * It is NOT deposited into depositBalance and cannot be used for tournament entries.
 *
 * @param {string|ObjectId}  userId
 * @param {number}           prizeAmountRupees
 * @param {string}           description
 * @param {string|ObjectId}  tournamentId
 * @param {object}           [metaData]
 * @param {ClientSession}    [session]
 * @param {string}           [idempotencyKey]    prevents double-credit on retry
 * @returns {Promise<{balance: number, winningBalance: number, transaction}>}
 */
async function creditWinningBalance(
    userId, prizeAmountRupees, description,
    tournamentId, metaData = {}, session = null, idempotencyKey = null
) {
    if (prizeAmountRupees <= 0) throw new Error('Prize amount must be positive');

    const opts = session ? { session, new: true } : { new: true };

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $inc: { winningBalance: prizeAmountRupees, walletVersion: 1 } },
        opts
    );
    if (!updatedUser) throw new Error(`User ${userId} not found during winning credit`);

    // For winning_credit, balanceAfter = winningBalance only (the bucket the prize goes to)
    // NOT depositBalance + winningBalance, which would confuse the user.
    const balanceAfter = updatedUser.winningBalance ?? 0;

    const metaEntries = { tournamentId: tournamentId ? tournamentId.toString() : '', ...metaData };
    const metaMap = new Map(Object.entries(metaEntries));

    const txnDoc = {
        userId,
        type:           'winning_credit',
        balanceType:    'winningBalance',
        amount:         prizeAmountRupees,
        balanceAfter,
        description,
        reference:      tournamentId ? tournamentId.toString() : null,
        referenceModel: 'Tournament',
        meta:           metaMap,
    };
    if (idempotencyKey) txnDoc.idempotencyKey = idempotencyKey;

    const createArgs = [[txnDoc]];
    if (session) createArgs.push({ session });
    const [txn] = await WalletTransaction.create(...createArgs);
    const plainTxn = txn.toObject();

    logger.info('Winning balance credited', {
        userId:          userId.toString(),
        tournamentId:    tournamentId ? tournamentId.toString() : null,
        prizeAmount:     prizeAmountRupees,
        winningBalAfter: updatedUser.winningBalance,
        balanceAfter,
        idempotencyKey,
    });

    return { balance: balanceAfter, winningBalance: updatedUser.winningBalance, transaction: plainTxn };
}


// ─── holdForWithdrawal ────────────────────────────────────────────────────────
/**
 * Phase 4: Hold withdrawal funds atomically.
 * 
 * Atomic operation: winningBalance -= amount, lockedBalance += amount
 * Guard: winningBalance >= amount (only winningBalance is eligible)
 * Creates a withdrawal_request WalletTransaction.
 * 
 * NEVER touches depositBalance.
 *
 * @param {string|ObjectId}  userId
 * @param {number}           amount          - positive INR amount
 * @param {string|ObjectId}  [requestId]     - the WithdrawalRequest._id (for reference)
 * @param {ClientSession}    [session]
 * @param {string}           [idempotencyKey]
 * @returns {Promise<{balance, winningBalance, lockedBalance, transaction}>}
 * @throws  {InsufficientBalanceError} if winningBalance < amount
 */
async function holdForWithdrawal(userId, amount, requestId = null, session = null, idempotencyKey = null) {
    if (amount <= 0) throw new Error('Withdrawal amount must be positive');

    const opts = session ? { session, new: true } : { new: true };

    // Atomic guard on winningBalance — depositBalance is NEVER touched
    const updatedUser = await User.findOneAndUpdate(
        { _id: userId, winningBalance: { $gte: amount } },
        { $inc: { winningBalance: -amount, lockedBalance: amount, walletVersion: 1 } },
        opts
    );

    if (!updatedUser) {
        const current = await User.findById(userId).select('winningBalance lockedBalance depositBalance').lean();
        const winningBal  = current?.winningBalance  ?? 0;
        const depositBal  = current?.depositBalance  ?? 0;
        if (depositBal >= amount && winningBal < amount) {
            throw new InsufficientBalanceError(
                winningBal, amount,
                'Withdrawals can only be made from your winning balance. Your deposit balance cannot be withdrawn.'
            );
        }
        throw new InsufficientBalanceError(winningBal, amount);
    }

    const balanceAfter = updatedUser.winningBalance ?? 0;

    const txnDoc = {
        userId,
        type:           'withdrawal_request',
        balanceType:    'winningBalance',
        amount,
        balanceAfter,
        description:    `Withdrawal hold — ₹${amount} moved to pending`,
        reference:      requestId ? requestId.toString() : null,
        referenceModel: 'WithdrawalRequest',
        meta: new Map([['source', 'withdrawal'], ['lockedBalance', (updatedUser.lockedBalance ?? 0).toString()]]),
    };
    if (idempotencyKey) txnDoc.idempotencyKey = idempotencyKey;

    const createArgs = [[txnDoc]];
    if (session) createArgs.push({ session });
    const [txn] = await WalletTransaction.create(...createArgs);

    logger.info('Withdrawal hold placed on winningBalance', {
        userId: userId.toString(), amount,
        winningAfter: updatedUser.winningBalance,
        lockedAfter:  updatedUser.lockedBalance,
    });

    return {
        balance:        balanceAfter,
        winningBalance: updatedUser.winningBalance,
        lockedBalance:  updatedUser.lockedBalance,
        transaction:    txn.toObject(),
    };
}

// ─── releaseWithdrawalHold ────────────────────────────────────────────────────
/**
 * Phase 4: Release a withdrawal hold.
 *
 * On REJECTION:  lockedBalance -= amount, winningBalance += amount (restore)
 * On APPROVAL:   lockedBalance -= amount, lifetimeWithdrawn += amount (payout)
 *
 * @param {string|ObjectId} userId
 * @param {number}          amount
 * @param {'approve'|'reject'} action
 * @param {string|ObjectId} [requestId]
 * @param {string}          [idempotencyKey]
 */
async function releaseWithdrawalHold(userId, amount, action, requestId = null, idempotencyKey = null) {
    if (amount <= 0) throw new Error('Release amount must be positive');
    if (!['approve', 'reject'].includes(action)) throw new Error('action must be approve or reject');

    const walletUpdate = action === 'reject'
        ? { $inc: { lockedBalance: -amount, winningBalance: amount, walletVersion: 1 } }   // restore
        : { $inc: { lockedBalance: -amount, lifetimeWithdrawn: amount, walletVersion: 1 } }; // payout

    const updatedUser = await User.findOneAndUpdate(
        { _id: userId, lockedBalance: { $gte: amount } },
        walletUpdate,
        { new: true }
    );

    if (!updatedUser) {
        logger.error('releaseWithdrawalHold: lockedBalance insufficient — MANUAL REVIEW REQUIRED', {
            userId: userId.toString(), amount, action, requestId: requestId?.toString(),
        });
        throw new Error(`Cannot release hold: lockedBalance < ${amount}. Manual intervention required.`);
    }

    // For reject: winningBalance (money restored). For approve: show 0 locked remaining.
    const balanceAfter = action === 'reject'
        ? (updatedUser.winningBalance ?? 0)
        : (updatedUser.lockedBalance ?? 0);
    const txnType       = action === 'reject' ? 'withdrawal_refund' : 'debit';
    const walletBucket  = action === 'reject' ? 'winningBalance' : 'lockedBalance';

    const txnDoc = {
        userId,
        type:           txnType,
        balanceType:    walletBucket,
        amount,
        balanceAfter,
        description:    action === 'reject'
            ? `Withdrawal rejected — ₹${amount} restored to winning balance`
            : `Withdrawal approved — ₹${amount} paid out`,
        reference:      requestId ? requestId.toString() : null,
        referenceModel: 'WithdrawalRequest',
        meta: new Map([['action', action]]),
    };
    if (idempotencyKey) txnDoc.idempotencyKey = idempotencyKey;

    const [txn] = await WalletTransaction.create([txnDoc]);

    logger.info('Withdrawal hold released', {
        userId: userId.toString(), amount, action,
        lockedAfter:  updatedUser.lockedBalance,
        winningAfter: updatedUser.winningBalance,
        lifetimeWithdrawn: updatedUser.lifetimeWithdrawn,
    });

    return { balance: balanceAfter, transaction: txn.toObject() };
}

module.exports = {
    creditWallet,
    debitWallet,
    debitTournamentEntry,
    creditWinningBalance,
    holdForWithdrawal,
    releaseWithdrawalHold,
    getBalance,
    getTransactionHistory,
    getWalletBalanceDetails,
};
