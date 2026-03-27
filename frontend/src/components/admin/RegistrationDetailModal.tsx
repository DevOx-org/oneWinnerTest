import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface RegistrationDetail {
    participantId: string;
    status: string;
    registeredAt: string;
    assignedSlot: number | null;
    teamLeaderName: string | null;
    leaderGameName: string | null;
    teamMember2: string | null;
    teamMember3: string | null;
    teamMember4: string | null;
    entryFee: number;
    refunded: boolean;
    banReason: string | null;
    bannedAt: string | null;
}

interface RegistrationUser {
    _id: string;
    name: string;
    email: string;
    gameId: string | null;
}

interface RegistrationTournament {
    _id: string;
    title: string;
    game: string;
    prizePool: number;
    entryFee: number;
    startDate: string;
    endDate: string;
    status: string;
}

interface RegistrationDetailResponse {
    success: boolean;
    registration: RegistrationDetail;
    user: RegistrationUser;
    tournament: RegistrationTournament;
}

interface RegistrationDetailModalProps {
    tournamentId: string;
    userId: string;
    isOpen: boolean;
    onClose: () => void;
}

const RegistrationDetailModal: React.FC<RegistrationDetailModalProps> = ({
    tournamentId,
    userId,
    isOpen,
    onClose,
}) => {
    const [data, setData] = useState<RegistrationDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('accessToken');
        api
            .get<RegistrationDetailResponse>(
                `/admin/tournaments/${tournamentId}/participants/${userId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            )
            .then((res: { data: RegistrationDetailResponse }) => setData(res.data))
            .catch((err: any) =>
                setError(err.response?.data?.message || 'Failed to load registration details.')
            )
            .finally(() => setLoading(false));
    }, [isOpen, tournamentId, userId]);

    if (!isOpen) return null;

    const reg = data?.registration;
    const user = data?.user;
    const tournament = data?.tournament;

    const statusColors: Record<string, string> = {
        confirmed: 'bg-green-500/20 text-green-400 border-green-500/30',
        registered: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        banned: 'bg-red-500/20 text-red-400 border-red-500/30',
        cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-dark-800 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-dark-800 border-b border-white/10 p-6 flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-white text-2xl font-bold">Registration Details</h2>
                        <p className="text-gray-400 text-sm mt-1">
                            {loading ? 'Loading...' : tournament ? `${tournament.title} — ${tournament.game}` : 'Error'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-dark-700 hover:bg-dark-600 text-gray-400 hover:text-white transition-colors flex items-center justify-center"
                        aria-label="Close modal"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="inline-block w-10 h-10 border-2 border-primary-orange border-t-transparent rounded-full animate-spin" />
                            <p className="text-gray-400 text-sm mt-3">Loading registration details...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <div className="text-4xl mb-3">⚠️</div>
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    ) : reg && user && tournament ? (
                        <>
                            {/* Status + User Info */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-dark-700 border border-white/10 flex items-center justify-center text-lg font-bold text-primary-orange">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold">{user.name}</p>
                                        <p className="text-gray-400 text-xs">{user.email}</p>
                                    </div>
                                </div>
                                <span
                                    className={`px-3 py-1 rounded-full text-xs font-bold border ${statusColors[reg.status] ?? 'bg-gray-500/20 text-gray-400'
                                        }`}
                                >
                                    {reg.status.toUpperCase()}
                                </span>
                            </div>

                            {/* Assigned Slot */}
                            <div>
                                <h3 className="text-white font-semibold mb-3">Assigned Time Slot</h3>
                                <div className="bg-dark-700/50 border-2 border-primary-orange rounded-xl p-4 text-center">
                                    <p className="text-primary-orange text-xl font-bold mb-1">
                                        {reg.assignedSlot ? `Slot-${reg.assignedSlot}` : 'Not assigned'}
                                    </p>
                                    <p className="text-gray-400 text-sm">
                                        Registered on{' '}
                                        {new Date(reg.registeredAt).toLocaleString('en-IN', {
                                            dateStyle: 'medium',
                                            timeStyle: 'short',
                                        })}
                                    </p>
                                </div>
                            </div>

                            {/* Team Details */}
                            <div>
                                <h3 className="text-white font-semibold mb-3">Team Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <ReadOnlyField label="Team Leader Name" value={reg.teamLeaderName} />
                                    <ReadOnlyField label="Leader Game Name" value={reg.leaderGameName || user.gameId} />
                                    <ReadOnlyField label="Team Member 2" value={reg.teamMember2} />
                                    <ReadOnlyField label="Team Member 3" value={reg.teamMember3} />
                                    <ReadOnlyField label="Team Member 4" value={reg.teamMember4} className="md:col-span-2" />
                                </div>
                            </div>

                            {/* Tournament Info */}
                            <div className="bg-dark-700/30 border border-white/10 rounded-xl p-4">
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <p className="text-gray-400 text-xs mb-1">Entry Fee</p>
                                        <p className="text-primary-orange font-bold text-lg">
                                            ₹{tournament.entryFee}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-xs mb-1">Prize Pool</p>
                                        <p className="text-green-400 font-bold text-lg">
                                            ₹{tournament.prizePool.toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-xs mb-1">Slot</p>
                                        <p className="text-white font-bold text-lg">
                                            {reg.assignedSlot ? `Slot-${reg.assignedSlot}` : '—'}
                                        </p>
                                    </div>
                                </div>

                                {reg.refunded && (
                                    <div className="mt-4 pt-4 border-t border-white/10 text-center">
                                        <span className="text-green-400 text-xs font-semibold bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                                            ₹{tournament.entryFee} Refunded
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Ban Info */}
                            {reg.status === 'banned' && reg.banReason && (
                                <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-4">
                                    <p className="text-red-400 text-xs font-semibold uppercase mb-2">Ban Reason</p>
                                    <p className="text-red-300 text-sm">{reg.banReason}</p>
                                    {reg.bannedAt && (
                                        <p className="text-red-400/60 text-xs mt-2">
                                            Banned on{' '}
                                            {new Date(reg.bannedAt).toLocaleString('en-IN', {
                                                dateStyle: 'medium',
                                                timeStyle: 'short',
                                            })}
                                        </p>
                                    )}
                                </div>
                            )}
                        </>
                    ) : null}

                    {/* Close Button */}
                    <div className="pt-2">
                        <button
                            onClick={onClose}
                            className="w-full bg-dark-700 hover:bg-dark-600 text-white py-3 rounded-xl font-semibold transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/** Small read-only field component used within the modal */
const ReadOnlyField: React.FC<{ label: string; value: string | null | undefined; className?: string }> = ({
    label,
    value,
    className = '',
}) => (
    <div className={className}>
        <p className="text-gray-400 text-sm mb-1.5">{label}</p>
        <div className="w-full bg-dark-700/60 border border-white/10 rounded-lg px-4 py-3 text-white text-sm min-h-[44px] flex items-center">
            {value || <span className="text-gray-500 italic">Not provided</span>}
        </div>
    </div>
);

export default RegistrationDetailModal;
