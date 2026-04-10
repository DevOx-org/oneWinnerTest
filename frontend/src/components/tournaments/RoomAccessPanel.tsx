import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getRoomDetails } from '../../services/tournamentService';
import type { RoomDetailsResponse } from '../../services/tournamentService';

interface RoomAccessPanelProps {
    tournamentId: string;
    onFlipBack: () => void;
}

/** Format remaining milliseconds as HH:MM:SS */
function formatCountdown(ms: number): string {
    if (ms <= 0) return '00:00:00';
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

const CopyButton: React.FC<{ value: string }> = ({ value }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback for older browsers
            const el = document.createElement('textarea');
            el.value = value;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-all duration-200"
            title="Copy to clipboard"
        >
            {copied ? (
                <>
                    <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-400">Copied</span>
                </>
            ) : (
                <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                </>
            )}
        </button>
    );
};

const RoomAccessPanel: React.FC<RoomAccessPanelProps> = ({ tournamentId, onFlipBack }) => {
    const [roomData, setRoomData] = useState<RoomDetailsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [countdown, setCountdown] = useState<string>('--:--:--');

    // Use a ref for the interval so we can clear it cleanly
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // Guard against concurrent fetches (dedup 429 avoidance)
    const fetchingRef = useRef(false);

    const fetchRoomDetails = useCallback(async () => {
        // Skip if a fetch is already in-flight
        if (fetchingRef.current) return;
        fetchingRef.current = true;
        try {
            setError(null);
            const data = await getRoomDetails(tournamentId);
            setRoomData(data);
        } catch (err: any) {
            const status = err.response?.status;
            // 429 = dedup guard — silently retry after the lockout window
            if (status === 429) {
                const retryAfter = (err.response?.data?.retryAfter || 2) * 1000;
                setTimeout(() => {
                    fetchingRef.current = false;
                    fetchRoomDetails();
                }, retryAfter);
                return; // don't show error to user
            }
            setError(err.response?.data?.message || 'Failed to load room details.');
        } finally {
            fetchingRef.current = false;
            setLoading(false);
        }
    }, [tournamentId]);

    // Start countdown — always computes from wall clock (no drift)
    const startCountdown = useCallback((releaseTimeISO: string) => {
        if (intervalRef.current) clearInterval(intervalRef.current);

        const tick = () => {
            const remaining = new Date(releaseTimeISO).getTime() - Date.now();
            if (remaining <= 0) {
                setCountdown('00:00:00');
                if (intervalRef.current) clearInterval(intervalRef.current);
                // Re-fetch to get actual credentials
                fetchRoomDetails();
            } else {
                setCountdown(formatCountdown(remaining));
            }
        };

        tick(); // immediate first tick
        intervalRef.current = setInterval(tick, 1000);
    }, [fetchRoomDetails]);

    // Re-sync on tab visible (handles tab-inactive drift)
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'visible' && roomData?.releaseTime && !roomData.roomVisible) {
                startCountdown(roomData.releaseTime);
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [roomData, startCountdown]);

    // Initial fetch when panel mounts
    useEffect(() => {
        fetchRoomDetails();
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchRoomDetails]);

    // Start / restart countdown whenever roomData changes and room is not yet visible
    useEffect(() => {
        if (roomData && !roomData.roomVisible && roomData.releaseTime) {
            startCountdown(roomData.releaseTime);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [roomData, startCountdown]);

    return (
        <div className="h-full flex flex-col bg-dark-800/95 rounded-2xl overflow-hidden border border-white/10">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-white font-bold text-sm">Match Access</span>
                </div>
                <button
                    onClick={onFlipBack}
                    className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs font-medium transition-colors px-2 py-1 rounded-lg hover:bg-white/10"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 p-5 flex flex-col justify-center">
                {loading ? (
                    <div className="text-center space-y-3">
                        <div className="inline-block w-8 h-8 border-2 border-primary-orange border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-400 text-sm">Loading credentials...</p>
                    </div>
                ) : error ? (
                    <div className="text-center space-y-3 animate-fadeInUp">
                        <div className="text-3xl">⚠️</div>
                        <p className="text-red-400 text-sm">{error}</p>
                        <button
                            onClick={fetchRoomDetails}
                            className="text-xs text-primary-orange underline hover:no-underline"
                        >
                            Retry
                        </button>
                    </div>
                ) : roomData?.roomVisible ? (
                    /* ── Credentials unlocked ── */
                    <div className="space-y-4 animate-fadeInUp">
                        <div className="text-center mb-5">
                            <div className="inline-flex items-center gap-2 bg-green-500/15 border border-green-400/30 px-4 py-2 rounded-full">
                                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                </svg>
                                <span className="text-green-400 text-xs font-bold">Credentials Released</span>
                            </div>
                        </div>

                        {/* Match Schedule */}
                        {(roomData.assignedSlot || roomData.matchTime) && (
                            <div className="bg-primary-orange/10 border border-primary-orange/25 rounded-xl p-4 flex items-center gap-3">
                                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary-orange/20 flex items-center justify-center">
                                    <svg className="w-4.5 h-4.5 text-primary-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    {roomData.assignedSlot && (
                                        <p className="text-primary-orange text-xs font-bold tracking-wide">
                                            Slot-{roomData.assignedSlot}
                                        </p>
                                    )}
                                    {roomData.matchTime && (
                                        <p className="text-white/80 text-xs mt-0.5">
                                            {new Date(roomData.matchTime).toLocaleString(undefined, {
                                                weekday: 'short',
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Room ID */}
                        <div className="bg-dark-700/60 border border-white/10 rounded-xl p-4">
                            <p className="text-gray-400 text-xs mb-2 font-medium">Room ID</p>
                            <div className="flex items-center justify-between gap-3">
                                <code className="text-white font-bold text-sm tracking-widest flex-1 truncate">
                                    {roomData.roomId}
                                </code>
                                <CopyButton value={roomData.roomId!} />
                            </div>
                        </div>

                        {/* Room Password */}
                        <div className="bg-dark-700/60 border border-white/10 rounded-xl p-4">
                            <p className="text-gray-400 text-xs mb-2 font-medium">Room Password</p>
                            <div className="flex items-center justify-between gap-3">
                                <code className="text-white font-bold text-sm tracking-widest flex-1 truncate">
                                    {roomData.roomPassword}
                                </code>
                                <CopyButton value={roomData.roomPassword!} />
                            </div>
                        </div>

                        <p className="text-gray-500 text-xs text-center pt-1">
                            🔒 Do not share these credentials publicly.
                        </p>
                    </div>
                ) : (
                    /* ── Countdown locked ── */
                    <div className="space-y-5 text-center animate-fadeInUp">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-dark-700/80 border border-white/10 mx-auto">
                            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zM10 9V7a2 2 0 114 0v2m-4 0h4" />
                            </svg>
                        </div>

                        <div>
                            <p className="text-gray-400 text-xs font-medium mb-3">
                                Credentials release in
                            </p>
                            {/* Countdown display */}
                            <div className="inline-flex items-center gap-1 bg-dark-700/60 border border-primary-orange/30 rounded-2xl px-6 py-3">
                                {countdown.split(':').map((segment, i) => (
                                    <React.Fragment key={i}>
                                        {i > 0 && (
                                            <span className="text-primary-orange/60 font-bold text-xl mx-0.5">:</span>
                                        )}
                                        <div className="flex flex-col items-center min-w-[2rem]">
                                            <span className="text-primary-orange font-black text-2xl tabular-nums leading-none">
                                                {segment}
                                            </span>
                                            <span className="text-gray-600 text-[9px] mt-0.5">
                                                {['HRS', 'MIN', 'SEC'][i]}
                                            </span>
                                        </div>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>

                        {/* Match Schedule (visible even before credentials release) */}
                        {(roomData?.assignedSlot || roomData?.matchTime) && (
                            <div className="bg-primary-orange/10 border border-primary-orange/25 rounded-xl p-3.5 mx-2 flex items-center gap-3 text-left">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-orange/20 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-primary-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    {roomData.assignedSlot && (
                                        <p className="text-primary-orange text-xs font-bold tracking-wide">
                                            Slot-{roomData.assignedSlot}
                                        </p>
                                    )}
                                    {roomData.matchTime && (
                                        <p className="text-white/80 text-xs mt-0.5">
                                            {new Date(roomData.matchTime).toLocaleString(undefined, {
                                                weekday: 'short',
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="bg-dark-700/40 border border-white/5 rounded-xl p-4 mx-2">
                            <p className="text-gray-400 text-xs leading-relaxed">
                                🔐 Room ID and Password will be provided<br />
                                <span className="text-white font-semibold">30 minutes before match start.</span>
                            </p>
                            {roomData?.message && (
                                <p className="text-amber-400 text-xs mt-2">{roomData.message}</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoomAccessPanel;
