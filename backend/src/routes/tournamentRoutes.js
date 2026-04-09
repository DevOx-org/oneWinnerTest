const express = require('express');
const {
    getPublicTournaments,
    getTournamentById,
    registerForTournament,
    getMyRegistrationStatus,
    getRoomDetails,
} = require('../controllers/tournamentController');
const { protect, optionalAuth } = require('../middleware/auth');
const requireCompleteProfile = require('../middleware/requireCompleteProfile');
const { criticalLimiter, publicLimiter } = require('../middleware/rateLimiter');
const { deduplicateRequest } = require('../middleware/deduplicateRequest');

const router = express.Router();

// Public routes — optionalAuth enriches response with isRegistered when user is logged in
// publicLimiter: 200/15min per IP (relaxed, read-only data)
router.get('/', publicLimiter, optionalAuth, getPublicTournaments);
router.get('/:id', publicLimiter, getTournamentById);

// Protected routes - require login
// POST /api/tournaments/:id/register  → deducts wallet, saves participant
// requireCompleteProfile ensures user has phone before joining
// deduplicateRequest prevents double-click / rapid re-submit (3s window)
router.post('/:id/register', protect, requireCompleteProfile, deduplicateRequest({ windowSeconds: 3, prefix: 'reg' }), registerForTournament);

// GET /api/tournaments/:id/my-status  → returns whether current user is registered
router.get('/:id/my-status', protect, getMyRegistrationStatus);

// GET /api/tournaments/:id/room-details  → returns room credentials (time-gated, participants only)
// criticalLimiter: 100/min per user (very relaxed — this is the burst endpoint)
// deduplicateRequest: 2s window to prevent rapid-fire duplicate calls
router.get('/:id/room-details', protect, criticalLimiter, deduplicateRequest({ windowSeconds: 2, prefix: 'room' }), getRoomDetails);

module.exports = router;
