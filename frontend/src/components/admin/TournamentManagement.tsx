import React, { useState, useEffect } from 'react';
import RegistrationDetailModal from './RegistrationDetailModal';
import api from '../../services/api';

interface Tournament {
    _id: string;
    title: string;
    description: string;
    game: string;
    platform: string;
    matchType?: string | null;
    startDate: string;
    endDate: string;
    registrationDeadline: string;
    maxParticipants: number;
    entryFee: number;
    prizePool: number;
    rules?: string;
    status: 'draft' | 'upcoming' | 'live' | 'completed' | 'cancelled';
    participants: any[];
    createdBy: any;
    createdAt: string;
    updatedAt: string;
}

interface ParticipantRow {
    participantId: string;
    userId: string;
    username: string;
    email: string;
    status: 'registered' | 'confirmed' | 'cancelled' | 'banned';
    registeredAt: string;
    entryFee: number;
    refunded: boolean;
    banReason: string | null;
    bannedAt: string | null;
}

interface TournamentFormData {
    title: string;
    description: string;
    game: string;
    platform: string;
    matchType: string;
    // Start date/time (split for cleaner UX)
    startDateOnly: string;   // YYYY-MM-DD
    startHour: string;       // '01'..'12'
    startMinute: string;     // '00'|'15'|'30'|'45'
    startAmPm: 'AM' | 'PM';
    // End date/time (split)
    endDateOnly: string;
    endHour: string;
    endMinute: string;
    endAmPm: 'AM' | 'PM';
    maxParticipants: number;
    entryFee: number;
    prizePool: number;
    rules: string;
}

const GAMES = ['PUBG Mobile', 'Free Fire', 'Call of Duty Mobile', 'Valorant', 'CS:GO', 'Other'];
const PLATFORMS = ['Mobile', 'PC', 'Console', 'Cross-Platform'];
const MATCH_TYPES = [
    { value: 'TDM', label: 'TDM', slots: 2 },
    { value: 'Battle Royale - Solo', label: 'Battle Royale - Solo', slots: 48 },
    { value: 'Battle Royale - Squad', label: 'Battle Royale - Squad', slots: 12 },
];

