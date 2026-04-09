// Admin-specific type definitions

export type MatchType = 'TDM' | 'Battle Royale - Solo' | 'Battle Royale - Squad';

export interface Analytics {
    totalUsers: number;
    totalTournaments: number;
    activeTournaments: number;
    completedTournaments: number;
    totalRevenue: number;
    newUsersThisMonth: number;
    growthRate: number;
}

export interface UserGrowthData {
    _id: string; // Date string YYYY-MM-DD
    count: number;
}

export interface RoleDistribution {
    _id: string; // Role name
    count: number;
}

export interface UserMetrics {
    userGrowth: UserGrowthData[];
    roleDistribution: RoleDistribution[];
}

export interface TournamentStatusDistribution {
    _id: string; // Status
    count: number;
}

export interface GamePopularity {
    _id: string; // Game name
    count: number;
    totalParticipants: number;
}

export interface TournamentMetrics {
    statusDistribution: TournamentStatusDistribution[];
    gamePopularity: GamePopularity[];
    recentTournaments: Tournament[];
}

export interface Tournament {
    _id: string;
    title: string;
    description: string;
    game: 'PUBG Mobile' | 'Free Fire' | 'Call of Duty Mobile' | 'Valorant' | 'CS:GO' | 'Other';
    platform: 'Mobile' | 'PC' | 'Console' | 'Cross-Platform';
    startDate: string;
    endDate: string;
    registrationDeadline: string;
    maxParticipants: number;
    entryFee: number;
    prizePool: number;
    prizeDistribution?: Record<string, number>;
    rules?: string;
    status: 'draft' | 'upcoming' | 'live' | 'completed' | 'cancelled';
    participants: TournamentParticipant[];
    bannerImage?: string;
    isDeleted: boolean;
    createdBy: string | { _id: string; name: string; email: string };
    updatedBy?: string;
    createdAt: string;
    updatedAt: string;
    participantCount?: number;
    availableSlots?: number;
    matchType?: MatchType | null;
}

export interface TournamentParticipant {
    userId: string;
    registeredAt: string;
    status: 'registered' | 'confirmed' | 'cancelled';
    rank?: number;
    score?: number;
}

export interface AdminUser {
    _id: string;
    name: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    gameId?: string;
    location?: string;
    bio?: string;
    role: 'user' | 'admin' | 'tester';
    isDeleted?: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

export interface AnalyticsResponse {
    success: boolean;
    analytics: Analytics;
}

export interface UserMetricsResponse {
    success: boolean;
    metrics: UserMetrics;
}

export interface TournamentMetricsResponse {
    success: boolean;
    metrics: TournamentMetrics;
}

export interface UsersResponse {
    success: boolean;
    users: AdminUser[];
    pagination: Pagination;
}

export interface UserDetailResponse {
    success: boolean;
    user: AdminUser;
    tournaments: Tournament[];
}

export interface TournamentsResponse {
    success: boolean;
    tournaments: Tournament[];
    pagination: Pagination;
}

export interface CreateTournamentRequest {
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
    prizeDistribution?: Record<string, number>;
    rules?: string;
    status?: string;
    bannerImage?: string;
    matchType?: string;
}

export interface UpdateTournamentRequest extends Partial<CreateTournamentRequest> { }

export interface UpdateUserRequest {
    role?: string;
    name?: string;
    phone?: string;
    gameId?: string;
    location?: string;
    bio?: string;
}
