import { useState, useEffect, useCallback } from 'react';
import { getServerTime } from '../services/tournamentService';

export type MatchStatus = 'OPEN' | 'REGISTRATION CLOSED' | 'LIVE' | 'COMPLETED';

interface MatchStatusResult {
    status: MatchStatus;
    buttonText: string;
    buttonDisabled: boolean;
}

/**
 * Computes the 4-state match status from server time.
 *
 * Status logic (all comparisons use server UTC time):
 *   OPEN               → now < startTime - 1 hour
 *   REGISTRATION CLOSED → now >= startTime - 1 hour && now < startTime
 *   LIVE               → now >= startTime && now < endTime
 *   COMPLETED          → now >= endTime
 */
function computeStatus(serverNow: Date, startTime: Date, endTime: Date): MatchStatusResult {
    const regCloseTime = new Date(startTime.getTime() - 60 * 60 * 1000);

    if (serverNow >= endTime) {
        return { status: 'COMPLETED', buttonText: 'Completed', buttonDisabled: true };
    }
    if (serverNow >= startTime) {
        return { status: 'LIVE', buttonText: 'Match Live', buttonDisabled: true };
    }
    if (serverNow >= regCloseTime) {
        return { status: 'REGISTRATION CLOSED', buttonText: 'Registration Closed', buttonDisabled: true };
    }
    return { status: 'OPEN', buttonText: 'Join Now', buttonDisabled: false };
}

/**
 * Custom hook that derives time-based match status using the server clock.
 *
 * - Fetches server time on mount
 * - Recomputes status every 60 seconds by re-fetching server time
 * - Returns { status, buttonText, buttonDisabled }
 *
 * @param startTime  ISO-8601 start date string
 * @param endTime    ISO-8601 end date string
 */
export function useMatchStatus(
    startTime: string | undefined,
    endTime: string | undefined
): MatchStatusResult {
    const [result, setResult] = useState<MatchStatusResult>({
        status: 'OPEN',
        buttonText: 'Join Now',
        buttonDisabled: false,
    });

    const updateStatus = useCallback(async () => {
        if (!startTime || !endTime) return;

        try {
            const serverTime = await getServerTime();
            const serverNow = new Date(serverTime);
            const start = new Date(startTime);
            const end = new Date(endTime);
            setResult(computeStatus(serverNow, start, end));
        } catch {
            // Fallback: use client time if server-time call fails
            const now = new Date();
            const start = new Date(startTime);
            const end = new Date(endTime);
            setResult(computeStatus(now, start, end));
        }
    }, [startTime, endTime]);

    useEffect(() => {
        updateStatus();
        const interval = setInterval(updateStatus, 60_000);
        return () => clearInterval(interval);
    }, [updateStatus]);

    return result;
}

export default useMatchStatus;
