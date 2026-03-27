export interface UserStats {
    totalEarnings: number;
    matchesWon: number;
    totalTournaments: number;
    winRate: number;
    tournamentsGrowth: number;
    matchesGrowth: number;
    winRateGrowth: number;
    earningsGrowth: number;
}

export interface RecentMatch {
    id: number;
    game: string;
    gameIcon: string;
    tournamentName: string;
    result: 'won' | 'lost';
    earnings: number;
    date: string;
    time: string;
    rank: number;
    participants: number;
    teamName: string;
    kills: number;
}

export interface UserTournament {
    id: number;
    title: string;
    game: string;
    gameIcon: string;
    status: 'live' | 'upcoming' | 'completed';
    date: string;
    time: string;
    prizePool: number;
    teamName: string;
    teamMembers: string[];
    currentPosition?: number;
    registrationStatus?: 'registered' | 'joined';
    roundInfo?: string;
}

export interface WalletBalance {
    available: number;
    pending: number;
    totalEarnings: number;
    totalWithdrawn: number;
}

export interface Transaction {
    id: number;
    type: 'credit' | 'debit' | 'withdrawal' | 'deposit';
    amount: number;
    description: string;
    date: string;
    time: string;
    status: 'completed' | 'pending' | 'failed';
}
