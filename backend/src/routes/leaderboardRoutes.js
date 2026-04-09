const express = require('express');
const {
    getGlobalLeaderboard,
    getGameLeaderboard,
} = require('../controllers/leaderboardController');
const { publicLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Public routes — no authentication required
// publicLimiter: 200/15min per IP (relaxed, read-only data)
router.get('/global', publicLimiter, getGlobalLeaderboard);
router.get('/game/:game', publicLimiter, getGameLeaderboard);

module.exports = router;
