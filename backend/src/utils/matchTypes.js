'use strict';

/**
 * matchTypes.js — Single source of truth for Match Type configuration.
 *
 * Every match-type-related constant lives here. No hardcoding elsewhere.
 * Imported by: Tournament model (schema enum + pre-validate hook),
 *              admin controller (validation), registration service (logging).
 */

// ── Match Type enum values ────────────────────────────────────────────────────
const MATCH_TYPES = Object.freeze({
    TDM:                 'TDM',
    BATTLE_ROYALE_SOLO:  'Battle Royale - Solo',
    BATTLE_ROYALE_SQUAD: 'Battle Royale - Squad',
});

// ── Match Type → max slot count mapping ───────────────────────────────────────
// When a match type is selected, maxParticipants is derived from this table.
const MATCH_TYPE_SLOTS = Object.freeze({
    [MATCH_TYPES.TDM]:                 2,
    [MATCH_TYPES.BATTLE_ROYALE_SOLO]:  48,
    [MATCH_TYPES.BATTLE_ROYALE_SQUAD]: 12,
});

// ── Convenience: array of valid enum strings ──────────────────────────────────
const VALID_MATCH_TYPES = Object.values(MATCH_TYPES);

// ── Default config per match type (auto-fill on creation) ─────────────────────
// Used by the admin creation form. Backend stores these on the tournament doc.
const MATCH_TYPE_DEFAULTS = Object.freeze({
    [MATCH_TYPES.BATTLE_ROYALE_SOLO]: {
        prizePool: 420,
        entryFee: 20,
        perKillAmount: 8,
        rankDistribution: { '1': 80, '2': 60, '3': 40 },
    },
});

module.exports = {
    MATCH_TYPES,
    MATCH_TYPE_SLOTS,
    MATCH_TYPE_DEFAULTS,
    VALID_MATCH_TYPES,
};