const TournamentManagement: React.FC = () => {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [gameFilter, setGameFilter] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalTournaments, setTotalTournaments] = useState(0);
    const [itemsPerPage] = useState(20);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

    // Room credentials form state
    const [credentialsForm, setCredentialsForm] = useState({ roomId: '', roomPassword: '' });
    const [showRoomPassword, setShowRoomPassword] = useState(false);
    const [credentialsSubmitting, setCredentialsSubmitting] = useState(false);

    // Players modal state
    const [showPlayersModal, setShowPlayersModal] = useState(false);
    const [playersModalTournament, setPlayersModalTournament] = useState<Tournament | null>(null);
    const [participants, setParticipants] = useState<ParticipantRow[]>([]);
    const [participantsLoading, setParticipantsLoading] = useState(false);
    // Ban form: keyed by userId so each row has independent state
    const [banForms, setBanForms] = useState<Record<string, { reason: string; refund: boolean; submitting: boolean; showForm: boolean }>>({});

    // Registration detail modal state
    const [detailModal, setDetailModal] = useState<{ tournamentId: string; userId: string } | null>(null);

    // Form
    const EMPTY_FORM: TournamentFormData = {
        title: '',
        description: '',
        game: '',
        platform: '',
        matchType: '',
        startDateOnly: '',
        startHour: '08',
        startMinute: '00',
        startAmPm: 'PM',
        endDateOnly: '',
        endHour: '10',
        endMinute: '00',
        endAmPm: 'PM',
        maxParticipants: 100,
        entryFee: 0,
        prizePool: 0,
        rules: '',
    };
    const [formData, setFormData] = useState<TournamentFormData>(EMPTY_FORM);

    // Build a proper UTC ISO string from split local date/time fields.
    // Using Date constructor with explicit year/month/day/hour/minute interprets
    // them as LOCAL time, then .toISOString() converts to UTC correctly.
    const buildDateTime = (dateOnly: string, hour: string, minute: string, amPm: 'AM' | 'PM'): string => {
        let h = parseInt(hour, 10);
        if (amPm === 'AM' && h === 12) h = 0;
        if (amPm === 'PM' && h !== 12) h += 12;
        const [year, month, day] = dateOnly.split('-').map(Number);
        // Construct in LOCAL time so the browser's timezone offset is honoured
        const localDate = new Date(year, month - 1, day, h, parseInt(minute, 10), 0);
        return localDate.toISOString();
    };

    // Parse an ISO UTC datetime string back into split LOCAL time fields.
    // Always use local-time getters (getFullYear, getMonth, getDate, getHours)
    // so that IST users see their local time, not the raw UTC value.
    const parseDateTime = (iso: string) => {
        const d = new Date(iso);
        const year  = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day   = String(d.getDate()).padStart(2, '0');
        const dateOnly = `${year}-${month}-${day}`;
        let h = d.getHours();
        const amPm: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
        if (h === 0) h = 12;
        else if (h > 12) h -= 12;
        const minute = String(d.getMinutes()).padStart(2, '0');
        const validMinutes = ['00', '15', '30', '45'];
        const roundedMinute = validMinutes.reduce((prev, curr) =>
            Math.abs(parseInt(curr) - parseInt(minute)) < Math.abs(parseInt(prev) - parseInt(minute)) ? curr : prev
        );
        return { dateOnly, hour: String(h).padStart(2, '0'), minute: roundedMinute, amPm };
    };
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Fetch tournaments
    const fetchTournaments = async () => {
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('accessToken');
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: itemsPerPage.toString(),
                ...(statusFilter && { status: statusFilter }),
                ...(gameFilter && { game: gameFilter }),
            });

            const response = await api.get(`admin/tournaments?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setTournaments(response.data.tournaments);
            setTotalPages(response.data.pagination.pages);
            setTotalTournaments(response.data.pagination.total);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch tournaments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTournaments();
    }, [currentPage, statusFilter, gameFilter, itemsPerPage]);

    // Auto-dismiss toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // Filter tournaments by search term
    const filteredTournaments = tournaments.filter(tournament =>
        tournament.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Validate form
    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!formData.title.trim()) errors.title = 'Title is required';
        else if (formData.title.length < 3) errors.title = 'Title must be at least 3 characters';

        if (!formData.description.trim()) errors.description = 'Description is required';

        if (!formData.game) errors.game = 'Game is required';
        if (!formData.platform) errors.platform = 'Platform is required';
        if (!formData.matchType) errors.matchType = 'Match type is required';

        if (!formData.startDateOnly) errors.startDateOnly = 'Start date is required';
        if (!formData.endDateOnly) errors.endDateOnly = 'End date is required';

        if (formData.startDateOnly && formData.endDateOnly) {
            const start = new Date(buildDateTime(formData.startDateOnly, formData.startHour, formData.startMinute, formData.startAmPm));
            const end = new Date(buildDateTime(formData.endDateOnly, formData.endHour, formData.endMinute, formData.endAmPm));
            if (end <= start) errors.endDateOnly = 'End date/time must be after start date/time';
        }

        if (formData.maxParticipants < 2) errors.maxParticipants = 'Must have at least 2 participants';
        if (formData.maxParticipants > 1000) errors.maxParticipants = 'Cannot exceed 1000 participants';

        if (formData.entryFee < 0) errors.entryFee = 'Entry fee cannot be negative';
        if (formData.prizePool < 0) errors.prizePool = 'Prize pool cannot be negative';

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Handle create
    const handleCreate = async () => {
        if (!validateForm()) return;

        const startDate = buildDateTime(formData.startDateOnly, formData.startHour, formData.startMinute, formData.startAmPm);
        const endDate = buildDateTime(formData.endDateOnly, formData.endHour, formData.endMinute, formData.endAmPm);
        // Registration deadline auto-set: 1 hour before tournament start
        const registrationDeadline = new Date(new Date(startDate).getTime() - 60 * 60 * 1000).toISOString();

        setSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            // Send ONLY clean data to backend — strip the split UI fields
            const { startDateOnly, startHour, startMinute, startAmPm,
                    endDateOnly, endHour, endMinute, endAmPm, ...rest } = formData;
            await api.post(`admin/tournaments`, {
                ...rest,
                startDate,
                endDate,
                registrationDeadline,
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setToast({ message: 'Tournament created successfully!', type: 'success' });
            setShowCreateModal(false);
            resetForm();
            fetchTournaments();
        } catch (err: any) {
            setToast({ message: err.response?.data?.message || 'Failed to create tournament', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    // Handle edit
    const handleEdit = async () => {
        if (!validateForm() || !selectedTournament) return;

        const startDate = buildDateTime(formData.startDateOnly, formData.startHour, formData.startMinute, formData.startAmPm);
        const endDate = buildDateTime(formData.endDateOnly, formData.endHour, formData.endMinute, formData.endAmPm);
        const registrationDeadline = new Date(new Date(startDate).getTime() - 60 * 60 * 1000).toISOString();

        setSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            // Send ONLY clean data to backend — strip the split UI fields
            const { startDateOnly, startHour, startMinute, startAmPm,
                    endDateOnly, endHour, endMinute, endAmPm, ...rest } = formData;
            await api.put(`admin/tournaments/${selectedTournament._id}`, {
                ...rest,
                startDate,
                endDate,
                registrationDeadline,
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setToast({ message: 'Tournament updated successfully!', type: 'success' });
            setShowEditModal(false);
            resetForm();
            fetchTournaments();
        } catch (err: any) {
            setToast({ message: err.response?.data?.message || 'Failed to update tournament', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    // Handle delete
    const handleDelete = async () => {
        if (!selectedTournament) return;

        setSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            await api.delete(`admin/tournaments/${selectedTournament._id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setToast({ message: 'Tournament deleted successfully!', type: 'success' });
            setShowDeleteModal(false);
            setSelectedTournament(null);
            fetchTournaments();
        } catch (err: any) {
            setToast({ message: err.response?.data?.message || 'Failed to delete tournament', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    // ── Players modal ─────────────────────────────────────────────────────────
    const openPlayersModal = async (tournament: Tournament) => {
        setPlayersModalTournament(tournament);
        setShowPlayersModal(true);
        setBanForms({});
        setParticipantsLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const res = await api.get(`admin/tournaments/${tournament._id}/participants`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setParticipants(res.data.participants);
        } catch (err: any) {
            setToast({ message: err.response?.data?.message || 'Failed to load participants', type: 'error' });
            setShowPlayersModal(false);
        } finally {
            setParticipantsLoading(false);
        }
    };

    const updateBanForm = (userId: string, patch: Partial<{ reason: string; refund: boolean; submitting: boolean; showForm: boolean }>) => {
        setBanForms((prev) => {
            const defaults = { reason: '', refund: false, submitting: false, showForm: false };
            const current = prev[userId] ?? defaults;
            return { ...prev, [userId]: { ...current, ...patch } };
        });
    };

    const banParticipant = async (tournamentId: string, userId: string) => {
        const form = banForms[userId];
        if (!form?.reason?.trim()) {
            setToast({ message: 'A ban reason is required.', type: 'error' });
            return;
        }
        updateBanForm(userId, { submitting: true });
        try {
            const token = localStorage.getItem('accessToken');
            const res = await api.patch(
                `admin/tournaments/${tournamentId}/participants/${userId}/ban`,
                { reason: form.reason.trim(), refund: form.refund },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const msg = res.data.refundProcessed
                ? `User banned and ₹${res.data.refundAmount} refunded to their wallet.`
                : 'User banned successfully.';
            setToast({ message: msg, type: 'success' });
            // Refresh participant list
            if (playersModalTournament) await openPlayersModal(playersModalTournament);
        } catch (err: any) {
            setToast({ message: err.response?.data?.message || 'Failed to ban user', type: 'error' });
            updateBanForm(userId, { submitting: false });
        }
    };

    // Handle set / update room credentials
    const handleSetCredentials = async () => {
        if (!selectedTournament) return;
        if (!credentialsForm.roomId.trim()) {
            setToast({ message: 'Room ID is required.', type: 'error' });
            return;
        }
        if (!credentialsForm.roomPassword.trim()) {
            setToast({ message: 'Room Password is required.', type: 'error' });
            return;
        }

        setCredentialsSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            await api.patch(
                `admin/tournaments/${selectedTournament._id}/room-credentials`,
                { roomId: credentialsForm.roomId.trim(), roomPassword: credentialsForm.roomPassword.trim() },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setToast({ message: `Room credentials set for "${selectedTournament.title}"`, type: 'success' });
            setShowCredentialsModal(false);
            setCredentialsForm({ roomId: '', roomPassword: '' });
            setSelectedTournament(null);
        } catch (err: any) {
            setToast({ message: err.response?.data?.message || 'Failed to set credentials', type: 'error' });
        } finally {
            setCredentialsSubmitting(false);
        }
    };

    // Reset form
    const resetForm = () => {
        setFormData(EMPTY_FORM);
        setFormErrors({});
        setSelectedTournament(null);
    };

    // Open edit modal — parse existing ISO datetimes into split fields
    const openEditModal = (tournament: Tournament) => {
        setSelectedTournament(tournament);
        const start = parseDateTime(tournament.startDate);
        const end = parseDateTime(tournament.endDate);
        setFormData({
            title: tournament.title,
            description: tournament.description,
            game: tournament.game,
            platform: tournament.platform,
            matchType: tournament.matchType || '',
            startDateOnly: start.dateOnly,
            startHour: start.hour,
            startMinute: start.minute,
            startAmPm: start.amPm,
            endDateOnly: end.dateOnly,
            endHour: end.hour,
            endMinute: end.minute,
            endAmPm: end.amPm,
            maxParticipants: tournament.maxParticipants,
            entryFee: tournament.entryFee,
            prizePool: tournament.prizePool,
            rules: tournament.rules || '',
        });
        setShowEditModal(true);
    };

    // Open delete modal
    const openDeleteModal = (tournament: Tournament) => {
        setSelectedTournament(tournament);
        setShowDeleteModal(true);
    };

    // Get status badge color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'bg-gray-600/80 text-gray-200';
            case 'upcoming': return 'bg-blue-600/80 text-blue-200';
            case 'live': return 'bg-green-600/80 text-green-200';
            case 'completed': return 'bg-purple-600/80 text-purple-200';
            case 'cancelled': return 'bg-red-600/80 text-red-200';
            default: return 'bg-gray-600/80 text-gray-200';
        }
    };

    // Format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Tournament Management</h2>
                <button
                    onClick={() => {
                        resetForm();
                        setShowCreateModal(true);
                    }}
                    className="bg-gradient-orange hover:shadow-lg hover:shadow-orange-500/50 text-white px-6 py-2 rounded-lg font-semibold transition-all"
                >
                    Create Tournament
                </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                    type="text"
                    placeholder="Search tournaments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-dark-700/80 text-white px-4 py-2 rounded-lg border border-white/10 focus:border-orange-500 focus:outline-none"
                />

                <select
                    value={statusFilter}
                    onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="bg-dark-700/80 text-white px-4 py-2 rounded-lg border border-white/10 focus:border-orange-500 focus:outline-none"
                >
                    <option value="">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="live">Live</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </select>

                <select
                    value={gameFilter}
                    onChange={(e) => {
                        setGameFilter(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="bg-dark-700/80 text-white px-4 py-2 rounded-lg border border-white/10 focus:border-orange-500 focus:outline-none"
                >
                    <option value="">All Games</option>
                    {GAMES.map(game => (
                        <option key={game} value={game}>{game}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            {loading ? (
                <div className="bg-dark-800/60 backdrop-blur-md border border-white/10 rounded-xl p-8">
                    <div className="animate-pulse space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-16 bg-dark-700/50 rounded"></div>
                        ))}
                    </div>
                </div>
            ) : error ? (
                <div className="bg-dark-800/60 backdrop-blur-md border border-white/10 rounded-xl p-8 text-center">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={fetchTournaments}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg transition-colors"
                    >
                        Retry
                    </button>
                </div>
            ) : (
                <div className="bg-dark-800/60 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px]">
                            <thead className="bg-dark-700/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Title</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Game</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Platform</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Start Date</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Participants</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Prize Pool</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredTournaments.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                                            No tournaments found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTournaments.map((tournament) => (
                                        <tr key={tournament._id} className="hover:bg-dark-700/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="text-white font-medium">{tournament.title}</div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-300">{tournament.game}</td>
                                            <td className="px-6 py-4 text-gray-300">{tournament.platform}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(tournament.status)}`}>
                                                    {tournament.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-300">{formatDate(tournament.startDate)}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-300">
                                                    {tournament.participants.length} / {tournament.maxParticipants}
                                                </div>
                                                <div className="w-24 bg-dark-600 rounded-full h-2 mt-1">
                                                    <div
                                                        className="bg-orange-500 h-2 rounded-full"
                                                        style={{ width: `${(tournament.participants.length / tournament.maxParticipants) * 100}%` }}
                                                    ></div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-300">₹{tournament.prizePool.toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2 items-center">
                                                    <button
                                                        onClick={() => openEditModal(tournament)}
                                                        className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedTournament(tournament);
                                                            setCredentialsForm({ roomId: '', roomPassword: '' });
                                                            setShowRoomPassword(false);
                                                            setShowCredentialsModal(true);
                                                        }}
                                                        title="Set room credentials"
                                                        className="text-yellow-400 hover:text-yellow-300 font-medium transition-colors"
                                                    >
                                                        🔑
                                                    </button>
                                                    <button
                                                        onClick={() => openPlayersModal(tournament)}
                                                        title="View players"
                                                        className="text-green-400 hover:text-green-300 font-medium transition-colors"
                                                    >
                                                        👥
                                                    </button>
                                                    <button
                                                        onClick={() => openDeleteModal(tournament)}
                                                        className="text-red-400 hover:text-red-300 font-medium transition-colors"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-sm text-gray-400">
                                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalTournaments)} of {totalTournaments} tournaments
                            </div>
                            <div className="flex flex-wrap justify-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 bg-dark-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-600 transition-colors"
                                >
                                    Previous
                                </button>
                                <span className="px-4 py-2 text-white">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-4 py-2 bg-dark-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-dark-600 transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit Modal */}
            {(showCreateModal || showEditModal) && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-dark-800 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-dark-800 border-b border-white/10 px-6 py-4 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">
                                {showCreateModal ? 'Create Tournament' : 'Edit Tournament'}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setShowEditModal(false);
                                    resetForm();
                                }}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Title */}
                                <div className="md:col-span-2">
                                    <label className="text-gray-300 text-sm font-semibold mb-2 block">Title *</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className={`w-full bg-dark-700/80 text-white px-4 py-3 rounded-lg border ${formErrors.title ? 'border-red-500' : 'border-white/10'} focus:border-orange-500 focus:outline-none`}
                                        placeholder="Enter tournament title"
                                    />
                                    {formErrors.title && <p className="text-red-400 text-xs mt-1">{formErrors.title}</p>}
                                </div>

                                {/* Description */}
                                <div className="md:col-span-2">
                                    <label className="text-gray-300 text-sm font-semibold mb-2 block">Description *</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                        className={`w-full bg-dark-700/80 text-white px-4 py-3 rounded-lg border ${formErrors.description ? 'border-red-500' : 'border-white/10'} focus:border-orange-500 focus:outline-none`}
                                        placeholder="Enter tournament description"
                                    />
                                    {formErrors.description && <p className="text-red-400 text-xs mt-1">{formErrors.description}</p>}
                                </div>

                                {/* Game */}
                                <div>
                                    <label className="text-gray-300 text-sm font-semibold mb-2 block">Game *</label>
                                    <select
                                        value={formData.game}
                                        onChange={(e) => setFormData({ ...formData, game: e.target.value })}
                                        className={`w-full bg-dark-700/80 text-white px-4 py-3 rounded-lg border ${formErrors.game ? 'border-red-500' : 'border-white/10'} focus:border-orange-500 focus:outline-none`}
                                    >
                                        <option value="">Select game</option>
                                        {GAMES.map(game => (
                                            <option key={game} value={game}>{game}</option>
                                        ))}
                                    </select>
                                    {formErrors.game && <p className="text-red-400 text-xs mt-1">{formErrors.game}</p>}
                                </div>

                                {/* Platform */}
                                <div>
                                    <label className="text-gray-300 text-sm font-semibold mb-2 block">Platform *</label>
                                    <select
                                        value={formData.platform}
                                        onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                                        className={`w-full bg-dark-700/80 text-white px-4 py-3 rounded-lg border ${formErrors.platform ? 'border-red-500' : 'border-white/10'} focus:border-orange-500 focus:outline-none`}
                                    >
                                        <option value="">Select platform</option>
                                        {PLATFORMS.map(platform => (
                                            <option key={platform} value={platform}>{platform}</option>
                                        ))}
                                    </select>
                                    {formErrors.platform && <p className="text-red-400 text-xs mt-1">{formErrors.platform}</p>}
                                </div>

                                {/* ── Start Date & Time ─────────────────────── */}
                                <div className="md:col-span-2">
                                    <label className="text-gray-300 text-sm font-semibold mb-2 block">Start Date &amp; Time *</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {/* Date */}
                                        <div className="sm:col-span-2">
                                            <input
                                                type="date"
                                                value={formData.startDateOnly}
                                                onChange={(e) => setFormData({ ...formData, startDateOnly: e.target.value })}
                                                className={`w-full bg-dark-700/80 text-white px-4 py-3 rounded-lg border ${formErrors.startDateOnly ? 'border-red-500' : 'border-white/10'} focus:border-orange-500 focus:outline-none`}
                                            />
                                        </div>
                                        {/* Hour */}
                                        <select
                                            value={formData.startHour}
                                            onChange={(e) => setFormData({ ...formData, startHour: e.target.value })}
                                            className="bg-dark-700/80 text-white px-3 py-3 rounded-lg border border-white/10 focus:border-orange-500 focus:outline-none"
                                        >
                                            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                                                <option key={h} value={h}>{h}</option>
                                            ))}
                                        </select>
                                        {/* Minute + AM/PM stacked */}
                                        <div className="flex gap-1">
                                            <select
                                                value={formData.startMinute}
                                                onChange={(e) => setFormData({ ...formData, startMinute: e.target.value })}
                                                className="flex-1 bg-dark-700/80 text-white px-2 py-3 rounded-lg border border-white/10 focus:border-orange-500 focus:outline-none"
                                            >
                                                {['00', '15', '30', '45'].map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                            <select
                                                value={formData.startAmPm}
                                                onChange={(e) => setFormData({ ...formData, startAmPm: e.target.value as 'AM' | 'PM' })}
                                                className="bg-dark-700/80 text-white px-2 py-3 rounded-lg border border-white/10 focus:border-orange-500 focus:outline-none font-bold"
                                            >
                                                <option value="AM">AM</option>
                                                <option value="PM">PM</option>
                                            </select>
                                        </div>
                                    </div>
                                    {formErrors.startDateOnly && <p className="text-red-400 text-xs mt-1">{formErrors.startDateOnly}</p>}
                                </div>

                                {/* ── End Date & Time ───────────────────────── */}
                                <div className="md:col-span-2">
                                    <label className="text-gray-300 text-sm font-semibold mb-2 block">End Date &amp; Time *</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        <div className="sm:col-span-2">
                                            <input
                                                type="date"
                                                value={formData.endDateOnly}
                                                onChange={(e) => setFormData({ ...formData, endDateOnly: e.target.value })}
                                                className={`w-full bg-dark-700/80 text-white px-4 py-3 rounded-lg border ${formErrors.endDateOnly ? 'border-red-500' : 'border-white/10'} focus:border-orange-500 focus:outline-none`}
                                            />
                                        </div>
                                        <select
                                            value={formData.endHour}
                                            onChange={(e) => setFormData({ ...formData, endHour: e.target.value })}
                                            className="bg-dark-700/80 text-white px-3 py-3 rounded-lg border border-white/10 focus:border-orange-500 focus:outline-none"
                                        >
                                            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                                                <option key={h} value={h}>{h}</option>
                                            ))}
                                        </select>
                                        <div className="flex gap-1">
                                            <select
                                                value={formData.endMinute}
                                                onChange={(e) => setFormData({ ...formData, endMinute: e.target.value })}
                                                className="flex-1 bg-dark-700/80 text-white px-2 py-3 rounded-lg border border-white/10 focus:border-orange-500 focus:outline-none"
                                            >
                                                {['00', '15', '30', '45'].map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                            <select
                                                value={formData.endAmPm}
                                                onChange={(e) => setFormData({ ...formData, endAmPm: e.target.value as 'AM' | 'PM' })}
                                                className="bg-dark-700/80 text-white px-2 py-3 rounded-lg border border-white/10 focus:border-orange-500 focus:outline-none font-bold"
                                            >
                                                <option value="AM">AM</option>
                                                <option value="PM">PM</option>
                                            </select>
                                        </div>
                                    </div>
                                    {formErrors.endDateOnly && <p className="text-red-400 text-xs mt-1">{formErrors.endDateOnly}</p>}
                                    <p className="text-gray-500 text-xs mt-1">Registration closes automatically 1 hour before start time.</p>
                                </div>

                                {/* Match Type */}
                                <div>
                                    <label className="text-gray-300 text-sm font-semibold mb-2 block">Match Type *</label>
                                    <select
                                        value={formData.matchType}
                                        onChange={(e) => {
                                            const mt = MATCH_TYPES.find(m => m.value === e.target.value);
                                            setFormData({
                                                ...formData,
                                                matchType: e.target.value,
                                                maxParticipants: mt ? mt.slots : formData.maxParticipants,
                                            });
                                        }}
                                        className={`w-full bg-dark-700/80 text-white px-4 py-3 rounded-lg border ${formErrors.matchType ? 'border-red-500' : 'border-white/10'} focus:border-orange-500 focus:outline-none`}
                                    >
                                        <option value="">Select match type</option>
                                        {MATCH_TYPES.map(mt => (
                                            <option key={mt.value} value={mt.value}>{mt.label} ({mt.slots} slots)</option>
                                        ))}
                                    </select>
                                    {formErrors.matchType && <p className="text-red-400 text-xs mt-1">{formErrors.matchType}</p>}
                                </div>

                                {/* Max Participants */}
                                <div>
                                    <label className="text-gray-300 text-sm font-semibold mb-2 block">Max Participants *</label>
                                    <input
                                        type="number"
                                        value={formData.maxParticipants}
                                        onChange={(e) => {
                                            if (!formData.matchType) {
                                                setFormData({ ...formData, maxParticipants: e.target.value === '' ? 0 : Number(e.target.value) });
                                            }
                                        }}
                                        readOnly={!!formData.matchType}
                                        className={`w-full bg-dark-700/80 text-white px-4 py-3 rounded-lg border ${formErrors.maxParticipants ? 'border-red-500' : 'border-white/10'} focus:border-orange-500 focus:outline-none ${formData.matchType ? 'opacity-60 cursor-not-allowed' : ''}`}
                                        min="2"
                                        max="1000"
                                        step="1"
                                    />
                                    {formErrors.maxParticipants && <p className="text-red-400 text-xs mt-1">{formErrors.maxParticipants}</p>}
                                    {formData.matchType && (
                                        <p className="text-yellow-400 text-xs mt-1">
                                            Auto-set by match type: {formData.matchType}
                                        </p>
                                    )}
                                </div>

                                {/* Entry Fee */}
                                <div>
                                    <label className="text-gray-300 text-sm font-semibold mb-2 block">Entry Fee (₹) *</label>
                                    <input
                                        type="number"
                                        value={formData.entryFee}
                                        onChange={(e) => setFormData({ ...formData, entryFee: e.target.value === '' ? 0 : Number(e.target.value) })}
                                        className={`w-full bg-dark-700/80 text-white px-4 py-3 rounded-lg border ${formErrors.entryFee ? 'border-red-500' : 'border-white/10'} focus:border-orange-500 focus:outline-none`}
                                        min="0"
                                        step="1"
                                    />
                                    {formErrors.entryFee && <p className="text-red-400 text-xs mt-1">{formErrors.entryFee}</p>}
                                </div>

                                {/* Prize Pool */}
                                <div>
                                    <label className="text-gray-300 text-sm font-semibold mb-2 block">Prize Pool (₹) *</label>
                                    <input
                                        type="number"
                                        value={formData.prizePool}
                                        onChange={(e) => setFormData({ ...formData, prizePool: e.target.value === '' ? 0 : Number(e.target.value) })}
                                        className={`w-full bg-dark-700/80 text-white px-4 py-3 rounded-lg border ${formErrors.prizePool ? 'border-red-500' : 'border-white/10'} focus:border-orange-500 focus:outline-none`}
                                        min="0"
                                        step="1"
                                    />
                                    {formErrors.prizePool && <p className="text-red-400 text-xs mt-1">{formErrors.prizePool}</p>}
                                </div>


                                {/* Rules */}
                                <div className="md:col-span-2">
                                    <label className="text-gray-300 text-sm font-semibold mb-2 block">Rules (Optional)</label>
                                    <textarea
                                        value={formData.rules}
                                        onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                                        rows={4}
                                        className="w-full bg-dark-700/80 text-white px-4 py-3 rounded-lg border border-white/10 focus:border-orange-500 focus:outline-none"
                                        placeholder="Enter tournament rules"
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={showCreateModal ? handleCreate : handleEdit}
                                    disabled={submitting}
                                    className="flex-1 bg-gradient-orange hover:shadow-lg hover:shadow-orange-500/50 text-white py-3 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Saving...' : showCreateModal ? 'Create Tournament' : 'Save Changes'}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setShowEditModal(false);
                                        resetForm();
                                    }}
                                    className="px-6 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-semibold transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Set Room Credentials Modal */}
            {showCredentialsModal && selectedTournament && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-dark-800 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
                        {/* Header */}
                        <div className="border-b border-white/10 px-6 py-4 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    🔑 Set Room Credentials
                                </h3>
                                <p className="text-gray-400 text-xs mt-0.5 truncate max-w-[280px]">
                                    {selectedTournament.title}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowCredentialsModal(false);
                                    setCredentialsForm({ roomId: '', roomPassword: '' });
                                    setSelectedTournament(null);
                                }}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            {/* Info note */}
                            <div className="flex gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-4 py-3">
                                <span className="text-yellow-400 text-sm mt-0.5">ℹ️</span>
                                <p className="text-yellow-300/90 text-xs leading-relaxed">
                                    Credentials will be visible to registered participants
                                    <strong> 30 minutes before match start.</strong>
                                </p>
                            </div>

                            {/* Room ID */}
                            <div>
                                <label className="text-gray-300 text-sm font-semibold mb-2 block">
                                    Room ID <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={credentialsForm.roomId}
                                    onChange={(e) => setCredentialsForm({ ...credentialsForm, roomId: e.target.value })}
                                    placeholder="e.g. PUBG-2025-ROOM-42"
                                    maxLength={50}
                                    disabled={credentialsSubmitting}
                                    className="w-full bg-dark-700/80 text-white px-4 py-3 rounded-lg border border-white/10 focus:border-orange-500 focus:outline-none font-mono tracking-wide disabled:opacity-50"
                                />
                                <p className="text-gray-500 text-xs mt-1">{credentialsForm.roomId.length}/50</p>
                            </div>

                            {/* Room Password */}
                            <div>
                                <label className="text-gray-300 text-sm font-semibold mb-2 block">
                                    Room Password <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showRoomPassword ? 'text' : 'password'}
                                        value={credentialsForm.roomPassword}
                                        onChange={(e) => setCredentialsForm({ ...credentialsForm, roomPassword: e.target.value })}
                                        placeholder="Enter room password"
                                        maxLength={100}
                                        disabled={credentialsSubmitting}
                                        className="w-full bg-dark-700/80 text-white px-4 py-3 pr-12 rounded-lg border border-white/10 focus:border-orange-500 focus:outline-none font-mono tracking-wide disabled:opacity-50"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowRoomPassword(!showRoomPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showRoomPassword ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                <p className="text-gray-500 text-xs mt-1">{credentialsForm.roomPassword.length}/100</p>
                            </div>

                            {/* Security note */}
                            <p className="text-gray-500 text-xs flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                Password is encrypted in transit and never stored in logs.
                            </p>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleSetCredentials}
                                    disabled={credentialsSubmitting || !credentialsForm.roomId.trim() || !credentialsForm.roomPassword.trim()}
                                    className="flex-1 bg-gradient-orange hover:shadow-lg hover:shadow-orange-500/40 text-white py-3 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {credentialsSubmitting ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Saving...
                                        </>
                                    ) : '🔑 Save Credentials'}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowCredentialsModal(false);
                                        setCredentialsForm({ roomId: '', roomPassword: '' });
                                        setSelectedTournament(null);
                                    }}
                                    disabled={credentialsSubmitting}
                                    className="px-6 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && selectedTournament && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-dark-800 border border-white/10 rounded-2xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold text-white mb-4">Delete Tournament</h3>
                        <p className="text-gray-300 mb-6">
                            Are you sure you want to delete <span className="font-semibold text-white">"{selectedTournament.title}"</span>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleDelete}
                                disabled={submitting}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? 'Deleting...' : 'Delete'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setSelectedTournament(null);
                                }}
                                className="flex-1 bg-dark-700 hover:bg-dark-600 text-white py-3 rounded-lg font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Players Modal */}
            {showPlayersModal && playersModalTournament && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPlayersModal(false)}>
                    <div
                        className="bg-dark-800 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 flex-shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-white">👥 Players</h2>
                                <p className="text-gray-400 text-sm mt-0.5">{playersModalTournament.title}</p>
                            </div>
                            <button onClick={() => setShowPlayersModal(false)} className="text-gray-400 hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="overflow-y-auto flex-1 px-6 py-4">
                            {participantsLoading ? (
                                <div className="flex items-center justify-center py-12 text-gray-400">Loading players...</div>
                            ) : participants.length === 0 ? (
                                <div className="flex items-center justify-center py-12 text-gray-400">No players registered yet.</div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Player</th>
                                            <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                            <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Joined</th>
                                            <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Fee Paid</th>
                                            <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {participants.map((p) => {
                                            const bf = banForms[p.userId] ?? { reason: '', refund: false, submitting: false, showForm: false };
                                            const statusColors: Record<string, string> = {
                                                confirmed: 'bg-green-500/20 text-green-400 border-green-500/30',
                                                registered: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                                                banned: 'bg-red-500/20 text-red-400 border-red-500/30',
                                                cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
                                            };
                                            return (
                                                <React.Fragment key={p.userId}>
                                                    <tr
                                                        className="hover:bg-white/5 transition-colors cursor-pointer"
                                                        onClick={() =>
                                                            setDetailModal({
                                                                tournamentId: playersModalTournament._id,
                                                                userId: p.userId,
                                                            })
                                                        }
                                                        title="Click to view registration details"
                                                    >
                                                        <td className="py-3 px-3">
                                                            <div className="font-medium text-white">{p.username}</div>
                                                            <div className="text-gray-400 text-xs">{p.email}</div>
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${statusColors[p.status] ?? 'bg-gray-500/20 text-gray-400'}`}>
                                                                {p.status}
                                                            </span>
                                                            {p.status === 'banned' && p.banReason && (
                                                                <div className="text-red-400 text-xs mt-1 max-w-[160px] truncate" title={p.banReason}>
                                                                    {p.banReason}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-3 text-gray-300">
                                                            {new Date(p.registeredAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                                        </td>
                                                        <td className="py-3 px-3 text-gray-300">
                                                            {p.entryFee > 0 ? `₹${p.entryFee}` : 'Free'}
                                                            {p.refunded && <span className="ml-1 text-xs text-green-400">(refunded)</span>}
                                                        </td>
                                                        <td className="py-3 px-3">
                                                            {(p.status === 'registered' || p.status === 'confirmed') && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); updateBanForm(p.userId, { showForm: !bf.showForm }); }}
                                                                    className="px-3 py-1 text-xs bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 rounded-lg transition-colors font-medium"
                                                                >
                                                                    {bf.showForm ? 'Cancel' : '⛔ Ban'}
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                    {/* Per-row inline ban form */}
                                                    {bf.showForm && (p.status === 'registered' || p.status === 'confirmed') && (
                                                        <tr>
                                                            <td colSpan={5} className="py-3 px-3">
                                                                <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-4 space-y-3">
                                                                    <label className="block text-xs font-semibold text-red-300 uppercase tracking-wider">Ban Reason *</label>
                                                                    <textarea
                                                                        rows={2}
                                                                        maxLength={500}
                                                                        placeholder="Describe the reason for this ban..."
                                                                        value={bf.reason}
                                                                        onChange={(e) => updateBanForm(p.userId, { reason: e.target.value })}
                                                                        className="w-full bg-dark-700 border border-white/10 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-red-500/50"
                                                                    />
                                                                    <div className="flex items-center justify-between">
                                                                        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={bf.refund}
                                                                                onChange={(e) => updateBanForm(p.userId, { refund: e.target.checked })}
                                                                                className="rounded"
                                                                                disabled={p.entryFee === 0}
                                                                            />
                                                                            {p.entryFee > 0
                                                                                ? `Refund ₹${p.entryFee} to wallet`
                                                                                : 'No entry fee to refund'}
                                                                        </label>
                                                                        <button
                                                                            onClick={() => banParticipant(playersModalTournament._id, p.userId)}
                                                                            disabled={bf.submitting || !bf.reason.trim()}
                                                                            className="px-4 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
                                                                        >
                                                                            {bf.submitting ? 'Banning...' : 'Confirm Ban'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Registration Detail Modal */}
            {detailModal && (
                <RegistrationDetailModal
                    tournamentId={detailModal.tournamentId}
                    userId={detailModal.userId}
                    isOpen={true}
                    onClose={() => setDetailModal(null)}
                />
            )}

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 animate-slideInRight">
                    <div className={`${toast.type === 'success' ? 'bg-green-600/95 border-green-500/50' : 'bg-red-600/95 border-red-500/50'} backdrop-blur-md border rounded-lg px-6 py-4 shadow-2xl max-w-md`}>
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                                {toast.type === 'success' ? (
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                ) : (
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                )}
                            </div>
                            <div className="flex-1">
                                <p className="text-white font-semibold text-sm mb-1">
                                    {toast.type === 'success' ? 'Success!' : 'Error'}
                                </p>
                                <p className="text-white/90 text-sm">{toast.message}</p>
                            </div>
                            <button onClick={() => setToast(null)} className="text-white/80 hover:text-white">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TournamentManagement;
