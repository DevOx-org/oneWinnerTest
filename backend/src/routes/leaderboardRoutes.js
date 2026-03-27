const express = require('express');
const {
    getGlobalLeaderboard,
    getGameLeaderboard,
} = require('../controllers/leaderboardController');

const router = express.Router();

// Public routes — no authentication required
router.get('/global', getGlobalLeaderboard);
router.get('/game/:game', getGameLeaderboard);

module.exports = router;
