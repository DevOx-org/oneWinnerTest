import React, { useState, useEffect } from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import {
    getGlobalLeaderboard,
    getGameLeaderboard,
} from '../services/leaderboardService';
import type { LeaderboardEntry, LeaderboardPeriod } from '../services/leaderboardService';

type GameTab = 'Global' | 'PUBG' | 'COD' | 'Free Fire';

const gameMapping: Record<GameTab, string | null> = {
    Global: null,
    PUBG: 'PUBG Mobile',
    COD: 'Call of Duty Mobile',
    'Free Fire': 'Free Fire',
};

const LeaderboardPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<GameTab>('Global');
    const [period, setPeriod] = useState<LeaderboardPeriod>('all');
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const tabs: GameTab[] = ['Global', 'PUBG', 'COD', 'Free Fire'];
    const periods: { label: string; value: LeaderboardPeriod }[] = [
        { label: 'All Time', value: 'all' },
        { label: 'Monthly', value: 'monthly' },
        { label: 'Weekly', value: 'weekly' },
    ];

    useEffect(() => {
        fetchLeaderboard();
    }, [activeTab, period]);

    const fetchLeaderboard = async () => {
        try {
            setLoading(true);
            setError(null);
            const game = gameMapping[activeTab];
            const response = game
                ? await getGameLeaderboard(game, period)
                : await getGlobalLeaderboard(period);
            setEntries(response.data);
        } catch (err: any) {
            console.error('Leaderboard error:', err);
            setError(err.message || 'Failed to load leaderboard');
        } finally {
            setLoading(false);
        }
    };

    const tabAccents: Record<GameTab, string> = {
        Global: '#FF8C00',
        PUBG: '#F59E0B',
        COD: '#6366F1',
        'Free Fire': '#EF4444',
    };

    const glassStyle: React.CSSProperties = {
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(20px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)',
    };

    /** Medal colors for top 3 */
    const getMedalStyle = (rank: number) => {
        switch (rank) {
            case 1:
                return {
                    bg: 'rgba(255,215,0,0.12)',
                    border: 'rgba(255,215,0,0.3)',
                    text: '#FFD700',
                    glow: '0 0 20px rgba(255,215,0,0.2)',
                    emoji: '🥇',
                };
            case 2:
                return {
                    bg: 'rgba(192,192,192,0.10)',
                    border: 'rgba(192,192,192,0.25)',
                    text: '#C0C0C0',
                    glow: '0 0 16px rgba(192,192,192,0.15)',
                    emoji: '🥈',
                };
            case 3:
                return {
                    bg: 'rgba(205,127,50,0.10)',
                    border: 'rgba(205,127,50,0.25)',
                    text: '#CD7F32',
                    glow: '0 0 16px rgba(205,127,50,0.15)',
                    emoji: '🥉',
                };
            default:
                return null;
        }
    };

    /** Generate initials from name */
    const getInitials = (name: string) => {
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.slice(0, 2).toUpperCase();
    };

    return (
        <div className="min-h-screen bg-dark-900 overflow-x-hidden">
            <Header />

            {/* Page Header */}
            <section
                className="relative pt-24 sm:pt-28 md:pt-32 pb-8 sm:pb-12 px-4 sm:px-6"
                style={{ background: 'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 100%)' }}
            >
                <div className="container mx-auto max-w-7xl">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6">
                        <div>
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-2">
                                <span className="text-white">Leader</span>
                                <span
                                    style={{
                                        background: 'linear-gradient(135deg, #FF8C00, #FF5500)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}
                                >
                                    board
                                </span>
                            </h1>
                            <p className="text-gray-500 text-sm sm:text-base">
                                Top players ranked by earnings across all tournaments
                            </p>
                        </div>

                        {/* Period Toggle */}
                        <div className="flex rounded-xl overflow-hidden" style={glassStyle}>
                            {periods.map((p) => (
                                <button
                                    key={p.value}
                                    onClick={() => setPeriod(p.value)}
                                    className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-300"
                                    style={{
                                        color: period === p.value ? '#fff' : 'rgba(255,255,255,0.35)',
                                        background:
                                            period === p.value
                                                ? 'rgba(255,140,0,0.15)'
                                                : 'transparent',
                                    }}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Tab Bar */}
            <section
                className="relative"
                style={{
                    background: 'rgba(0, 0, 0, 0.98)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
            >
                <div
                    className="w-full h-px"
                    style={{
                        background:
                            'linear-gradient(90deg, rgba(255,140,0,0.6), rgba(255,80,0,0.2), transparent)',
                    }}
                />

                <div className="container mx-auto max-w-7xl px-4 sm:px-6">
                    <div className="flex items-center">
                        <div
                            className="hidden md:flex items-center pr-5 mr-1 flex-shrink-0"
                            style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
                        >
                            <span
                                className="text-xs font-bold tracking-widest uppercase"
                                style={{ color: 'rgba(255,140,0,0.55)', letterSpacing: '0.15em' }}
                            >
                                Rankings
                            </span>
                        </div>

                        <div className="flex overflow-x-auto scrollbar-hide flex-1">
                            {tabs.map((tab) => {
                                const isActive = activeTab === tab;
                                const accent = tabAccents[tab];
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className="relative flex items-center gap-2 whitespace-nowrap font-semibold text-xs sm:text-sm transition-all duration-300 group flex-shrink-0"
                                        style={{
                                            padding: '13px 16px',
                                            color: isActive ? '#fff' : 'rgba(255,255,255,0.38)',
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            outline: 'none',
                                        }}
                                    >
                                        <span
                                            className="absolute inset-0 transition-opacity duration-300"
                                            style={{
                                                background: `linear-gradient(180deg, ${accent}0a 0%, transparent 100%)`,
                                                opacity: isActive ? 1 : 0,
                                            }}
                                        />
                                        <span
                                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                            style={{ background: 'rgba(255,255,255,0.025)' }}
                                        />
                                        <span
                                            className="relative z-10 w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-300"
                                            style={{
                                                background: accent,
                                                boxShadow: isActive ? `0 0 7px ${accent}cc` : 'none',
                                                opacity: isActive ? 1 : 0.28,
                                                transform: isActive ? 'scale(1.3)' : 'scale(1)',
                                            }}
                                        />
                                        <span className="relative z-10 transition-colors duration-200 group-hover:text-white">
                                            {tab}
                                        </span>
                                        <span
                                            className="absolute bottom-0 left-2 right-2 h-0.5 rounded-t-full transition-all duration-350"
                                            style={{
                                                background: accent,
                                                boxShadow: isActive ? `0 0 12px ${accent}bb` : 'none',
                                                opacity: isActive ? 1 : 0,
                                                transform: isActive ? 'scaleX(1)' : 'scaleX(0.3)',
                                                transformOrigin: 'center',
                                            }}
                                        />
                                        {!isActive && (
                                            <span
                                                className="absolute bottom-0 left-2 right-2 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                                style={{ background: 'rgba(255,255,255,0.08)' }}
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* Leaderboard Content */}
            <section className="py-6 sm:py-8 md:py-12 px-3 sm:px-4 md:px-6">
                <div className="container mx-auto max-w-4xl">
                    {loading ? (
                        <div className="text-center py-20">
                            <div className="inline-block w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mb-4" />
                            <p className="text-gray-500 text-sm font-medium tracking-wide">
                                Loading leaderboard…
                            </p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-16 rounded-xl" style={glassStyle}>
                            <svg
                                className="mx-auto w-10 h-10 mb-3 opacity-40"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="1.5"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <h3 className="text-white text-lg font-bold mb-1">Failed to Load</h3>
                            <p className="text-gray-500 text-sm mb-6">{error}</p>
                            <button
                                onClick={fetchLeaderboard}
                                className="px-5 py-2 rounded-lg font-semibold text-sm text-white"
                                style={{ background: 'linear-gradient(135deg, #FF8C00, #FF5500)' }}
                            >
                                Retry
                            </button>
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="text-center py-16 rounded-xl" style={glassStyle}>
                            <svg
                                className="mx-auto w-10 h-10 mb-3 opacity-40"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="1.5"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M16 11V3m0 0L12 7m4-4l4 4M8 13v8m0 0l4-4m-4 4l-4-4"
                                />
                            </svg>
                            <h3 className="text-white text-lg font-bold mb-1">No Data Yet</h3>
                            <p className="text-gray-500 text-sm">
                                No players have earned winnings{' '}
                                {period !== 'all' && `in the last ${period === 'weekly' ? '7 days' : '30 days'}`}
                                {activeTab !== 'Global' && ` in ${activeTab}`}.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2 sm:space-y-3">
                            {/* Top 3 Podium — premium cards */}
                            {entries.slice(0, 3).length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-6 sm:mb-10">
                                    {/* Reorder for desktop: 2nd, 1st, 3rd */}
                                    {[entries[1], entries[0], entries[2]]
                                        .filter(Boolean)
                                        .map((entry) => {
                                            const medal = getMedalStyle(entry.rank)!;
                                            const isFirst = entry.rank === 1;
                                            return (
                                                <div
                                                    key={entry.userId}
                                                    className={`group relative text-center transition-all duration-500 hover:-translate-y-1 ${isFirst ? 'sm:-mt-4 sm:mb-4 sm:scale-[1.06]' : ''}`}
                                                >
                                                    {/* Animated gradient border */}
                                                    <div
                                                        className="absolute -inset-[1px] rounded-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                                                        style={{
                                                            background: `linear-gradient(135deg, ${medal.text}, transparent 40%, transparent 60%, ${medal.text})`,
                                                        }}
                                                    />

                                                    {/* Card body */}
                                                    <div
                                                        className="relative rounded-2xl p-5 sm:p-6 overflow-hidden"
                                                        style={{
                                                            background: `radial-gradient(ellipse at top, ${medal.text}12 0%, rgba(8,8,16,0.95) 70%)`,
                                                        }}
                                                    >
                                                        {/* Top glow */}
                                                        <div
                                                            className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 rounded-full blur-2xl opacity-40 group-hover:opacity-70 transition-opacity duration-500"
                                                            style={{ background: medal.text }}
                                                        />

                                                        {/* Shimmer on hover */}
                                                        <div
                                                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                                                            style={{
                                                                background: `linear-gradient(45deg, transparent 30%, ${medal.text}08 50%, transparent 70%)`,
                                                            }}
                                                        />

                                                        {/* Rank badge */}
                                                        <div className="relative z-10 mb-4">
                                                            <div
                                                                className={`inline-flex items-center justify-center rounded-full font-black transition-transform duration-300 group-hover:scale-110 ${isFirst ? 'w-12 h-12 text-2xl' : 'w-10 h-10 text-xl'}`}
                                                                style={{
                                                                    background: `linear-gradient(135deg, ${medal.text}30, ${medal.text}10)`,
                                                                    border: `2px solid ${medal.border}`,
                                                                    color: medal.text,
                                                                    boxShadow: `0 0 20px ${medal.text}25`,
                                                                }}
                                                            >
                                                                {entry.rank}
                                                            </div>
                                                        </div>

                                                        {/* Avatar with gradient ring */}
                                                        <div className="relative z-10 mx-auto mb-4">
                                                            <div
                                                                className="absolute -inset-[2px] rounded-full opacity-70 group-hover:opacity-100 transition-opacity duration-500"
                                                                style={{
                                                                    background: `conic-gradient(${medal.text}, transparent, ${medal.text})`,
                                                                }}
                                                            />
                                                            <div
                                                                className={`relative rounded-full flex items-center justify-center font-black mx-auto ${isFirst ? 'w-20 h-20 text-2xl' : 'w-16 h-16 text-xl'}`}
                                                                style={{
                                                                    background: `linear-gradient(160deg, ${medal.text}20, rgba(8,8,16,0.9))`,
                                                                    color: medal.text,
                                                                }}
                                                            >
                                                                {getInitials(entry.name)}
                                                            </div>
                                                        </div>

                                                        {/* Name */}
                                                        <h3
                                                            className={`relative z-10 font-bold truncate mb-2 ${isFirst ? 'text-base sm:text-lg' : 'text-sm sm:text-base'}`}
                                                            style={{ color: '#fff' }}
                                                        >
                                                            {entry.name}
                                                        </h3>

                                                        {/* Earnings */}
                                                        <p
                                                            className={`relative z-10 font-black ${isFirst ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'}`}
                                                            style={{
                                                                background: `linear-gradient(135deg, ${medal.text}, ${medal.text}cc)`,
                                                                WebkitBackgroundClip: 'text',
                                                                WebkitTextFillColor: 'transparent',
                                                            }}
                                                        >
                                                            ₹{entry.earnings.toLocaleString()}
                                                        </p>

                                                        {/* Stats row */}
                                                        <div className="relative z-10 flex items-center justify-center gap-3 mt-3">
                                                            <span
                                                                className="text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-full"
                                                                style={{
                                                                    background: `${medal.text}12`,
                                                                    color: `${medal.text}cc`,
                                                                    border: `1px solid ${medal.text}20`,
                                                                }}
                                                            >
                                                                {entry.wins} win{entry.wins !== 1 ? 's' : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}

                            {/* Remaining entries — enhanced list style */}
                            {entries.slice(3).map((entry) => (
                                <div
                                    key={entry.userId}
                                    className="group relative rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5"
                                    style={{
                                        background: 'rgba(8,8,16,0.7)',
                                        backdropFilter: 'blur(16px)',
                                        WebkitBackdropFilter: 'blur(16px)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                                    }}
                                >
                                    {/* Left accent */}
                                    <div
                                        className="absolute left-0 top-0 bottom-0 w-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                        style={{ background: 'linear-gradient(180deg, #FF8C00, #FF5500)' }}
                                    />

                                    {/* Hover glow */}
                                    <div
                                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                        style={{ background: 'linear-gradient(90deg, rgba(255,140,0,0.03), transparent 40%)' }}
                                    />

                                    <div className="flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 relative z-10">
                                        {/* Rank badge */}
                                        <div
                                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-xs sm:text-sm font-black transition-all duration-300 group-hover:scale-105"
                                            style={{
                                                background: 'rgba(255,255,255,0.04)',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                color: 'rgba(255,255,255,0.35)',
                                            }}
                                        >
                                            {entry.rank}
                                        </div>

                                        {/* Avatar */}
                                        <div
                                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 transition-all duration-300 group-hover:shadow-lg"
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(255,140,0,0.12), rgba(255,80,0,0.06))',
                                                border: '1px solid rgba(255,140,0,0.18)',
                                                color: '#FF8C00',
                                            }}
                                        >
                                            {getInitials(entry.name)}
                                        </div>

                                        {/* Name */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-white text-sm font-semibold truncate group-hover:text-orange-400 transition-colors duration-300">
                                                {entry.name}
                                            </h4>
                                            <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5">
                                                {entry.wins} win{entry.wins !== 1 ? 's' : ''}
                                                {entry.matches !== undefined && ` · ${entry.matches} matches`}
                                            </p>
                                        </div>

                                        {/* Earnings */}
                                        <div className="text-right flex-shrink-0">
                                            <p
                                                className="text-sm sm:text-base font-bold"
                                                style={{ color: '#22C55E' }}
                                            >
                                                ₹{entry.earnings.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default LeaderboardPage;
