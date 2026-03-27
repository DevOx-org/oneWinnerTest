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

const router = express.Router();

// Public routes — optionalAuth enriches response with isRegistered when user is logged in
router.get('/', optionalAuth, getPublicTournaments);
router.get('/:id', getTournamentById);

// Protected routes - require login
// POST /api/tournaments/:id/register  → deducts wallet, saves participant
// requireCompleteProfile ensures user has phone before joining
router.post('/:id/register', protect, requireCompleteProfile, registerForTournament);

// GET /api/tournaments/:id/my-status  → returns whether current user is registered
router.get('/:id/my-status', protect, getMyRegistrationStatus);

// GET /api/tournaments/:id/room-details  → returns room credentials (time-gated, participants only)
router.get('/:id/room-details', protect, getRoomDetails);

module.exports = router;
