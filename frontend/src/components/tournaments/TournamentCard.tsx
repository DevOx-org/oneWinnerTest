import React, { useState } from 'react';
import type { Tournament } from '../../data/tournamentData';
import { useMatchStatus } from '../../hooks/useMatchStatus';
import { getGameImage } from '../../utils/gameImages';
import RegistrationModal from './RegistrationModal';
import RoomAccessPanel from './RoomAccessPanel';

interface TournamentCardProps {
    tournament: Tournament;
    onRefresh?: () => void;
}

const TournamentCard: React.FC<TournamentCardProps> = ({ tournament, onRefresh }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false);

    const isRegistered = tournament.isRegistered === true;

    // ── Server-time-driven match status ──────────────────────────────────────
    const { status, buttonText } = useMatchStatus(
        tournament.startDateISO,
        tournament.endDateISO
    );



    // ── Status badge styling ─────────────────────────────────────────────────
    const getStatusStyle = (): { bg: string; text: string; glow: string } => {
        switch (status) {
            case 'OPEN':
                return { bg: 'rgba(34,197,94,0.15)', text: '#22C55E', glow: '0 0 10px rgba(34,197,94,0.3)' };
            case 'REGISTRATION CLOSED':
                return { bg: 'rgba(234,179,8,0.15)', text: '#EAB308', glow: '0 0 10px rgba(234,179,8,0.2)' };
            case 'LIVE':
                return { bg: 'rgba(239,68,68,0.15)', text: '#EF4444', glow: '0 0 10px rgba(239,68,68,0.3)' };
            case 'COMPLETED':
                return { bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.4)', glow: 'none' };
            default:
                return { bg: 'rgba(34,197,94,0.15)', text: '#22C55E', glow: '0 0 10px rgba(34,197,94,0.3)' };
        }
    };

    const statusStyle = getStatusStyle();

    // ── Button styling ───────────────────────────────────────────────────────
    const getActionButton = () => {
        // Already registered → always show "View Details" (flip card)
        if (isRegistered) {
            return (
                <button
                    onClick={() => setIsFlipped(true)}
                    aria-label={`View details for ${tournament.title}`}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm transition-all duration-300 group/btn"
                    style={{
                        background: 'rgba(34,197,94,0.1)',
                        border: '1px solid rgba(34,197,94,0.25)',
                        color: '#22C55E',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(34,197,94,0.18)';
                        e.currentTarget.style.borderColor = 'rgba(34,197,94,0.4)';
                        e.currentTarget.style.boxShadow = '0 0 16px rgba(34,197,94,0.15)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(34,197,94,0.1)';
                        e.currentTarget.style.borderColor = 'rgba(34,197,94,0.25)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                >
                    <svg className="w-4 h-4 group-hover/btn:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    View Details
                </button>
            );
        }

        // Not registered + status is OPEN → Join Now (enabled)
        if (status === 'OPEN') {
            return (
                <button
                    onClick={() => setIsModalOpen(true)}
                    aria-label={`Join tournament ${tournament.title}`}
                    className="w-full py-3 rounded-lg font-semibold text-sm text-white transition-all duration-300"
                    style={{
                        background: 'linear-gradient(135deg, #FF8C00, #FF5500)',
                        boxShadow: '0 0 14px rgba(255,140,0,0.25)',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 0 24px rgba(255,140,0,0.4)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 0 14px rgba(255,140,0,0.25)';
                        e.currentTarget.style.transform = 'none';
                    }}
                >
                    {buttonText}
                </button>
            );
        }

        // Not registered + any other status → disabled button
        return (
            <button
                disabled
                aria-label={`${buttonText} - ${tournament.title}`}
                className="w-full py-3 rounded-lg font-semibold text-sm opacity-50 cursor-not-allowed"
                style={{
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.4)',
                    border: '1px solid rgba(255,255,255,0.06)',
                }}
            >
                {buttonText}
            </button>
        );
    };

    // Estimated card height so both faces can be absolutely positioned without layout shift
    const CARD_MIN_HEIGHT = '420px';

    /** Progress bar percentage */
    const playerPercentage = Math.min(100, (tournament.currentPlayers / tournament.maxPlayers) * 100);

    return (
        <>
            <div className="flip-card w-full" style={{ minHeight: CARD_MIN_HEIGHT }}>
                <div
                    className={`flip-card-inner w-full ${isFlipped ? 'flipped' : ''}`}
                    style={{ minHeight: CARD_MIN_HEIGHT }}
                >
                    {/* ── FRONT FACE ── */}
                    <div className="flip-card-front w-full" style={{ minHeight: CARD_MIN_HEIGHT }}>
                        <div
                            className="group relative overflow-hidden rounded-xl transition-all duration-300 hover:-translate-y-1 h-full"
                            style={{
                                background: 'rgba(15,15,25,0.45)',
                                backdropFilter: 'blur(24px) saturate(1.8)',
                                WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(255,255,255,0.02)',
                                minHeight: CARD_MIN_HEIGHT,
                            }}
                        >
                            {/* Top accent glow */}
                            <div
                                className="absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                                style={{ background: `linear-gradient(90deg, transparent, ${statusStyle.text}, transparent)` }}
                            />

                            {/* Image / Icon Area */}
                            <div className="relative h-40 overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
                                {/* Game background image */}
                                <img
                                    src={getGameImage(tournament.game)}
                                    alt={tournament.game}
                                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                {/* Dark overlay for readability */}
                                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 100%)' }} />

                                {/* Game badge — top left */}
                                <div className="absolute top-3 left-3">
                                    <span
                                        className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide"
                                        style={{ background: 'rgba(0,0,0,0.4)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
                                    >
                                        {tournament.game}
                                    </span>
                                </div>

                                {/* Status badge — top right */}
                                <div className="absolute top-3 right-3">
                                    <span
                                        className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide flex items-center gap-1"
                                        style={{ background: statusStyle.bg, color: statusStyle.text, boxShadow: statusStyle.glow }}
                                    >
                                        {status === 'LIVE' && <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />}
                                        {status}
                                    </span>
                                </div>

                                {/* Registered badge — bottom left */}
                                {isRegistered && (
                                    <div className="absolute bottom-3 left-3">
                                        <span
                                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold"
                                            style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}
                                        >
                                            ✓ Registered
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Card Content — frosted glass */}
                            <div
                                className="p-4 sm:p-5 flex flex-col flex-1"
                                style={{
                                    background: 'rgba(10,10,18,0.6)',
                                    backdropFilter: 'blur(16px)',
                                    WebkitBackdropFilter: 'blur(16px)',
                                    borderTop: '1px solid rgba(255,255,255,0.06)',
                                }}
                            >
                                <h3 className="text-white text-base sm:text-lg font-bold mb-2 sm:mb-3 truncate group-hover:text-orange-400 transition-colors duration-200">
                                    {tournament.title}
                                </h3>

                                {/* Date & Time */}
                                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-gray-500 mb-3 sm:mb-4 flex-wrap">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span>{tournament.date} • {tournament.time}</span>
                                </div>

                                {/* Prize Pool & Entry Fee */}
                                <div className="flex justify-between items-center mb-3 sm:mb-4">
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Prize Pool</p>
                                        <p className="text-base sm:text-lg font-bold" style={{ color: '#22C55E' }}>₹{tournament.prizePool.toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Entry Fee</p>
                                        <p className="text-base sm:text-lg font-bold" style={{ color: '#FF8C00' }}>₹{tournament.entryFee}</p>
                                    </div>
                                </div>

                                {/* Players Progress */}
                                <div className="flex items-center gap-2 mb-4 sm:mb-5">
                                    <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${playerPercentage}%`,
                                                background: 'linear-gradient(90deg, #FF8C00, #FF5500)',
                                            }}
                                        />
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        <span className="text-white font-semibold">{tournament.currentPlayers}</span>/{tournament.maxPlayers}
                                    </span>
                                    {tournament.spotsLeft !== undefined && tournament.spotsLeft > 0 && (
                                        <span
                                            className="text-[10px] px-1.5 py-0.5 rounded"
                                            style={{ background: 'rgba(255,140,0,0.1)', color: '#FF8C00' }}
                                        >
                                            {tournament.spotsLeft} left
                                        </span>
                                    )}
                                </div>

                                {/* Action Button */}
                                {getActionButton()}
                            </div>
                        </div>
                    </div>

                    {/* ── BACK FACE ── */}
                    <div
                        className="flip-card-back w-full"
                        style={{ minHeight: CARD_MIN_HEIGHT }}
                    >
                        {isRegistered ? (
                            <RoomAccessPanel
                                tournamentId={tournament.id}
                                onFlipBack={() => setIsFlipped(false)}
                            />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center bg-dark-800/95 rounded-2xl border border-white/10 p-6 text-center">
                                <svg className="w-10 h-10 text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zM10 9V7a2 2 0 114 0v2" /></svg>
                                <p className="text-gray-400 text-sm mb-4">Register to access room details</p>
                                <button
                                    onClick={() => setIsFlipped(false)}
                                    className="text-xs text-primary-orange font-medium hover:underline"
                                >
                                    ← Go Back
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal mounts whenever user is not yet registered — internal logic guards everything */}
            {!isRegistered && (
                <RegistrationModal
                    tournament={tournament}
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={onRefresh}
                />
            )}
        </>
    );
};

export default TournamentCard;
