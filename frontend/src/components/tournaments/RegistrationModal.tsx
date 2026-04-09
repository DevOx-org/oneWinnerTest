import React, { useState, useEffect } from 'react';
import type { Tournament } from '../../data/tournamentData';
import { registerForTournament } from '../../services/tournamentService';
import { getWalletBalance } from '../../services/walletService';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import ConfirmRegistrationModal from './ConfirmRegistrationModal';

interface RegistrationModalProps {
    tournament: Tournament;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const RegistrationModal: React.FC<RegistrationModalProps> = ({ tournament, isOpen, onClose, onSuccess }) => {
    const { updateUser } = useAuth();
    const [assignedSlot, setAssignedSlot] = useState<number>(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [walletBalance, setWalletBalance] = useState<number | null>(null);
    const [isLoadingBalance, setIsLoadingBalance] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [teamData, setTeamData] = useState({
        teamLeaderName: '',
        leaderGameName: '',
        teamMember2: '',
        teamMember3: '',
        teamMember4: '',
    });

    // Fetch wallet balance when modal opens
    // Note: slot is assigned by the backend (sequential) — we don't generate it here
    useEffect(() => {
        if (isOpen) {
            setAssignedSlot(0); // Reset — will be set from backend response

            // Fetch wallet balance — use ONLY depositBalance for tournament entries
            setIsLoadingBalance(true);
            getWalletBalance()
                .then((res) => {
                    // Only deposit balance can be used for tournament entry fees
                    setWalletBalance(res.wallet?.depositBalance ?? 0);
                })
                .catch(() => {
                    setWalletBalance(null);
                    toast.error('Failed to fetch wallet balance');
                })
                .finally(() => setIsLoadingBalance(false));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const hasInsufficientBalance = walletBalance !== null && walletBalance < tournament.entryFee;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTeamData({
            ...teamData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Check wallet balance before showing confirmation
        if (walletBalance === null) {
            toast.error('Unable to verify wallet balance. Please try again.');
            return;
        }

        if (walletBalance < tournament.entryFee) {
            toast.error(`Insufficient wallet balance. You need ₹${tournament.entryFee} but have ₹${walletBalance}.`);
            return;
        }

        // Open the confirmation modal instead of registering directly
        setShowConfirmModal(true);
    };

    const handleConfirmedSubmit = async () => {
        setIsProcessing(true);

        try {
            const response = await registerForTournament(tournament.id, {
                teamLeaderName: teamData.teamLeaderName,
                leaderGameName: teamData.leaderGameName,
                teamMember2: teamData.teamMember2,
                teamMember3: teamData.teamMember3,
                teamMember4: teamData.teamMember4,
            });
            toast.success(response.message || 'Registration successful!');
            setWalletBalance(response.walletBalance);
            // Set the slot from the backend response (sequential assignment)
            setAssignedSlot(response.registration.assignedSlot);

            // Update AuthContext so the Dashboard immediately reflects
            // the new wallet balance AND the incremented matchCount
            updateUser({
                walletBalance: response.walletBalance,
                matchCount: response.matchCount,
            });

            setIsProcessing(false);
            setShowConfirmModal(false);
            onClose();

            if (onSuccess) {
                onSuccess();
            }
        } catch (error: any) {
            console.error('Registration failed:', error);
            const errorMsg = error.response?.data?.message || 'Registration failed. Please try again.';
            toast.error(errorMsg);
            setIsProcessing(false);
        }
    };

    return (
        <>
            {/* Backdrop with blur effect */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={!isProcessing ? onClose : undefined}
            >
                {/* Modal */}
                <div
                    className="bg-dark-800 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="sticky top-0 bg-dark-800 border-b border-white/10 p-6 flex items-center justify-between z-10">
                        <div>
                            <h2 className="text-white text-2xl font-bold">Team Registration</h2>
                            <p className="text-gray-400 text-sm mt-1">{tournament.title} - {tournament.game}</p>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={isProcessing}
                            className="w-8 h-8 rounded-lg bg-dark-700 hover:bg-dark-600 text-gray-400 hover:text-white transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Close modal"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Form Content */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Assigned Time Slot */}
                        <div>
                            <h3 className="text-white font-semibold mb-3">Assigned Time Slot</h3>
                            <div className="bg-dark-700/50 border-2 border-primary-orange rounded-xl p-4 text-center">
                                <p className="text-primary-orange text-xl font-bold mb-1">
                                    {assignedSlot > 0 ? `Slot-${assignedSlot}` : 'Auto-assigned on registration'}, {tournament.time}
                                </p>
                                <p className="text-gray-400 text-sm">
                                    Your tournament slot will be assigned sequentially
                                </p>
                            </div>
                        </div>

                        {/* Team Details */}
                        <div>
                            <h3 className="text-white font-semibold mb-3">Team Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Team Leader Name */}
                                <div>
                                    <label className="text-gray-300 text-sm mb-2 block">
                                        Team Leader Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="teamLeaderName"
                                        value={teamData.teamLeaderName}
                                        onChange={handleInputChange}
                                        placeholder="Enter leader's real name"
                                        required
                                        disabled={isProcessing}
                                        className="w-full bg-dark-700 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-primary-orange focus:outline-none transition-colors disabled:opacity-50"
                                    />
                                </div>

                                {/* Leader Game Name */}
                                <div>
                                    <label className="text-gray-300 text-sm mb-2 block">
                                        Player-I ID <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="leaderGameName"
                                        value={teamData.leaderGameName}
                                        onChange={handleInputChange}
                                        placeholder="In-game username"
                                        required
                                        disabled={isProcessing}
                                        className="w-full bg-dark-700 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-primary-orange focus:outline-none transition-colors disabled:opacity-50"
                                    />
                                </div>

                                {/* Team Member 2 */}
                                <div>
                                    <label className="text-gray-300 text-sm mb-2 block">
                                        Player-II ID <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="teamMember2"
                                        value={teamData.teamMember2}
                                        onChange={handleInputChange}
                                        placeholder="In-game username"
                                        required
                                        disabled={isProcessing}
                                        className="w-full bg-dark-700 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-primary-orange focus:outline-none transition-colors disabled:opacity-50"
                                    />
                                </div>

                                {/* Team Member 3 */}
                                <div>
                                    <label className="text-gray-300 text-sm mb-2 block">
                                        Player-III ID
                                    </label>
                                    <input
                                        type="text"
                                        name="teamMember3"
                                        value={teamData.teamMember3}
                                        onChange={handleInputChange}
                                        placeholder="In-game username (optional)"
                                        disabled={isProcessing}
                                        className="w-full bg-dark-700 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-primary-orange focus:outline-none transition-colors disabled:opacity-50"
                                    />
                                </div>

                                {/* Team Member 4 */}
                                <div className="md:col-span-2">
                                    <label className="text-gray-300 text-sm mb-2 block">
                                        Player-IV ID
                                    </label>
                                    <input
                                        type="text"
                                        name="teamMember4"
                                        value={teamData.teamMember4}
                                        onChange={handleInputChange}
                                        placeholder="In-game username (optional)"
                                        disabled={isProcessing}
                                        className="w-full bg-dark-700 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-primary-orange focus:outline-none transition-colors disabled:opacity-50"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Tournament Info + Wallet Balance */}
                        <div className="bg-dark-700/30 border border-white/10 rounded-xl p-4">
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <p className="text-gray-400 text-xs mb-1">Entry Fee</p>
                                    <p className="text-primary-orange font-bold text-lg">₹{tournament.entryFee}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs mb-1">Prize Pool</p>
                                    <p className="text-green-400 font-bold text-lg">₹{tournament.prizePool.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs mb-1">Your Slot</p>
                                    <p className="text-white font-bold text-lg">{assignedSlot > 0 ? `Slot-${assignedSlot}` : 'Pending'}</p>
                                </div>
                            </div>

                            {/* Wallet Balance Row */}
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                        </svg>
                                        <span className="text-gray-300 text-sm font-medium">Deposit Balance</span>
                                    </div>
                                    {isLoadingBalance ? (
                                        <span className="text-gray-400 text-sm animate-pulse">Loading...</span>
                                    ) : walletBalance !== null ? (
                                        <span className={`font-bold text-lg ${hasInsufficientBalance ? 'text-red-400' : 'text-green-400'}`}>
                                            ₹{walletBalance.toLocaleString()}
                                        </span>
                                    ) : (
                                        <span className="text-red-400 text-sm">Unable to load</span>
                                    )}
                                </div>
                                {hasInsufficientBalance && (
                                    <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                        Insufficient deposit balance. Only deposited money can be used for entries. Please top up.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isProcessing}
                                className="flex-1 bg-dark-700 hover:bg-dark-600 text-white py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isProcessing || isLoadingBalance || hasInsufficientBalance || walletBalance === null}
                                className="flex-1 gradient-orange text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isProcessing ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Registering...
                                    </>
                                ) : (
                                    `Register with Wallet ₹${tournament.entryFee}`
                                )}
                            </button>
                        </div>

                        {/* Terms */}
                        <p className="text-gray-500 text-xs text-center">
                            By registering, you agree to our terms and conditions. Entry fee will be deducted from your wallet balance.
                        </p>
                    </form>
                </div>
            </div>

            {/* Confirmation Modal — layered on top of the registration modal */}
            <ConfirmRegistrationModal
                isOpen={showConfirmModal}
                entryFee={tournament.entryFee}
                walletBalance={walletBalance ?? 0}
                tournamentTitle={`${tournament.title} — ${tournament.game}`}
                onConfirm={handleConfirmedSubmit}
                onCancel={() => setShowConfirmModal(false)}
                isProcessing={isProcessing}
            />
        </>
    );
};

export default RegistrationModal;
