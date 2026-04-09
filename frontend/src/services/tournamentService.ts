import api from './api';

export interface PublicTournament {
    _id: string;
    title: string;
    description: string;
    game: string;
    platform: string;
    startDate: string;
    endDate: string;
    registrationDeadline: string;
    maxParticipants: number;
    entryFee: number;
    prizePool: number;
    status: string;
    /** Active participant count (registered + confirmed only, not cancelled) */
    currentPlayers: number;
    bannerImage?: string;
    createdAt: string;
    updatedAt: string;
    /** Aggregated by the backend in the list endpoint — never set by the frontend */
    isRegistered: boolean;
    /** Server-computed: maxParticipants - active count. Never negative. */
    spotsLeft: number;
    /** Server-computed: true only when status=upcoming, deadline open, spots available, not registered */
    canJoin: boolean;
    /** Server-computed live state based on UTC time */
    tournamentState: 'OPEN' | 'REGISTRATION_CLOSED' | 'LIVE' | 'COMPLETED';
    /** Server-computed: true only when UPCOMING + before registration deadline */
    registrationOpen: boolean;
}

export interface TournamentsResponse {
    success: boolean;
    data: PublicTournament[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export interface TournamentDetailResponse {
    success: boolean;
    data: PublicTournament;
}

export interface TournamentRegistrationResponse {
    success: boolean;
    message: string;
    registration: {
        tournament: {
            id: string;
            title: string;
            game: string;
            startDate: string;
            entryFee: number;
        };
        transactionId: string | null;
        /** Sequential slot number assigned by the backend */
        assignedSlot: number;
    };
    walletBalance: number;
    matchCount: number;
}

export interface RegistrationStatusResponse {
    success: boolean;
    isRegistered: boolean;
}

export interface RoomDetailsResponse {
    success: boolean;
    roomVisible: boolean;
    /** ISO-8601 UTC — when room creds are/were released (startDate - 30 min) */
    releaseTime: string;
    /** Only present when roomVisible === true */
    roomId?: string;
    roomPassword?: string;
    /** Set when window has opened but admin hasn't provided credentials yet */
    message?: string;
}

/**
 * Get current server time (UTC ISO-8601).
 * Used by useMatchStatus hook to avoid client-clock manipulation.
 */
export const getServerTime = async (): Promise<string> => {
    const response = await api.get<{ success: boolean; serverTime: string }>('/server-time');
    return response.data.serverTime;
};

/**
 * Get all public tournaments
 */
export const getPublicTournaments = async (params?: {
    status?: string;
    game?: string;
    page?: number;
    limit?: number;
}): Promise<TournamentsResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.game) queryParams.append('game', params.game);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await api.get<TournamentsResponse>(`/tournaments?${queryParams.toString()}`);
    return response.data;
};

/**
 * Get single tournament by ID
 */
export const getTournamentById = async (id: string): Promise<TournamentDetailResponse> => {
    const response = await api.get<TournamentDetailResponse>(`/tournaments/${id}`);
    return response.data;
};

/**
 * Team data collected during registration.
 */
export interface TeamRegistrationData {
    teamLeaderName?: string;
    leaderGameName?: string;
    teamMember2?: string;
    teamMember3?: string;
    teamMember4?: string;
}

/**
 * Register for a tournament using wallet balance.
 * Entry fee is deducted from the user's wallet on the backend.
 */
export const registerForTournament = async (
    tournamentId: string,
    teamData?: TeamRegistrationData
): Promise<TournamentRegistrationResponse> => {
    const response = await api.post<TournamentRegistrationResponse>(
        `/tournaments/${tournamentId}/register`,
        teamData || {}
    );
    return response.data;
};

/**
 * Check whether the authenticated user is registered in a specific tournament.
 * Protected endpoint — server is the single source of truth.
 * Requires a valid JWT token (sent via the api interceptor).
 */
export const getMyRegistrationStatus = async (tournamentId: string): Promise<RegistrationStatusResponse> => {
    const response = await api.get<RegistrationStatusResponse>(`/tournaments/${tournamentId}/my-status`);
    return response.data;
};

/**
 * Get room credentials for a registered participant.
 * Backend controls release timing — returns roomVisible:false until 30 min before match.
 */
export const getRoomDetails = async (tournamentId: string): Promise<RoomDetailsResponse> => {
    const response = await api.get<RoomDetailsResponse>(`/tournaments/${tournamentId}/room-details`);
    return response.data;
};

/**
 * Get tournaments that the current logged-in user has joined.
 * Reuses the public endpoint (optionalAuth enriches with isRegistered)
 * and filters client-side. No backend change required.
 *
 * NOTE: The public list endpoint only returns upcoming/live tournaments.
 * Completed tournaments are NOT returned here — use getMyMatchHistory
 * which also discovers completed tournament IDs from wallet transactions.
 */
export const getMyTournaments = async (): Promise<PublicTournament[]> => {
    // Fetch a large page so we capture all active tournaments
    const response = await getPublicTournaments({ limit: 100 });
    return response.data.filter((t) => t.isRegistered);
};

// ── Enriched match data for Match History ────────────────────────────────────

export interface EnrichedMatch {
    _id: string;
    title: string;
    game: string;
    platform: string;
    startDate: string;
    endDate: string;
    prizePool: number;
    entryFee: number;
    status: string;
    tournamentState: string;
    currentPlayers: number;
    maxParticipants: number;
    /** User's rank in this tournament (undefined if not ranked yet) */
    userRank?: number;
    /** Prize amount won based on rank and prizeDistribution */
    prizeWon: number;
    /** True if user finished in a prize-winning rank (1st/2nd/3rd) */
    isWinner: boolean;
}

