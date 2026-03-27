export interface Tournament {
    id: string;
    game: 'PUBG' | 'Free Fire' | 'Call of Duty' | 'Valorant';
    title: string;
    date: string;
    time: string;
    prizePool: number;
    entryFee: number;
    maxPlayers: number;
    currentPlayers: number;
    status: 'OPEN' | 'REGISTRATION CLOSED' | 'LIVE' | 'COMPLETED';
    image: string;
    /** Server-confirmed registration status for the current user */
    isRegistered?: boolean;
    /** Raw ISO-8601 start date — used for client-side countdown math */
    startDateISO?: string;
    /** Raw ISO-8601 end date — used by useMatchStatus hook */
    endDateISO?: string;
    /** Server-computed: maxParticipants minus active count */
    spotsLeft?: number;
    /** Server-computed: true only when open, deadline valid, spots available, not registered */
    canJoin?: boolean;
    /** Server-computed live state: 'OPEN' | 'REGISTRATION_CLOSED' | 'LIVE' | 'COMPLETED' */
    tournamentState?: 'OPEN' | 'REGISTRATION_CLOSED' | 'LIVE' | 'COMPLETED';
    /** Server-computed: true only when UPCOMING + before registration deadline */
    registrationOpen?: boolean;
}
