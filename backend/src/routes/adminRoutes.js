const express = require('express');
const {
    getAnalytics,
    getUserMetrics,
    getTournamentMetrics,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    getAllTournaments,
    createTournament,
    updateTournament,
    deleteTournament,
    setRoomCredentials,
    getTournamentParticipants,
    getRegistrationDetail,
    banTournamentParticipant,
    distributeWinnings,
    getPendingSettlements,
    setParticipantRank,
    getSettlementAlerts,
    getSettlementHistory,
    getSettlementHistoryById,
    getWithdrawalRequests,
    approveWithdrawal,
    rejectWithdrawal,
} = require('../controllers/adminController');
const {
    getManualPayments,
    approveManualPayment,
    rejectManualPayment,
    getPendingCount: getManualPaymentPendingCount,
} = require('../controllers/manualPaymentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// ── Analytics ─────────────────────────────────────────────────────────────────
router.get('/analytics/overview', getAnalytics);
router.get('/analytics/users', getUserMetrics);
router.get('/analytics/tournaments', getTournamentMetrics);

// ── User management ───────────────────────────────────────────────────────────
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// ── Tournament management ─────────────────────────────────────────────────────
router.get('/tournaments', getAllTournaments);
router.post('/tournaments', createTournament);
router.put('/tournaments/:id', updateTournament);
router.delete('/tournaments/:id', deleteTournament);

// Room credentials
router.patch('/tournaments/:id/room-credentials', setRoomCredentials);

// Participant management
router.get('/tournaments/:id/participants', getTournamentParticipants);
router.get('/tournaments/:id/participants/:userId', getRegistrationDetail);
router.patch('/tournaments/:id/participants/:userId/ban', banTournamentParticipant);
router.patch('/tournaments/:id/participants/:userId/rank', setParticipantRank);

// ── Settlement (Phase 3) ──────────────────────────────────────────────────────
router.get('/alerts/settlements', getSettlementAlerts);
router.get('/settlements/pending', getPendingSettlements);
router.get('/settlements/history', getSettlementHistory);
router.get('/settlements/history/:id', getSettlementHistoryById);
router.post('/tournaments/:id/distribute-winnings', distributeWinnings);

// ── Withdrawal management ─────────────────────────────────────────────────────
router.get('/withdrawals', getWithdrawalRequests);
router.patch('/withdrawals/:id/approve', approveWithdrawal);
router.patch('/withdrawals/:id/reject', rejectWithdrawal);

// ── Manual Payment management ─────────────────────────────────────────────────
router.get('/manual-payments', getManualPayments);
router.get('/manual-payments/pending-count', getManualPaymentPendingCount);
router.patch('/manual-payments/:id/approve', approveManualPayment);
router.patch('/manual-payments/:id/reject', rejectManualPayment);

module.exports = router;
