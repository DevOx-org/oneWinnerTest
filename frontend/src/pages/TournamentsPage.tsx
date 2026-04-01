import React, { useState, useEffect } from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import SEOHead from '../components/seo/SEOHead';
import TournamentCard from '../components/tournaments/TournamentCard';
import { getPublicTournaments } from '../services/tournamentService';
import type { PublicTournament } from '../services/tournamentService';
import type { Tournament } from '../data/tournamentData';

type GameFilter = 'All Games' | 'PUBG' | 'Free Fire' | 'Call of Duty' | 'Valorant';

const TournamentsPage: React.FC = () => {
    const [activeFilter, setActiveFilter] = useState<GameFilter>('All Games');
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const filters: GameFilter[] = ['All Games', 'PUBG', 'Free Fire', 'Call of Duty', 'Valorant'];

    // Fetch tournaments from API
    useEffect(() => {
        fetchTournaments();
    }, []);

    const fetchTournaments = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getPublicTournaments({ limit: 50 });

            // isRegistered is now aggregated server-side in a single query.
            // No per-card status calls needed — N+1 eliminated.
            const mappedTournaments: Tournament[] = response.data.map(mapBackendToFrontend);
            setTournaments(mappedTournaments);
        } catch (err: any) {
            console.error('Error fetching tournaments:', err);
            setError(err.message || 'Failed to load tournaments');
        } finally {
            setLoading(false);
        }
    };

    // Map backend tournament data to frontend format
    const mapBackendToFrontend = (backend: PublicTournament): Tournament => {
        const startDate = new Date(backend.startDate);
        const endDate = new Date(backend.endDate);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Determine date display
        let dateDisplay = 'Today';
        if (startDate.toDateString() === tomorrow.toDateString()) {
            dateDisplay = 'Tomorrow';
        } else if (startDate.toDateString() !== today.toDateString()) {
            dateDisplay = startDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        }

        // Format time
        const timeDisplay = `${startDate.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${endDate.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}`;

        // Map game name
        let gameDisplay: 'PUBG' | 'Free Fire' | 'Call of Duty' | 'Valorant' = 'PUBG';
        if (backend.game.includes('PUBG')) gameDisplay = 'PUBG';
        else if (backend.game.includes('Free Fire')) gameDisplay = 'Free Fire';
        else if (backend.game.includes('Call of Duty')) gameDisplay = 'Call of Duty';
        else if (backend.game.includes('Valorant')) gameDisplay = 'Valorant';

        return {
            id: backend._id,
            game: gameDisplay,
            title: backend.title,
            date: dateDisplay,
            time: timeDisplay,
            prizePool: backend.prizePool,
            entryFee: backend.entryFee,
            maxPlayers: backend.maxParticipants,
            // currentPlayers comes from the server as the accurate active count
            currentPlayers: backend.currentPlayers ?? 0,
            status: backend.tournamentState === 'LIVE' ? 'LIVE'
                : backend.tournamentState === 'COMPLETED' ? 'COMPLETED'
                    : backend.tournamentState === 'REGISTRATION_CLOSED' ? 'REGISTRATION CLOSED'
                        : 'OPEN',
            image: backend.bannerImage || '/images/tournaments/default.jpg',
            startDateISO: backend.startDate,
            endDateISO: backend.endDate,
            // All flags are server-computed — frontend never decides these
            isRegistered: backend.isRegistered,
            spotsLeft: backend.spotsLeft,
            canJoin: backend.canJoin,
            tournamentState: backend.tournamentState,
            registrationOpen: backend.registrationOpen,
        };
    };

    const filteredTournaments = activeFilter === 'All Games'
        ? tournaments
        : tournaments.filter(t => t.game === activeFilter);



    /** Glassmorphic container base style — reused across sections */
    const glassStyle: React.CSSProperties = {
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(20px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)',
    };

    return (
        <div className="min-h-screen bg-dark-900 overflow-x-hidden">
            <SEOHead
                title="Live Tournaments — PUBG, Free Fire, Valorant & COD"
                description="Browse and join live esports tournaments on BattleXGround. Compete in daily PUBG, Free Fire, Valorant & COD matches with real cash prize pools. Register now!"
                path="/tournaments"
            />
            <Header />

            {/* Page Header — matches Dashboard header style */}
            <section
                className="relative pt-24 sm:pt-28 md:pt-32 pb-8 sm:pb-12 px-4 sm:px-6"
                style={{ background: 'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 100%)' }}
            >
                <div className="container mx-auto max-w-7xl">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6">
                        {/* Title */}
                        <div>
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-2">
                                <span className="text-white">Live </span>
                                <span style={{ background: 'linear-gradient(135deg, #FF8C00, #FF5500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Tournaments</span>
                            </h1>
                            <p className="text-gray-500 text-sm sm:text-base">
                                Join exciting tournaments and compete with players from across India
                            </p>
                        </div>

                        {/* Quick Stats — glassmorphic badges */}
                        <div className="flex w-full md:w-auto justify-center md:justify-end gap-3 sm:gap-4 mt-6 md:mt-0">
                            <div className="flex flex-col items-center justify-center flex-1 md:flex-none rounded-xl px-4 sm:px-6 py-3 min-w-[100px]" style={glassStyle}>
                                <p className="text-2xl sm:text-3xl font-black" style={{ color: '#FF8C00' }}>
                                    {tournaments.length}
                                </p>
                                <p className="text-gray-500 text-xs mt-1 whitespace-nowrap uppercase tracking-wider font-semibold">Active</p>
                            </div>
                            <div className="flex flex-col items-center justify-center flex-1 md:flex-none rounded-xl px-4 sm:px-6 py-3 min-w-[100px]" style={glassStyle}>
                                <p className="text-2xl sm:text-3xl font-black" style={{ color: '#22C55E' }}>
                                    {tournaments.filter(t => t.status === 'LIVE').length}
                                </p>
                                <p className="text-gray-500 text-xs mt-1 whitespace-nowrap uppercase tracking-wider font-semibold">Live Now</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Game Category Nav Bar — matches Dashboard tab bar style */}
            <section
                className="relative"
                style={{
                    background: 'rgba(0, 0, 0, 0.98)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
            >
                {/* Top accent line */}
                <div
                    className="w-full h-px"
                    style={{ background: 'linear-gradient(90deg, rgba(255,140,0,0.6), rgba(255,80,0,0.2), transparent)' }}
                />

                <div className="container mx-auto max-w-7xl px-4 sm:px-6">
                    <div className="flex items-center justify-between">

                        {/* Left eyebrow label — desktop only */}
                        <div
                            className="hidden md:flex items-center pr-5 mr-1 flex-shrink-0"
                            style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
                        >
                            <span
                                className="text-xs font-bold tracking-widest uppercase"
                                style={{ color: 'rgba(255,140,0,0.55)', letterSpacing: '0.15em' }}
                            >
                                Games
                            </span>
                        </div>

                        {/* Filter items */}
                        <div className="flex overflow-x-auto scrollbar-hide flex-1">
                            {filters.map((filter) => {
                                const isActive = activeFilter === filter;
                                const accentColors: Record<GameFilter, string> = {
                                    'All Games': '#FF8C00',
                                    'PUBG': '#F59E0B',
                                    'Free Fire': '#EF4444',
                                    'Call of Duty': '#6366F1',
                                    'Valorant': '#EC4899',
                                };
                                const accent = accentColors[filter];
                                return (
                                    <button
                                        key={filter}
                                        onClick={() => setActiveFilter(filter)}
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
                                        {/* Active tinted wash */}
                                        <span
                                            className="absolute inset-0 transition-opacity duration-300"
                                            style={{
                                                background: `linear-gradient(180deg, ${accent}0a 0%, transparent 100%)`,
                                                opacity: isActive ? 1 : 0,
                                            }}
                                        />
                                        {/* Hover wash */}
                                        <span
                                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                            style={{ background: 'rgba(255,255,255,0.025)' }}
                                        />

                                        {/* Accent dot */}
                                        <span
                                            className="relative z-10 w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-300"
                                            style={{
                                                background: accent,
                                                boxShadow: isActive ? `0 0 7px ${accent}cc` : 'none',
                                                opacity: isActive ? 1 : 0.28,
                                                transform: isActive ? 'scale(1.3)' : 'scale(1)',
                                            }}
                                        />


                                        {/* Label */}
                                        <span
                                            className="relative z-10 transition-colors duration-200 group-hover:text-white"
                                            style={{ letterSpacing: '0.01em' }}
                                        >
                                            {filter}
                                        </span>

                                        {/* Active bottom bar */}
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

                                        {/* Hover hairline */}
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

                        {/* Right: live count chip */}
                        <div
                            className="hidden lg:flex items-center flex-shrink-0 ml-3"
                            style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: '16px' }}
                        >
                            <span
                                className="px-2.5 py-1 rounded text-xs font-bold tracking-wide"
                                style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: 'rgba(255,255,255,0.35)',
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {filteredTournaments.length} {activeFilter === 'All Games' ? 'Total' : activeFilter}
                            </span>
                        </div>

                    </div>
                </div>
            </section>

            {/* Tournaments Grid */}
            <section className="py-6 sm:py-8 md:py-12 px-3 sm:px-4 md:px-6">
                <div className="container mx-auto max-w-7xl">
                    {loading ? (
                        <div className="text-center py-20">
                            <div className="inline-block w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mb-4" />
                            <p className="text-gray-500 text-sm font-medium tracking-wide">Loading tournaments…</p>
                        </div>
                    ) : error ? (
                        <div
                            className="text-center py-16 rounded-xl"
                            style={glassStyle}
                        >
                            <svg className="mx-auto w-10 h-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="text-white text-lg font-bold mb-1">Failed to Load Tournaments</h3>
                            <p className="text-gray-500 text-sm mb-6">{error}</p>
                            <button
                                onClick={fetchTournaments}
                                className="px-5 py-2 rounded-lg font-semibold text-sm text-white transition-all duration-200"
                                style={{ background: 'linear-gradient(135deg, #FF8C00, #FF5500)' }}
                            >
                                Retry
                            </button>
                        </div>
                    ) : filteredTournaments.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {filteredTournaments.map((tournament) => (
                                <TournamentCard
                                    key={tournament.id}
                                    tournament={tournament}
                                    onRefresh={fetchTournaments}
                                />
                            ))}
                        </div>
                    ) : (
                        <div
                            className="text-center py-16 rounded-xl"
                            style={glassStyle}
                        >
                            <svg className="mx-auto w-10 h-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <h3 className="text-white text-lg font-bold mb-1">No Tournaments Found</h3>
                            <p className="text-gray-500 text-sm">Check back later for new tournaments in this category.</p>
                        </div>
                    )}
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default TournamentsPage;
