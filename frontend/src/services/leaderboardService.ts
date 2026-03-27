import api from './api';

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    name: string;
    earnings: number;
    wins: number;
    matches?: number;
}

export interface LeaderboardResponse {
    success: boolean;
    period: string;
    game?: string;
    data: LeaderboardEntry[];
}

export type LeaderboardPeriod = 'all' | 'monthly' | 'weekly';

export const getGlobalLeaderboard = async (
    period: LeaderboardPeriod = 'all',
    limit: number = 50
): Promise<LeaderboardResponse> => {
    const response = await api.get('/leaderboard/global', {
        params: { period, limit },
    });
    return response.data;
};

export const getGameLeaderboard = async (
    game: string,
    period: LeaderboardPeriod = 'all',
    limit: number = 50
): Promise<LeaderboardResponse> => {
    const response = await api.get(`/leaderboard/game/${encodeURIComponent(game)}`, {
        params: { period, limit },
    });
    return response.data;
};
