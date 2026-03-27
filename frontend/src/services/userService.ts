import api from './api';
import type { User } from '../types/auth.types';

export interface UpdateProfileData {
    name?: string;
    phone?: string;
    gameId?: string;
    location?: string;
    bio?: string;
}

export interface ProfileResponse {
    success: boolean;
    message?: string;
    user: User;
}

/** Shape of a single match history item returned by GET /api/user/match-history */
export interface MatchHistoryItem {
    tournamentId: string;
    title: string;
    game: string;
    platform: string;
    startDate: string;
    endDate: string;
    entryFee: number;
    prizePool: number;
    maxParticipants: number;
    status: string;
    /** Server-computed: "upcoming" | "live" | "won" | "lost" | "pending" */
    userStatus: string;
    prizeWon: number;
    rank: number | null;
    isWinner: boolean;
    registeredAt: string | null;
}

export interface MatchHistoryResponse {
    success: boolean;
    matches: MatchHistoryItem[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

/**
 * Get current user profile
 */
export const getProfile = async (): Promise<ProfileResponse> => {
    const response = await api.get<ProfileResponse>('/user/profile');
    return response.data;
};

/**
 * Update user profile
 */
export const updateProfile = async (data: UpdateProfileData): Promise<ProfileResponse> => {
    const response = await api.put<ProfileResponse>('/user/profile', data);
    return response.data;
};

/**
 * Get this user's lifetime tournament participation history.
 * Single backend query — replaces the old N+1 client-side approach.
 */
export const getMatchHistory = async (
    page = 1,
    limit = 50
): Promise<MatchHistoryResponse> => {
    const response = await api.get<MatchHistoryResponse>(
        `/user/match-history?page=${page}&limit=${limit}`
    );
    return response.data;
};

export default {
    getProfile,
    updateProfile,
    getMatchHistory,
};

