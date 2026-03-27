import api from './api';
import type {
    AnalyticsResponse,
    UserMetricsResponse,
    TournamentMetricsResponse,
    UsersResponse,
    UserDetailResponse,
    TournamentsResponse,
    CreateTournamentRequest,
    UpdateTournamentRequest,
    UpdateUserRequest,
} from '../types/admin.types';

/**
 * Admin Analytics Services
 */
export const getAnalyticsOverview = async (): Promise<AnalyticsResponse> => {
    const response = await api.get<AnalyticsResponse>('/admin/analytics/overview');
    return response.data;
};

export const getUserMetrics = async (days: number = 30): Promise<UserMetricsResponse> => {
    const response = await api.get<UserMetricsResponse>(`/admin/analytics/users?days=${days}`);
    return response.data;
};

export const getTournamentMetrics = async (days: number = 30): Promise<TournamentMetricsResponse> => {
    const response = await api.get<TournamentMetricsResponse>(`/admin/analytics/tournaments?days=${days}`);
    return response.data;
};

/**
 * User Management Services
 */
export const getAllUsers = async (params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
}): Promise<UsersResponse> => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.role) queryParams.append('role', params.role);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.order) queryParams.append('order', params.order);

    const response = await api.get<UsersResponse>(`/admin/users?${queryParams.toString()}`);
    return response.data;
};

export const getUserById = async (userId: string): Promise<UserDetailResponse> => {
    const response = await api.get<UserDetailResponse>(`/admin/users/${userId}`);
    return response.data;
};

export const updateUser = async (userId: string, data: UpdateUserRequest): Promise<{ success: boolean; message: string }> => {
    const response = await api.put(`/admin/users/${userId}`, data);
    return response.data;
};

export const deleteUser = async (userId: string): Promise<{
    success: boolean;
    message: string;
    deletedUserId?: string;
    tournamentsUpdated?: number;
}> => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
};

/**
 * Tournament Management Services
 */
export const getAllTournaments = async (params: {
    page?: number;
    limit?: number;
    status?: string;
    game?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
}): Promise<TournamentsResponse> => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.status) queryParams.append('status', params.status);
    if (params.game) queryParams.append('game', params.game);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.order) queryParams.append('order', params.order);

    const response = await api.get<TournamentsResponse>(`/admin/tournaments?${queryParams.toString()}`);
    return response.data;
};

export const createTournament = async (data: CreateTournamentRequest): Promise<{ success: boolean; message: string; tournament: any }> => {
    const response = await api.post('/admin/tournaments', data);
    return response.data;
};

export const updateTournament = async (
    tournamentId: string,
    data: UpdateTournamentRequest
): Promise<{ success: boolean; message: string; tournament: any }> => {
    const response = await api.put(`/admin/tournaments/${tournamentId}`, data);
    return response.data;
};

export const deleteTournament = async (tournamentId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/admin/tournaments/${tournamentId}`);
    return response.data;
};

export default {
    // Analytics
    getAnalyticsOverview,
    getUserMetrics,
    getTournamentMetrics,
    // Users
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    // Tournaments
    getAllTournaments,
    createTournament,
    updateTournament,
    deleteTournament,
};