/**
 * Helper: build an EnrichedMatch from full tournament detail + userId.
 */
const buildEnrichedMatch = (fullData: any, userId: string): EnrichedMatch => {
    // Find user's participant entry
    const participants = fullData.participants || [];
    const myEntry = participants.find(
        (p: any) => p.userId === userId || p.userId?.toString() === userId
    );

    const userRank = myEntry?.rank;

    // Calculate prize from prizeDistribution (a Map: {'1st': 50, '2nd': 30, '3rd': 20} — percentages)
    let prizeWon = 0;
    if (userRank && fullData.prizeDistribution) {
        const rankLabels: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd' };
        const label = rankLabels[userRank];
        if (label) {
            // prizeDistribution can be a plain object or Map serialized as object
            const pct = typeof fullData.prizeDistribution.get === 'function'
                ? fullData.prizeDistribution.get(label)
                : fullData.prizeDistribution[label];
            if (pct) {
                prizeWon = Math.round((fullData.prizePool * pct) / 100);
            }
        }
    }

    // Rank 1, 2, or 3 all count as a WIN
    const isWinner = userRank !== undefined && userRank >= 1 && userRank <= 3;

    // Compute tournamentState from dates if not provided
    const now = new Date();
    const endTime = fullData.endDate ? new Date(fullData.endDate) : null;
    const startTime = fullData.startDate ? new Date(fullData.startDate) : null;
    let tournamentState = fullData.tournamentState || 'OPEN';
    if (fullData.status === 'completed' || (endTime && now >= endTime)) {
        tournamentState = 'COMPLETED';
    } else if (startTime && now >= startTime) {
        tournamentState = 'LIVE';
    }

    // Count only active participants
    const activeCount = participants.filter(
        (p: any) => p.status === 'registered' || p.status === 'confirmed'
    ).length;

    return {
        _id: fullData._id,
        title: fullData.title,
        game: fullData.game,
        platform: fullData.platform,
        startDate: fullData.startDate,
        endDate: fullData.endDate,
        prizePool: fullData.prizePool,
        entryFee: fullData.entryFee,
        status: fullData.status,
        tournamentState,
        currentPlayers: activeCount,
        maxParticipants: fullData.maxParticipants,
        userRank,
        prizeWon,
        isWinner,
    };
};

/**
 * Fetches enriched match history for the logged-in user.
 *
 * Two-pronged discovery strategy (frontend-only, no backend changes):
 *  1. Active tournaments: from getMyTournaments (upcoming/live where isRegistered)
 *  2. Completed tournaments: discovered via wallet transaction references
 *     (tournament_entry transactions store tournament IDs in the 'reference' field)
 *
 * For each discovered tournament, calls getTournamentById to get the full
 * participants array (with rank) and prizeDistribution. Then calculates
 * the user's prize based on their rank.
 *
 * @param userId - The logged-in user's ID (from AuthContext)
 */
export const getMyMatchHistory = async (userId: string): Promise<EnrichedMatch[]> => {
    // ── Step 1: Discover ALL tournament IDs the user has registered for ──────

    // 1a. Active tournaments from the public list (upcoming/live only)
    const myTournaments = await getMyTournaments();
    const knownIds = new Set(myTournaments.map((t) => t._id));

    // 1b. Discover completed tournament IDs from wallet transactions
    //     tournament_entry transactions have the tournament ID in the 'reference' field
    try {
        const { getTransactionHistory } = await import('./walletService');
        const txnRes = await getTransactionHistory(1, 200);
        const transactions = txnRes.recentTransactions || [];
        for (const txn of transactions) {
            // tournament_entry transactions carry the tournament ObjectId in 'reference'
            const txnAny = txn as any;
            if (
                (txnAny.type === 'tournament_entry' || txnAny.type === 'debit') &&
                txnAny.reference &&
                typeof txnAny.reference === 'string' &&
                txnAny.reference.length >= 20 // looks like a MongoDB ObjectId
            ) {
                knownIds.add(txnAny.reference);
            }
        }
    } catch {
        // If wallet fetch fails, continue with active tournaments only
    }

    // ── Step 2: Fetch full details for each tournament ────────────────────────
    const allIds = Array.from(knownIds);

    const detailPromises = allIds.map(async (tournamentId): Promise<EnrichedMatch | null> => {
        try {
            const detail = await getTournamentById(tournamentId);
            const fullData = detail.data as any;

            // Verify user is actually a participant in this tournament
            const participants = fullData.participants || [];
            const isParticipant = participants.some(
                (p: any) =>
                    (p.userId === userId || p.userId?.toString() === userId) &&
                    (p.status === 'registered' || p.status === 'confirmed')
            );

            if (!isParticipant) return null; // not actually in this tournament

            return buildEnrichedMatch(fullData, userId);
        } catch {
            // If fetching details fails for one tournament, skip it
            return null;
        }
    });

    const results = await Promise.all(detailPromises);
    return results.filter((r): r is EnrichedMatch => r !== null);
};

export default {
    getPublicTournaments,
    getTournamentById,
    registerForTournament,
    getMyRegistrationStatus,
    getRoomDetails,
    getMyTournaments,
    getMyMatchHistory,
};
