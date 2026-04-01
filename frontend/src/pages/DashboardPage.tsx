import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

import { getMyTournaments, type PublicTournament } from '../services/tournamentService';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile, getProfile, getMatchHistory, type MatchHistoryItem } from '../services/userService';
import {
    getWalletBalance,
    requestWithdrawal, getMyWithdrawals,
    submitManualDeposit, getManualDeposits, getUpiInfo
} from '../services/walletService';
import type { WalletTransaction, WithdrawalRequest, ManualDepositRequest } from '../services/walletService';

type TabType = 'Overview' | 'My Tournaments' | 'Match History' | 'Wallet' | 'Profile';
type TimePeriod = '7D' | '30D' | '90D';
type MatchFilter = 'all' | 'won' | 'lost';
type TournamentFilter = 'all' | 'live' | 'upcoming' | 'completed';

const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const { logout, user, updateUser } = useAuth();

    const [activeTab, setActiveTab] = useState<TabType>('Match History');
    const [_timePeriod, _setTimePeriod] = useState<TimePeriod>('7D');
    const [matchFilter, setMatchFilter] = useState<MatchFilter>('all');

    // ── My Tournaments state ──────────────────────────────────────────────────
    const [_myTournaments, setMyTournaments] = useState<PublicTournament[]>([]);
    const [_tournamentsLoading, setTournamentsLoading] = useState(false);
    const [_tournamentsError, setTournamentsError] = useState<string | null>(null);
    const [_tournamentFilter] = useState<TournamentFilter>('all');

    // ── Match History state (enriched with rank + prize) ───────────────────────────
    const [matchHistory, setMatchHistory] = useState<MatchHistoryItem[]>([]);
    const [matchHistoryLoading, setMatchHistoryLoading] = useState(false);
    const [matchHistoryError, setMatchHistoryError] = useState<string | null>(null);

    // ── Wallet state ─────────────────────────────────────────────────────────
    const [_liveBalance, setLiveBalance] = useState<number>(user?.walletBalance ?? 0);
    // Initialise from auth context snapshot so Match History shows correct
    // earnings immediately — wallet tab fetch will overwrite with fresh data.
    const [winningBalance, setWinningBalance] = useState<number>((user as any)?.winningBalance ?? 0);
    const [lockedBalance, setLockedBalance] = useState<number>((user as any)?.lockedBalance ?? 0);
    const [depositBalance, setDepositBalance] = useState<number>((user as any)?.depositBalance ?? 0);
    const [lifetimeWithdrawn, setLifetimeWithdrawn] = useState<number>((user as any)?.lifetimeWithdrawn ?? 0);
    const [walletTxns, setWalletTxns] = useState<WalletTransaction[]>([]);
    const [walletLoading, setWalletLoading] = useState(false);
    const [walletError, setWalletError] = useState<string | null>(null);
    const [topUpAmount, setTopUpAmount] = useState<string>('');
    const [addMoneyLoading, setAddMoneyLoading] = useState(false);

    // ── Manual Deposit state ──────────────────────────────────────────────────
    type DepositStep = 'amount' | 'qr' | 'form' | 'submitted';
    const [depositStep, setDepositStep] = useState<DepositStep>('amount');
    const [paymentMethod, setPaymentMethod] = useState<string>('');
    const [upiRefId, setUpiRefId] = useState<string>('');
    const [manualDeposits, setManualDeposits] = useState<ManualDepositRequest[]>([]);
    const [manualDepositsLoading, setManualDepositsLoading] = useState(false);
    const [depositError, setDepositError] = useState<string | null>(null);
    const [depositSuccess, setDepositSuccess] = useState<string | null>(null);
    const [upiInfo, setUpiInfo] = useState<{ upiId: string; accountHolder: string; qrImagePath: string } | null>(null);
    const [showAllDeposits, setShowAllDeposits] = useState(false);

    // ── Withdrawal state ─────────────────────────────────────────────────────
    const [withdrawAmount, setWithdrawAmount] = useState<string>('');
    const [upiId, setUpiId] = useState('');
    const [withdrawLoading, setWithdrawLoading] = useState(false);
    const [withdrawError, setWithdrawError] = useState<string | null>(null);
    const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);
    const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
    const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
    const [_showBankForm, setShowBankForm] = useState(false);
    const [showAllTxns, setShowAllTxns] = useState(false);
    const [showAllWithdrawals, setShowAllWithdrawals] = useState(false);

    // Profile edit state - Initialize from authenticated user data
    const [isEditMode, setIsEditMode] = useState(false);
    const [profileData, setProfileData] = useState({
        fullName: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        gameId: user?.gameId || '',
        dateOfBirth: user?.dateOfBirth || '',
        location: user?.location || '',
        bio: user?.bio || ''
    });
    const [editedData, setEditedData] = useState({ ...profileData });

    // Update profile data when user data changes
    useEffect(() => {
        if (user) {
            const updatedProfile = {
                fullName: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                gameId: user.gameId || '',
                dateOfBirth: user.dateOfBirth || '',
                location: user.location || '',
                bio: user.bio || ''
            };
            setProfileData(updatedProfile);
            setEditedData(updatedProfile);
        }
    }, [user]);

    // Toast notification state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // ── Sync user profile on mount (ensures matchCount + other fields are fresh) ──
    useEffect(() => {
        getProfile()
            .then((res) => {
                if (res.user) {
                    updateUser({
                        matchCount: res.user.matchCount ?? 0,
                        winCount: res.user.winCount ?? 0,
                        walletBalance: res.user.walletBalance ?? 0,
                    });
                }
            })
            .catch(() => { /* non-critical — user data falls back to login snapshot */ });

        // ── Eagerly fetch wallet balances on mount ──────────────────────────────
        // This ensures Match History 'TOTAL EARNINGS' is correct without
        // requiring the user to visit the Wallet tab first.
        getWalletBalance()
            .then((res) => {
                setLiveBalance(res.walletBalance ?? 0);
                setWinningBalance(res.wallet?.winningBalance ?? 0);
                setLockedBalance(res.wallet?.lockedBalance ?? 0);
                setDepositBalance(res.wallet?.depositBalance ?? 0);
                setLifetimeWithdrawn(res.wallet?.lifetimeWithdrawn ?? 0);
                setWalletTxns(res.recentTransactions ?? []);
                updateUser({ walletBalance: res.walletBalance ?? 0 });
            })
            .catch(() => { /* non-critical — wallet data will refresh on Wallet tab */ });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-dismiss toast after 5 seconds
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => {
                setToast(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
    };

    // ── Fetch My Tournaments when tab becomes active ───────────────────────────
    useEffect(() => {
        if (activeTab !== 'My Tournaments') return;
        setTournamentsLoading(true);
        setTournamentsError(null);
        getMyTournaments()
            .then((data) => setMyTournaments(data))
            .catch((err: any) => {
                const msg = err?.response?.data?.message || 'Failed to load your tournaments.';
                setTournamentsError(msg);
            })
            .finally(() => setTournamentsLoading(false));
    }, [activeTab]);

    // ── Fetch Match History from backend on mount + when tab becomes active ────
    useEffect(() => {
        if (!user?.id) return;
        if (matchHistory.length === 0 || activeTab === 'Match History') {
            setMatchHistoryLoading(true);
            setMatchHistoryError(null);
            getMatchHistory()
                .then((res) => setMatchHistory(res.matches))
                .catch((err: any) => {
                    const msg = err?.response?.data?.message || 'Failed to load match history.';
                    setMatchHistoryError(msg);
                })
                .finally(() => setMatchHistoryLoading(false));
        }
    }, [activeTab, user?.id]);

    // ── Fetch wallet data when Wallet tab becomes active ──────────────────────
    useEffect(() => {
        if (activeTab !== 'Wallet') return;
        setWalletLoading(true);
        setWalletError(null);
        getWalletBalance()
            .then((res) => {
                setLiveBalance(res.walletBalance ?? 0);
                setWinningBalance(res.wallet?.winningBalance ?? 0);
                setLockedBalance(res.wallet?.lockedBalance ?? 0);
                setDepositBalance(res.wallet?.depositBalance ?? 0);
                setLifetimeWithdrawn(res.wallet?.lifetimeWithdrawn ?? 0);
                setWalletTxns(res.recentTransactions ?? []);
                updateUser({ walletBalance: res.walletBalance ?? 0 });
            })
            .catch((err: any) => {
                const msg = err?.response?.data?.message || 'Failed to load wallet data. Please try again.';
                setWalletError(msg);
                showToast(msg, 'error');
            })
            .finally(() => setWalletLoading(false));

        // Also load withdrawal history
        setWithdrawalsLoading(true);
        getMyWithdrawals()
            .then((res) => setWithdrawals(res.requests ?? []))
            .catch(() => { /* non-critical */ })
            .finally(() => setWithdrawalsLoading(false));
    }, [activeTab]);

    // ── Submit withdrawal request ─────────────────────────────────────────────
    const handleWithdraw = async () => {
        setWithdrawError(null);
        setWithdrawSuccess(null);
        const amount = parseFloat(withdrawAmount);
        if (!withdrawAmount || isNaN(amount) || amount < 100) {
            setWithdrawError('Minimum withdrawal is ₹100');
            return;
        }
        if (amount > winningBalance) {
            setWithdrawError('Insufficient winning balance. Only your winning balance can be withdrawn.');
            return;
        }
        if (!upiId.trim() || !/^[\w.\-]+@[\w]+$/.test(upiId.trim().toLowerCase())) {
            setWithdrawError('Enter a valid UPI ID (e.g. name@paytm)');
            return;
        }

        setWithdrawLoading(true);
        try {
            const res = await requestWithdrawal(amount, upiId.trim().toLowerCase());
            // Server returns the post-debit balance — use it directly
            if (res.walletBalance !== undefined) {
                setLiveBalance(res.walletBalance);
                updateUser({ walletBalance: res.walletBalance });
            }
            if (res.wallet) {
                setWinningBalance(res.wallet.winningBalance ?? 0);
                setLockedBalance(res.wallet.lockedBalance ?? 0);
                setDepositBalance(res.wallet.depositBalance ?? 0);
            }
            setWithdrawals((prev) => [res.request, ...prev]);
            setWithdrawSuccess(`Withdrawal of ₹${amount} submitted! It will be processed within 1–3 business days.`);
            setWithdrawAmount('');
            setUpiId('');
            setShowBankForm(false);
        } catch (err: any) {
            setWithdrawError(err?.response?.data?.message || 'Failed to submit withdrawal request');
        } finally {
            setWithdrawLoading(false);
            // Always re-fetch the true balance + withdrawal list from the server.
            // This corrects the display even when the debit succeeded but the
            // API response was incomplete (e.g. controller crashed mid-response).
            try {
                const [fresh, wdrList] = await Promise.all([
                    getWalletBalance(),
                    getMyWithdrawals(),
                ]);
                setLiveBalance(fresh.walletBalance ?? 0);
                setWinningBalance(fresh.wallet?.winningBalance ?? 0);
                setLockedBalance(fresh.wallet?.lockedBalance ?? 0);
                setDepositBalance(fresh.wallet?.depositBalance ?? 0);
                updateUser({ walletBalance: fresh.walletBalance ?? 0 });
                setWithdrawals(wdrList.requests ?? []);
            } catch {
                // Non-critical — the user can switch tabs to refresh
            }
        }
    };

    // ── Load UPI info on mount ────────────────────────────────────────────────
    useEffect(() => {
        getUpiInfo()
            .then((res) => setUpiInfo(res))
            .catch(() => { /* fallback handled in UI */ });
    }, []);

    // ── Fetch manual deposits when Wallet tab is active ───────────────────────
    useEffect(() => {
        if (activeTab !== 'Wallet') return;
        setManualDepositsLoading(true);
        getManualDeposits(1, 50)
            .then((res) => setManualDeposits(res.requests ?? []))
            .catch(() => { /* non-critical */ })
            .finally(() => setManualDepositsLoading(false));
    }, [activeTab]);

    // ── Handle Manual Deposit Submit ──────────────────────────────────────────
    const handleManualDepositSubmit = async () => {
        setDepositError(null);
        setDepositSuccess(null);
        const amount = parseInt(topUpAmount);
        if (!amount || isNaN(amount) || amount < 10) {
            setDepositError('Please enter a valid amount (minimum ₹10)');
            return;
        }
        if (amount > 50000) {
            setDepositError('Maximum top-up is ₹50,000');
            return;
        }
        if (!paymentMethod) {
            setDepositError('Please select a payment method');
            return;
        }
        if (!upiRefId.trim() || upiRefId.trim().length < 6) {
            setDepositError('Please enter a valid UPI Reference ID (at least 6 characters)');
            return;
        }

        setAddMoneyLoading(true);
        try {
            const res = await submitManualDeposit(amount, paymentMethod, upiRefId.trim());
            setDepositSuccess(res.message);
            setManualDeposits((prev) => [res.request, ...prev]);
            setDepositStep('submitted');
            setTopUpAmount('');
            setPaymentMethod('');
            setUpiRefId('');
            showToast('Deposit request submitted successfully!', 'success');
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Failed to submit deposit request';
            setDepositError(msg);
            showToast(msg, 'error');
        } finally {
            setAddMoneyLoading(false);
        }
    };

    // Reset deposit flow
    const resetDepositFlow = () => {
        setDepositStep('amount');
        setDepositError(null);
        setDepositSuccess(null);
        setTopUpAmount('');
        setPaymentMethod('');
        setUpiRefId('');
    };

    const tabs: TabType[] = ['Match History', 'Wallet', 'Profile'];


    // Validation helpers
    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const formatPhoneNumber = (value: string): string => {
        // Remove all non-numeric characters
        const numbers = value.replace(/\D/g, '');

        // Format as +91 XXXXX XXXXX for Indian numbers
        if (numbers.startsWith('91')) {
            const withoutCode = numbers.slice(2);
            if (withoutCode.length <= 5) {
                return `+91 ${withoutCode}`;
            }
            return `+91 ${withoutCode.slice(0, 5)} ${withoutCode.slice(5, 10)}`;
        }

        // If doesn't start with 91, assume it's without country code
        if (numbers.length <= 5) {
            return `+91 ${numbers}`;
        }
        return `+91 ${numbers.slice(0, 5)} ${numbers.slice(5, 10)}`;
    };

    const validatePhoneNumber = (phone: string): boolean => {
        const numbers = phone.replace(/\D/g, '');
        // Should have 12 digits (91 + 10 digits) or 10 digits
        return numbers.length === 12 || numbers.length === 10;
    };

    // Handle profile edit
    const handleEditClick = () => {
        setEditedData({ ...profileData });
        setIsEditMode(true);
    };

    const handleCancelEdit = () => {
        setEditedData({ ...profileData });
        setIsEditMode(false);
    };

    const [_isSaving, setIsSaving] = useState(false);

    const handleSaveProfile = async () => {
        // Comprehensive validation
        const errors: string[] = [];

        // Full Name validation
        if (!editedData.fullName.trim()) {
            errors.push('Full name is required');
        } else if (editedData.fullName.trim().length < 2) {
            errors.push('Full name must be at least 2 characters');
        } else if (editedData.fullName.length > 50) {
            errors.push('Full name must not exceed 50 characters');
        } else if (!/^[a-zA-Z\s]+$/.test(editedData.fullName)) {
            errors.push('Full name should only contain letters and spaces');
        }

        // Email validation
        if (!editedData.email.trim()) {
            errors.push('Email is required');
        } else if (!validateEmail(editedData.email)) {
            errors.push('Please enter a valid email address');
        }

        // Phone validation
        if (!editedData.phone.trim()) {
            errors.push('Phone number is required');
        } else if (!validatePhoneNumber(editedData.phone)) {
            errors.push('Please enter a valid 10-digit phone number');
        }

        // Game ID validation (optional - only validate if provided)
        if (editedData.gameId.trim()) {
            if (editedData.gameId.length < 3) {
                errors.push('Game ID must be at least 3 characters');
            } else if (editedData.gameId.length > 20) {
                errors.push('Game ID must not exceed 20 characters');
            } else if (!/^[a-zA-Z0-9_]+$/.test(editedData.gameId)) {
                errors.push('Game ID should only contain letters, numbers, and underscores');
            }
        }

        // Location validation (optional - only validate if provided)
        if (editedData.location.trim() && editedData.location.length > 100) {
            errors.push('Location must not exceed 100 characters');
        }

        // Bio validation
        if (editedData.bio.length > 500) {
            errors.push('Bio must not exceed 500 characters');
        }

        // Show errors if any
        if (errors.length > 0) {
            showToast(errors.join(' • '), 'error');
            return;
        }

        // Save to backend API
        setIsSaving(true);
        try {
            const response = await updateProfile({
                name: editedData.fullName,
                phone: editedData.phone,
                gameId: editedData.gameId || undefined,
                location: editedData.location || undefined,
                bio: editedData.bio || undefined,
            });

            // Update local state with response
            setProfileData({
                fullName: response.user.name || '',
                email: response.user.email || '',
                phone: response.user.phone || '',
                gameId: response.user.gameId || '',
                dateOfBirth: response.user.dateOfBirth || '',
                location: response.user.location || '',
                bio: response.user.bio || '',
            });

            // Update localStorage with new user data
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const userData = JSON.parse(storedUser);
                localStorage.setItem('user', JSON.stringify({ ...userData, ...response.user }));
            }

            setIsEditMode(false);
            showToast('Profile updated successfully!', 'success');
        } catch (error: any) {
            console.error('Failed to update profile:', error);
            showToast(error.response?.data?.message || 'Failed to update profile. Please try again.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleInputChange = (field: keyof typeof profileData, value: string) => {
        let processedValue = value;

        // Apply specific formatting/validation per field
        switch (field) {
            case 'fullName':
                // Limit to 50 characters, allow only letters and spaces
                processedValue = value.slice(0, 50);
                break;
            case 'email':
                // Trim spaces and limit to 100 characters
                processedValue = value.trim().slice(0, 100);
                break;
            case 'phone':
                // Format phone number
                processedValue = formatPhoneNumber(value);
                break;
            case 'gameId':
                // Limit to 20 characters, allow only alphanumeric and underscore
                processedValue = value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
                break;
            case 'location':
                // Limit to 100 characters
                processedValue = value.slice(0, 100);
                break;
            case 'bio':
                // Limit to 500 characters
                processedValue = value.slice(0, 500);
                break;
        }

        setEditedData(prev => ({ ...prev, [field]: processedValue }));
    };

    // Handle logout
    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    // ── Helpers for My Tournaments ──────────────────────────────────────────────
    const GAME_ICONS: Record<string, React.ReactNode> = {
        'PUBG Mobile': <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
        'Free Fire': <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>,
        'Call of Duty Mobile': <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-7.07l-2.83 2.83M9.76 14.24l-2.83 2.83m11.14 0l-2.83-2.83M9.76 9.76L6.93 6.93" /></svg>,
        'Valorant': <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
        'CS:GO': <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 5v5l3 3" /></svg>,
        'Other': <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    };




    /** Format ISO date string for display */
    const formatTournamentDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    const formatTournamentTime = (startIso: string, endIso: string) => {
        const fmt = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${fmt(startIso)} - ${fmt(endIso)}`;
    };

    /** Filter match history based on filter selection */
    const getFilteredMatchHistory = (): MatchHistoryItem[] => {
        let filtered = [...matchHistory];
        if (matchFilter === 'won') {
            filtered = filtered.filter((m) => m.isWinner);
        }
        // Sort by start date descending (most recent first)
        filtered.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        return filtered;
    };

    /** Computed stats from enriched match history.
     *  totalMatches uses the persistent DB-backed lifetime counter (user.matchCount)
     *  so it never resets when tournaments end or history hasn't loaded yet. */
    const matchStats = {
        totalMatches: user?.matchCount ?? 0,   // lifetime count from DB — never derived from local state
        matchesWon: user?.winCount ?? 0,    // lifetime count from DB — never derived from local state
        winRate: matchHistory.length > 0
            ? Math.round((matchHistory.filter((m) => m.isWinner).length / matchHistory.length) * 100)
            : 0,
        totalEarnings: matchHistory.reduce((sum, m) => sum + m.prizeWon, 0),
    };

    return (
        <div className="min-h-screen bg-dark-900">
            <Header />

            {/* Page Header */}
            <section className="relative pt-24 sm:pt-28 md:pt-32 pb-8 sm:pb-12 px-4 sm:px-6" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 100%)' }}>
                <div className="container mx-auto max-w-7xl">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6">
                        {/* Title */}
                        <div>
                            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-2">
                                <span className="text-white">My </span>
                                <span style={{ background: 'linear-gradient(135deg, #FF8C00, #FF5500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Dashboard</span>
                            </h1>
                            <p className="text-gray-500 text-sm sm:text-base">
                                Track your tournaments, earnings, and gaming performance
                            </p>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex justify-center md:justify-end gap-2 sm:gap-4">
                            <div
                                className="text-right rounded-xl px-3 py-2 sm:px-5 sm:py-3"
                                style={{
                                    background: 'rgba(0,0,0,0.55)',
                                    backdropFilter: 'blur(20px) saturate(1.6)',
                                    WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                }}
                            >
                                <p className="text-xl sm:text-2xl md:text-3xl font-black" style={{ color: '#FF8C00' }}>₹{(winningBalance ?? 0).toLocaleString()}</p>
                                <p className="text-gray-500 text-xs mt-0.5">Total Earnings</p>
                            </div>
                            <div
                                className="text-right rounded-xl px-3 py-2 sm:px-5 sm:py-3"
                                style={{
                                    background: 'rgba(0,0,0,0.55)',
                                    backdropFilter: 'blur(20px) saturate(1.6)',
                                    WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                }}
                            >
                                <p className="text-xl sm:text-2xl md:text-3xl font-black" style={{ color: '#FF8C00' }}>{matchStats.matchesWon}</p>
                                <p className="text-gray-500 text-xs mt-0.5">Matches Won</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Dashboard Tab Navigation */}
            <section
                className="relative"
                style={{
                    background: 'rgba(0, 0, 0, 0.98)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
            >
                {/* Top accent line — distinct gradient from the TournamentsPage bar */}
                <div
                    className="w-full h-px"
                    style={{ background: 'linear-gradient(90deg, rgba(255,140,0,0.6), rgba(255,80,0,0.2), transparent)' }}
                />

                <div className="container mx-auto max-w-7xl px-4 sm:px-6">
                    <div className="flex items-stretch">

                        {/* Left eyebrow label — desktop only */}
                        <div
                            className="hidden md:flex items-center pr-5 mr-1 flex-shrink-0"
                            style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
                        >
                            <span
                                className="text-xs font-bold tracking-widest uppercase"
                                style={{ color: 'rgba(255,140,0,0.55)', letterSpacing: '0.15em' }}
                            >
                                Dashboard
                            </span>
                        </div>

                        {/* Tab items */}
                        <div className="flex overflow-x-auto scrollbar-hide flex-1">
                            {(() => {
                                const tabMeta: Record<TabType, { icon: React.ReactNode; accent: string }> = {
                                    'Overview': { icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, accent: '#FF8C00' },
                                    'My Tournaments': { icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>, accent: '#F59E0B' },
                                    'Match History': { icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, accent: '#818CF8' },
                                    'Wallet': { icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>, accent: '#34D399' },
                                    'Profile': { icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>, accent: '#F472B6' },
                                };
                                return tabs.map((tab) => {
                                    const isActive = activeTab === tab;
                                    const { icon, accent } = tabMeta[tab];
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

                                            {/* Icon */}
                                            <span
                                                className="relative z-10 leading-none transition-transform duration-200"
                                                style={{
                                                    fontSize: '1rem',
                                                    transform: isActive ? 'translateY(-1px)' : 'none',
                                                }}
                                            >
                                                {icon}
                                            </span>

                                            {/* Label */}
                                            <span
                                                className="relative z-10 transition-colors duration-200 group-hover:text-white"
                                                style={{ letterSpacing: '0.01em' }}
                                            >
                                                {tab}
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
                                });
                            })()}
                        </div>

                        {/* Right: active tab label chip — desktop only */}
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
                                {activeTab}
                            </span>
                        </div>

                    </div>
                </div>
            </section>

            {/* Main Content */}
            <section className="py-6 px-4 sm:py-8 sm:px-6 md:py-12">
                <div className="container mx-auto max-w-7xl">


                    {activeTab === 'Match History' && (
                        <>
                            {/* Loading State */}
                            {matchHistoryLoading && (
                                <div className="text-center py-20">
                                    <div className="inline-block w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mb-4"></div>
                                    <p className="text-gray-500 text-sm font-medium tracking-wide">Loading match history…</p>
                                </div>
                            )}

                            {/* Error State */}
                            {matchHistoryError && !matchHistoryLoading && (
                                <div
                                    className="text-center py-16 rounded-xl"
                                    style={{
                                        background: 'rgba(0,0,0,0.55)',
                                        backdropFilter: 'blur(20px) saturate(1.6)',
                                        WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
                                        border: '1px solid rgba(255,255,255,0.07)',
                                    }}
                                >
                                    <div className="mb-3 opacity-40"><svg className="w-10 h-10 mx-auto text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>
                                    <h3 className="text-white text-lg font-bold mb-1">Failed to Load Match History</h3>
                                    <p className="text-gray-500 text-sm mb-6">{matchHistoryError}</p>
                                    <button
                                        onClick={() => {
                                            setMatchHistoryError(null);
                                            setMatchHistoryLoading(true);
                                            getMatchHistory()
                                                .then((res) => setMatchHistory(res.matches))
                                                .catch((err: any) => setMatchHistoryError(err?.response?.data?.message || 'Failed to load'))
                                                .finally(() => setMatchHistoryLoading(false));
                                        }}
                                        className="px-5 py-2 rounded-lg font-semibold text-sm text-white transition-all duration-200"
                                        style={{ background: 'linear-gradient(135deg, #FF8C00, #FF5500)' }}
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}

                            {!matchHistoryLoading && !matchHistoryError && (
                                <>
                                    {/* Match Stats Cards */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
                                        {(() => {
                                            const cards: { label: string; value: string | number; accent: string; icon: React.ReactNode }[] = [
                                                { label: 'TOTAL MATCHES', value: matchStats.totalMatches, accent: '#FF8C00', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> },
                                                { label: 'MATCHES WON', value: matchStats.matchesWon, accent: '#22C55E', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg> },
                                            ];
                                            return cards.map((c) => (
                                                <div
                                                    key={c.label}
                                                    className="group relative overflow-hidden rounded-xl transition-all duration-300 hover:-translate-y-0.5"
                                                    style={{
                                                        background: 'rgba(0,0,0,0.55)',
                                                        backdropFilter: 'blur(20px) saturate(1.6)',
                                                        WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
                                                        border: '1px solid rgba(255,255,255,0.07)',
                                                        boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)',
                                                    }}
                                                >
                                                    {/* Top glow line */}
                                                    <div
                                                        className="absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                                                        style={{ background: `linear-gradient(90deg, ${c.accent}, ${c.accent}40)` }}
                                                    />
                                                    <div className="p-3 sm:p-5">
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div
                                                                className="w-9 h-9 rounded-lg flex items-center justify-center text-sm"
                                                                style={{ background: `${c.accent}15`, color: c.accent }}
                                                            >
                                                                {c.icon}
                                                            </div>
                                                        </div>
                                                        <p className="text-lg sm:text-2xl font-black text-white mb-1">{c.value}</p>
                                                        <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-gray-500">{c.label}</p>
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>

                                    {/* Filters */}
                                    <div
                                        className="flex overflow-x-auto scrollbar-hide rounded-xl mb-6 w-fit"
                                        style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
                                    >
                                        <button
                                            onClick={() => setMatchFilter('all')}
                                            className="px-5 py-2 text-xs font-semibold transition-all duration-200 whitespace-nowrap"
                                            style={{
                                                color: matchFilter === 'all' ? '#fff' : 'rgba(255,255,255,0.4)',
                                                background: matchFilter === 'all' ? 'linear-gradient(135deg, #FF8C00, #FF5500)' : 'transparent',
                                            }}
                                        >
                                            All ({matchHistory.length})
                                        </button>
                                        <button
                                            onClick={() => setMatchFilter('won')}
                                            className="px-5 py-2 text-xs font-semibold transition-all duration-200 whitespace-nowrap"
                                            style={{
                                                color: matchFilter === 'won' ? '#fff' : 'rgba(255,255,255,0.4)',
                                                background: matchFilter === 'won' ? 'linear-gradient(135deg, #FF8C00, #FF5500)' : 'transparent',
                                            }}
                                        >
                                            Won ({matchHistory.filter((m) => m.isWinner).length})
                                        </button>
                                    </div>

                                    {/* Match List */}
                                    <div className="space-y-3">
                                        {getFilteredMatchHistory().length > 0 ? (
                                            getFilteredMatchHistory().map((match) => {
                                                const gameIcon = GAME_ICONS[match.game] || GAME_ICONS['Other'];
                                                const isWon = match.isWinner;
                                                const accentColor = isWon ? '#22C55E' : '#EF4444';
                                                return (
                                                    <div
                                                        key={match.tournamentId}
                                                        className="group relative overflow-hidden rounded-xl transition-all duration-300 hover:-translate-y-0.5"
                                                        style={{
                                                            background: 'rgba(0,0,0,0.55)',
                                                            backdropFilter: 'blur(20px) saturate(1.6)',
                                                            WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
                                                            border: '1px solid rgba(255,255,255,0.07)',
                                                            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                                                        }}
                                                    >
                                                        {/* Left accent bar */}
                                                        <div
                                                            className="absolute left-0 top-0 bottom-0 w-[3px] opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                                                            style={{ background: accentColor }}
                                                        />

                                                        <div className="flex items-center gap-3 p-4 sm:p-5 pl-5 sm:pl-6">
                                                            {/* Game Icon */}
                                                            <div
                                                                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg"
                                                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                                                            >
                                                                {gameIcon}
                                                            </div>

                                                            {/* Title + Date */}
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="text-white font-bold text-sm truncate">{match.title}</h3>
                                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 mt-0.5">
                                                                    <span className="truncate">{match.game}</span>
                                                                    <span className="hidden sm:inline">•</span>
                                                                    <span className="basis-full sm:basis-auto whitespace-nowrap">{formatTournamentDate(match.startDate)}</span>
                                                                    <span className="hidden sm:inline">•</span>
                                                                    <span className="hidden sm:inline whitespace-nowrap">{formatTournamentTime(match.startDate, match.endDate)}</span>
                                                                </div>
                                                            </div>

                                                            {/* Match Stats — always inline right */}
                                                            <div className="flex items-center gap-3 sm:gap-6 flex-shrink-0">
                                                                {/* Entry Fee */}
                                                                <div className="text-center">
                                                                    <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>
                                                                        {match.entryFee > 0 ? `₹${match.entryFee.toLocaleString()}` : 'FREE'}
                                                                    </p>
                                                                    <p className="text-[10px] text-gray-600 mt-0.5">Entry</p>
                                                                </div>

                                                                {/* Rank Badge */}
                                                                <div className="text-center">
                                                                    <span
                                                                        className="inline-block px-2 py-0.5 rounded text-[10px] font-bold"
                                                                        style={{
                                                                            background: match.rank && match.rank <= 3 ? `${accentColor}15` : 'rgba(255,255,255,0.05)',
                                                                            color: match.rank && match.rank <= 3 ? accentColor : 'rgba(255,255,255,0.4)',
                                                                        }}
                                                                    >
                                                                        {match.rank ? `#${match.rank}` : '—'}
                                                                    </span>
                                                                    <p className="text-[10px] text-gray-600 mt-0.5">Rank</p>
                                                                </div>

                                                                {/* Prize Won — only shown on the Won tab */}
                                                                {matchFilter === 'won' && (
                                                                    <div className="text-center">
                                                                        <p className="text-sm font-bold" style={{ color: '#22C55E' }}>
                                                                            {`+₹${match.prizeWon.toLocaleString()}`}
                                                                        </p>
                                                                        <p className="text-[10px] text-gray-600 mt-0.5">Prize</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div
                                                className="text-center py-14 rounded-xl"
                                                style={{
                                                    background: 'rgba(0,0,0,0.55)',
                                                    backdropFilter: 'blur(20px) saturate(1.6)',
                                                    WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
                                                    border: '1px solid rgba(255,255,255,0.07)',
                                                }}
                                            >
                                                <div className="mb-3 opacity-40"><svg className="w-10 h-10 mx-auto text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                                                <p className="text-white text-base font-bold mb-1">No matches found</p>
                                                <p className="text-gray-500 text-sm">
                                                    {matchFilter === 'won'
                                                        ? 'You haven\'t won any tournaments yet. Keep playing!'
                                                        : 'Join tournaments to see your match history here.'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {activeTab === 'Wallet' && (
                        <>
                            {/* Wallet API error state */}
                            {walletError && !walletLoading && (
                                <div
                                    className="text-center py-16 rounded-xl"
                                    style={{
                                        background: 'rgba(0,0,0,0.55)',
                                        backdropFilter: 'blur(20px) saturate(1.6)',
                                        WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
                                        border: '1px solid rgba(255,255,255,0.07)',
                                    }}
                                >
                                    <div className="mb-3 opacity-40"><svg className="w-10 h-10 mx-auto text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>
                                    <h3 className="text-white text-lg font-bold mb-1">Failed to Load Wallet</h3>
                                    <p className="text-gray-500 text-sm mb-6">{walletError}</p>
                                    <button
                                        onClick={() => setActiveTab('Overview' as any)}
                                        className="text-gray-500 mr-4 underline text-sm"
                                    >
                                        Go back
                                    </button>
                                    <button
                                        onClick={() => {
                                            setWalletError(null);
                                            setWalletLoading(true);
                                            getWalletBalance()
                                                .then((res) => {
                                                    setLiveBalance(res.walletBalance);
                                                    setWalletTxns(res.recentTransactions ?? []);
                                                    updateUser({ walletBalance: res.walletBalance });
                                                })
                                                .catch((err: any) => setWalletError(err?.response?.data?.message || 'Failed to load wallet data'))
                                                .finally(() => setWalletLoading(false));
                                        }}
                                        className="px-5 py-2 rounded-lg font-semibold text-sm text-white transition-all duration-200"
                                        style={{ background: 'linear-gradient(135deg, #FF8C00, #FF5500)' }}
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}

                            {/* Balance Cards + Add Money + Transactions */}
                            {!walletError && (
                                <>
                                    {/* Balance Cards */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
                                        {(() => {
                                            const walletCards = [
                                                { label: 'AVAILABLE BALANCE', value: walletLoading ? '...' : `₹${(depositBalance ?? 0).toLocaleString()}`, accent: '#22C55E', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                                                { label: 'PENDING WITHDRAWAL', value: walletLoading ? '...' : `₹${(lockedBalance ?? 0).toLocaleString()}`, accent: '#EAB308', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                                                { label: 'TOTAL EARNINGS', value: walletLoading ? '...' : `₹${(winningBalance ?? 0).toLocaleString()}`, accent: '#A855F7', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg> },
                                                { label: 'TOTAL WITHDRAWN', value: walletLoading ? '...' : `₹${(lifetimeWithdrawn ?? 0).toLocaleString()}`, accent: '#3B82F6', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> },
                                            ];
                                            return walletCards.map((c) => (
                                                <div
                                                    key={c.label}
                                                    className="group relative overflow-hidden rounded-xl transition-all duration-300 hover:-translate-y-0.5"
                                                    style={{
                                                        background: 'rgba(0,0,0,0.55)',
                                                        backdropFilter: 'blur(20px) saturate(1.6)',
                                                        WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
                                                        border: '1px solid rgba(255,255,255,0.07)',
                                                        boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)',
                                                    }}
                                                >
                                                    {/* Top glow line */}
                                                    <div
                                                        className="absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                                                        style={{ background: `linear-gradient(90deg, ${c.accent}, ${c.accent}40)` }}
                                                    />
                                                    <div className="p-3 sm:p-5">
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div
                                                                className="w-9 h-9 rounded-lg flex items-center justify-center text-sm"
                                                                style={{ background: `${c.accent}15`, color: c.accent }}
                                                            >
                                                                {c.icon}
                                                            </div>
                                                        </div>
                                                        <p className="text-lg sm:text-2xl font-black text-white mb-1">{c.value}</p>
                                                        <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-gray-500">{c.label}</p>
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>

                                    {/* Add Money & Withdraw Money */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 sm:mb-8">
                                        {/* Add Money — Manual UPI Flow */}
                                        <div
                                            className="rounded-xl p-5 sm:p-6"
                                            style={{
                                                background: 'rgba(0,0,0,0.55)',
                                                backdropFilter: 'blur(20px) saturate(1.6)',
                                                WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
                                                border: '1px solid rgba(255,255,255,0.07)',
                                                boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                                            }}
                                        >
                                            <div className="flex items-center justify-between mb-5">
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                                                        style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}
                                                    >
                                                        ⊕
                                                    </div>
                                                    <h3 className="text-white text-sm font-bold uppercase tracking-wide">Add Money</h3>
                                                </div>
                                                {depositStep !== 'amount' && (
                                                    <button
                                                        onClick={resetDepositFlow}
                                                        className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                                                    >
                                                        ← Back
                                                    </button>
                                                )}
                                            </div>

                                            {/* Step indicator */}
                                            {depositStep !== 'submitted' && (
                                                <div className="flex items-center gap-1 mb-5">
                                                    {['amount', 'qr', 'form'].map((step, idx) => (
                                                        <React.Fragment key={step}>
                                                            <div
                                                                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300"
                                                                style={{
                                                                    background: depositStep === step ? '#22C55E' : (['amount', 'qr', 'form'].indexOf(depositStep) > idx ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)'),
                                                                    color: depositStep === step ? '#fff' : (['amount', 'qr', 'form'].indexOf(depositStep) > idx ? '#22C55E' : 'rgba(255,255,255,0.3)'),
                                                                }}
                                                            >
                                                                {['amount', 'qr', 'form'].indexOf(depositStep) > idx ? '✓' : idx + 1}
                                                            </div>
                                                            {idx < 2 && (
                                                                <div className="flex-1 h-px" style={{ background: ['amount', 'qr', 'form'].indexOf(depositStep) > idx ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.06)' }} />
                                                            )}
                                                        </React.Fragment>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Error banner */}
                                            {depositError && (
                                                <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
                                                    <svg className="w-4 h-4 inline-block mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> {depositError}
                                                </div>
                                            )}

                                            {/* STEP 1: Amount */}
                                            {depositStep === 'amount' && (
                                                <>
                                                    <div className="mb-4">
                                                        <label className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold mb-2 block">Amount (₹10 – ₹50,000)</label>
                                                        <input
                                                            type="number"
                                                            min="10"
                                                            max="50000"
                                                            placeholder="Enter amount"
                                                            value={topUpAmount}
                                                            onChange={(e) => setTopUpAmount(e.target.value)}
                                                            className="w-full text-white px-4 py-3 rounded-lg focus:outline-none transition-all text-sm"
                                                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                                                            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(34,197,94,0.4)'; }}
                                                            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-2 mb-4">
                                                        {[500, 1000, 2000, 5000].map((amt) => (
                                                            <button
                                                                key={amt}
                                                                onClick={() => setTopUpAmount(String(amt))}
                                                                className="py-2.5 rounded-lg text-xs font-medium transition-all duration-200"
                                                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
                                                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.12)'; e.currentTarget.style.color = '#22C55E'; e.currentTarget.style.borderColor = 'rgba(34,197,94,0.3)'; }}
                                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                                                            >
                                                                ₹{amt.toLocaleString()}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const amt = parseInt(topUpAmount);
                                                            if (!amt || amt < 10) { setDepositError('Minimum amount is ₹10'); return; }
                                                            if (amt > 50000) { setDepositError('Maximum amount is ₹50,000'); return; }
                                                            setDepositError(null);
                                                            setDepositStep('qr');
                                                        }}
                                                        disabled={!topUpAmount.trim()}
                                                        className="w-full py-3 rounded-lg font-semibold text-sm text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                                        style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)', boxShadow: '0 0 14px rgba(34,197,94,0.2)' }}
                                                    >
                                                        Continue to Payment →
                                                    </button>
                                                </>
                                            )}

                                            {/* STEP 2: QR Code */}
                                            {depositStep === 'qr' && (
                                                <>
                                                    <div className="text-center mb-4">
                                                        <p className="text-gray-400 text-xs mb-1">Pay <span className="text-white font-bold text-lg">₹{parseInt(topUpAmount).toLocaleString()}</span> to</p>
                                                        <p className="text-green-400 font-bold text-sm">{upiInfo?.upiId || 'medeep@slc'}</p>
                                                        <p className="text-gray-500 text-xs mt-0.5">{upiInfo?.accountHolder || 'Deepanshu Kashyap'}</p>
                                                    </div>
                                                    <div className="flex justify-center mb-4">
                                                        <div className="bg-white rounded-xl p-3" style={{ maxWidth: '200px' }}>
                                                            <img
                                                                src={upiInfo?.qrImagePath || '/upi-qr.jpeg'}
                                                                alt="UPI QR Code"
                                                                className="w-full h-auto"
                                                                style={{ imageRendering: 'crisp-edges' }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="p-3 rounded-lg mb-4 text-xs" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.15)', color: '#EAB308' }}>
                                                        <p className="font-semibold mb-1">📱 How to pay:</p>
                                                        <ol className="list-decimal list-inside space-y-0.5 text-gray-400">
                                                            <li>Open GPay / PhonePe / Paytm</li>
                                                            <li>Scan this QR code or pay to UPI ID above</li>
                                                            <li>Pay exactly <span className="text-white font-semibold">₹{parseInt(topUpAmount).toLocaleString()}</span></li>
                                                            <li>Note your <span className="text-yellow-400 font-semibold">UPI Reference ID</span></li>
                                                        </ol>
                                                    </div>
                                                    <button
                                                        onClick={() => { setDepositError(null); setDepositStep('form'); }}
                                                        className="w-full py-3 rounded-lg font-semibold text-sm text-white transition-all duration-200"
                                                        style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)', boxShadow: '0 0 14px rgba(34,197,94,0.2)' }}
                                                    >
                                                        I've Completed Payment →
                                                    </button>
                                                </>
                                            )}

                                            {/* STEP 3: Payment Proof Form */}
                                            {depositStep === 'form' && (
                                                <>
                                                    <div className="mb-4">
                                                        <label className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold mb-2 block">Payment Method *</label>
                                                        <select
                                                            value={paymentMethod}
                                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                                            className="w-full text-white px-4 py-3 rounded-lg focus:outline-none transition-all text-sm appearance-none cursor-pointer"
                                                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                                                        >
                                                            <option value="" style={{ background: '#1a1a1a' }}>Select payment method...</option>
                                                            <option value="gpay" style={{ background: '#1a1a1a' }}>Google Pay (GPay)</option>
                                                            <option value="phonepe" style={{ background: '#1a1a1a' }}>PhonePe</option>
                                                            <option value="paytm" style={{ background: '#1a1a1a' }}>Paytm</option>
                                                            <option value="upi_other" style={{ background: '#1a1a1a' }}>UPI Other</option>
                                                        </select>
                                                    </div>
                                                    <div className="mb-4">
                                                        <label className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold mb-2 block">UPI Reference ID *</label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. 412345678901"
                                                            value={upiRefId}
                                                            onChange={(e) => setUpiRefId(e.target.value.replace(/[^a-zA-Z0-9\-_]/g, '').toUpperCase())}
                                                            maxLength={50}
                                                            className="w-full text-white px-4 py-3 rounded-lg focus:outline-none transition-all text-sm font-mono"
                                                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                                                            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(34,197,94,0.4)'; }}
                                                            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                                                        />
                                                        <p className="text-gray-600 text-[10px] mt-1">Find this in your UPI app's transaction details</p>
                                                    </div>
                                                    <div className="p-3 rounded-lg mb-4 text-xs" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', color: '#60A5FA' }}>
                                                        <p>⏱ Payment will be verified within <strong className="text-white">2–3 hours</strong>. Please ensure you add money before joining tournaments. For issues, contact support.</p>
                                                    </div>
                                                    <button
                                                        onClick={handleManualDepositSubmit}
                                                        disabled={addMoneyLoading || !paymentMethod || !upiRefId.trim()}
                                                        className="w-full py-3 rounded-lg font-semibold text-sm text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                                        style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)', boxShadow: '0 0 14px rgba(34,197,94,0.2)' }}
                                                    >
                                                        {addMoneyLoading ? 'Submitting...' : 'Submit Deposit Request'}
                                                    </button>
                                                </>
                                            )}

                                            {/* STEP 4: Submitted */}
                                            {depositStep === 'submitted' && (
                                                <div className="text-center py-4">
                                                    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)' }}>
                                                        <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                    <h4 className="text-white font-bold text-lg mb-2">Request Submitted!</h4>
                                                    <p className="text-gray-400 text-sm mb-1">{depositSuccess || 'Your deposit request has been submitted.'}</p>
                                                    <div className="inline-block mt-3 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: 'rgba(234,179,8,0.1)', color: '#EAB308', border: '1px solid rgba(234,179,8,0.2)' }}>
                                                        ⏳ Pending Verification
                                                    </div>
                                                    <button
                                                        onClick={resetDepositFlow}
                                                        className="block mx-auto mt-5 text-sm text-gray-500 hover:text-white transition-colors underline"
                                                    >
                                                        Add more money
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Withdraw Money */}
                                        <div
                                            className="rounded-xl p-5 sm:p-6"
                                            style={{
                                                background: 'rgba(0,0,0,0.55)',
                                                backdropFilter: 'blur(20px) saturate(1.6)',
                                                WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
                                                border: '1px solid rgba(255,255,255,0.07)',
                                                boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                                            }}
                                        >
                                            <div className="flex items-center gap-2.5 mb-5">
                                                <div
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                                                    style={{ background: 'rgba(255,140,0,0.15)', color: '#FF8C00' }}
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                                                </div>
                                                <h3 className="text-white text-sm font-bold uppercase tracking-wide">Withdraw Money</h3>
                                            </div>

                                            {/* Success banner */}
                                            {withdrawSuccess && (
                                                <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22C55E' }}>
                                                    <svg className="w-4 h-4 inline-block mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> {withdrawSuccess}
                                                </div>
                                            )}

                                            {/* Error banner */}
                                            {withdrawError && (
                                                <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
                                                    <svg className="w-4 h-4 inline-block mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> {withdrawError}
                                                </div>
                                            )}

                                            {/* Amount */}
                                            <div className="mb-4">
                                                <label className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold mb-2 block">Amount (₹)</label>
                                                <input
                                                    type="number"
                                                    min="100"
                                                    placeholder="Min ₹100"
                                                    value={withdrawAmount}
                                                    onChange={(e) => { setWithdrawAmount(e.target.value); setWithdrawError(null); }}
                                                    className="w-full text-white px-4 py-3 rounded-lg focus:outline-none transition-all text-sm"
                                                    style={{
                                                        background: 'rgba(255,255,255,0.04)',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                    }}
                                                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255,140,0,0.4)'; }}
                                                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                                                />
                                                <p className="text-gray-600 text-xs mt-1">Withdrawable Earnings: ₹{(winningBalance ?? 0).toLocaleString()} • Min: ₹100</p>
                                            </div>

                                            {/* Quick Amount Buttons */}
                                            <div className="grid grid-cols-4 gap-2 mb-4">
                                                {[500, 1000, 2000, 5000].map((amt) => (
                                                    <button
                                                        key={amt}
                                                        onClick={() => { setWithdrawAmount(String(amt)); setWithdrawError(null); }}
                                                        disabled={amt > winningBalance}
                                                        className="py-2.5 rounded-lg text-xs font-medium transition-all duration-200 disabled:opacity-20 disabled:cursor-not-allowed"
                                                        style={{
                                                            background: 'rgba(255,255,255,0.04)',
                                                            border: '1px solid rgba(255,255,255,0.06)',
                                                            color: 'rgba(255,255,255,0.5)',
                                                        }}
                                                        onMouseEnter={(e) => { if (amt <= winningBalance) { e.currentTarget.style.background = 'rgba(255,140,0,0.12)'; e.currentTarget.style.color = '#FF8C00'; e.currentTarget.style.borderColor = 'rgba(255,140,0,0.3)'; } }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                                                    >
                                                        ₹{amt >= 1000 ? `${amt / 1000}k` : amt}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* UPI ID Input */}
                                            <div className="mb-4">
                                                <label className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold mb-1.5 block">UPI ID *</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. name@paytm, 9999999999@ybl"
                                                    value={upiId}
                                                    onChange={(e) => { setUpiId(e.target.value); setWithdrawError(null); }}
                                                    className="w-full text-white px-3 py-2.5 rounded-lg focus:outline-none text-sm transition-all"
                                                    style={{
                                                        background: 'rgba(255,255,255,0.04)',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                    }}
                                                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255,140,0,0.4)'; }}
                                                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                                                />
                                                <p className="text-gray-600 text-xs mt-1">Enter your UPI ID linked to your bank account</p>
                                            </div>

                                            <button
                                                onClick={handleWithdraw}
                                                disabled={withdrawLoading || !withdrawAmount || !upiId.trim()}
                                                className="w-full py-3 rounded-lg font-semibold text-sm text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                                style={{ background: 'linear-gradient(135deg, #FF8C00, #FF5500)', boxShadow: '0 0 14px rgba(255,140,0,0.2)' }}
                                            >
                                                {withdrawLoading ? 'Submitting...' : !upiId.trim() ? 'Enter UPI ID First' : 'Submit Withdrawal Request'}
                                            </button>
                                            <p className="text-gray-600 text-xs mt-2 text-center">Amount is held immediately. Paid within 1–3 business days.</p>
                                        </div>

                                    </div>

                                    {/* Transaction History */}
                                    <div
                                        className="rounded-xl p-5 sm:p-6"
                                        style={{
                                            background: 'rgba(0,0,0,0.55)',
                                            backdropFilter: 'blur(20px) saturate(1.6)',
                                            WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
                                            border: '1px solid rgba(255,255,255,0.07)',
                                            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-5">
                                            <h3 className="text-sm font-bold text-white uppercase tracking-wide">Transaction History</h3>
                                            {walletTxns.length > 0 && (
                                                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                                                    {walletTxns.length} total
                                                </span>
                                            )}
                                        </div>

                                        {walletLoading ? (
                                            <div className="text-center py-10">
                                                <p className="text-gray-500 text-sm">Loading transactions...</p>
                                            </div>
                                        ) : walletTxns.length === 0 ? (
                                            <div className="text-center py-10">
                                                <div className="mb-2 opacity-40"><svg className="w-8 h-8 mx-auto text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg></div>
                                                <p className="text-gray-500 text-sm">No transactions yet. Add money to get started!</p>
                                            </div>
                                        ) : (() => {
                                            const sortedTxns = [...walletTxns].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                                            const visibleTxns = showAllTxns ? sortedTxns : sortedTxns.slice(0, 3);
                                            const hasMore = sortedTxns.length > 3;
                                            return (
                                                <>
                                                    <div
                                                        className="space-y-2 transition-all duration-300"
                                                        style={showAllTxns ? { maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' } : {}}
                                                    >
                                                        {visibleTxns.map((txn) => {
                                                            const isIncome = ['credit', 'winning_credit', 'withdrawal_refund', 'refund', 'manual_deposit'].includes(txn.type as string);
                                                            const icon = txn.type === 'winning_credit' ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                                                                : txn.type === 'withdrawal_refund' ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                                                    : txn.type === 'withdrawal_request' ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                                        : txn.type === 'tournament_entry' ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                                            : isIncome ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
                                                            const accentColor = isIncome ? '#22C55E' : '#EF4444';
                                                            return (
                                                                <div
                                                                    key={txn._id}
                                                                    className="group relative flex items-center justify-between p-3 sm:p-4 rounded-lg overflow-hidden transition-all duration-200"
                                                                    style={{
                                                                        background: 'rgba(255,255,255,0.02)',
                                                                        border: '1px solid rgba(255,255,255,0.05)',
                                                                    }}
                                                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                                                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                                                                >
                                                                    {/* Left accent */}
                                                                    <div className="absolute left-0 top-0 bottom-0 w-[2px] opacity-50 group-hover:opacity-100 transition-opacity" style={{ background: accentColor }} />

                                                                    <div className="flex items-center gap-3 flex-1 min-w-0 pl-2">
                                                                        <div
                                                                            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
                                                                            style={{ background: `${accentColor}15` }}
                                                                        >
                                                                            {icon}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-white font-semibold text-sm truncate">{txn.description}</p>
                                                                            <p className="text-gray-500 text-xs mt-0.5">
                                                                                {new Date(txn.createdAt).toLocaleDateString('en-IN', {
                                                                                    day: '2-digit', month: 'short', year: 'numeric',
                                                                                    hour: '2-digit', minute: '2-digit'
                                                                                })}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right flex-shrink-0 ml-2">
                                                                        <p className="text-sm font-bold" style={{ color: accentColor }}>
                                                                            {isIncome ? '+' : '-'}₹{(txn.amount ?? 0).toLocaleString()}
                                                                        </p>
                                                                        <p className="text-gray-600 text-[10px] mt-0.5">{((txn as any).balanceType === 'winningBalance' || txn.type === 'winning_credit') ? 'Earnings' : ((txn as any).balanceType === 'lockedBalance' ? 'Locked' : 'Deposit')}: ₹{(txn.balanceAfter ?? 0).toLocaleString()}</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    {hasMore && (
                                                        <button
                                                            onClick={() => setShowAllTxns(!showAllTxns)}
                                                            className="w-full mt-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5"
                                                            style={{
                                                                background: 'rgba(255,255,255,0.03)',
                                                                border: '1px solid rgba(255,255,255,0.06)',
                                                                color: 'rgba(255,255,255,0.45)',
                                                            }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,140,0,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,140,0,0.25)'; e.currentTarget.style.color = '#FF8C00'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
                                                        >
                                                            {showAllTxns ? (
                                                                <><span>Show Less</span><span style={{ fontSize: '10px' }}>▲</span></>
                                                            ) : (
                                                                <><span>Show All ({sortedTxns.length - 3} more)</span><span style={{ fontSize: '10px' }}>▼</span></>
                                                            )}
                                                        </button>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>

                                    {/* Withdrawal History */}
                                    <div
                                        className="mt-4 rounded-xl p-5 sm:p-6"
                                        style={{
                                            background: 'rgba(0,0,0,0.55)',
                                            backdropFilter: 'blur(20px) saturate(1.6)',
                                            WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
                                            border: '1px solid rgba(255,255,255,0.07)',
                                            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-5">
                                            <h3 className="text-sm font-bold text-white uppercase tracking-wide">Withdrawal Requests</h3>
                                            {withdrawals.length > 0 && (
                                                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                                                    {withdrawals.length} total
                                                </span>
                                            )}
                                        </div>
                                        {withdrawalsLoading ? (
                                            <p className="text-gray-500 text-center py-6 text-sm">Loading withdrawals...</p>
                                        ) : withdrawals.length === 0 ? (
                                            <div className="text-center py-8">
                                                <div className="mb-2 opacity-40"><svg className="w-8 h-8 mx-auto text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg></div>
                                                <p className="text-gray-500 text-sm">No withdrawal requests yet.</p>
                                            </div>
                                        ) : (() => {
                                            const sortedWRs = [...withdrawals].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                                            const visibleWRs = showAllWithdrawals ? sortedWRs : sortedWRs.slice(0, 3);
                                            const hasMore = sortedWRs.length > 3;
                                            return (
                                                <>
                                                    <div
                                                        className="space-y-2 transition-all duration-300"
                                                        style={showAllWithdrawals ? { maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' } : {}}
                                                    >
                                                        {visibleWRs.map((wr) => {
                                                            const statusColors: Record<string, { bg: string; text: string; border: string; label: string }> = {
                                                                pending: { bg: 'rgba(234,179,8,0.08)', text: '#EAB308', border: 'rgba(234,179,8,0.15)', label: '⏳ Pending' },
                                                                approved: { bg: 'rgba(34,197,94,0.08)', text: '#22C55E', border: 'rgba(34,197,94,0.15)', label: '✅ Approved' },
                                                                rejected: { bg: 'rgba(239,68,68,0.08)', text: '#EF4444', border: 'rgba(239,68,68,0.15)', label: '❌ Rejected' },
                                                            };
                                                            const sc = statusColors[wr.status] || statusColors.pending;
                                                            return (
                                                                <div
                                                                    key={wr._id}
                                                                    className="group flex items-start justify-between p-3 sm:p-4 rounded-lg transition-all duration-200"
                                                                    style={{ background: sc.bg, border: `1px solid ${sc.border}` }}
                                                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(2px)'; }}
                                                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateX(0)'; }}
                                                                >
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className="text-xs font-bold" style={{ color: sc.text }}>{sc.label}</span>
                                                                            <span className="text-gray-600 text-xs">•</span>
                                                                            <span className="text-gray-500 text-xs">
                                                                                {new Date(wr.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-gray-500 text-xs">
                                                                            UPI: {wr.upiId ?? 'N/A'}
                                                                        </p>
                                                                        {wr.adminNote && (
                                                                            <p className="text-xs mt-1" style={{ color: '#EF4444' }}>Reason: {wr.adminNote}</p>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-right ml-3 flex-shrink-0">
                                                                        <p className="text-white font-bold text-sm">₹{(wr.amount ?? 0).toLocaleString()}</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    {hasMore && (
                                                        <button
                                                            onClick={() => setShowAllWithdrawals(!showAllWithdrawals)}
                                                            className="w-full mt-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5"
                                                            style={{
                                                                background: 'rgba(255,255,255,0.03)',
                                                                border: '1px solid rgba(255,255,255,0.06)',
                                                                color: 'rgba(255,255,255,0.45)',
                                                            }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,140,0,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,140,0,0.25)'; e.currentTarget.style.color = '#FF8C00'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
                                                        >
                                                            {showAllWithdrawals ? (
                                                                <><span>Show Less</span><span style={{ fontSize: '10px' }}>▲</span></>
                                                            ) : (
                                                                <><span>Show All ({sortedWRs.length - 3} more)</span><span style={{ fontSize: '10px' }}>▼</span></>
                                                            )}
                                                        </button>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>

                                    {/* Deposit Request History */}
                                    <div
                                        className="mt-4 rounded-xl p-5 sm:p-6"
                                        style={{
                                            background: 'rgba(0,0,0,0.55)',
                                            backdropFilter: 'blur(20px) saturate(1.6)',
                                            WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
                                            border: '1px solid rgba(255,255,255,0.07)',
                                            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-5">
                                            <h3 className="text-sm font-bold text-white uppercase tracking-wide">Deposit Requests</h3>
                                            {manualDeposits.length > 0 && (
                                                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                                                    {manualDeposits.length} total
                                                </span>
                                            )}
                                        </div>
                                        {manualDepositsLoading ? (
                                            <p className="text-gray-500 text-center py-6 text-sm">Loading deposit requests...</p>
                                        ) : manualDeposits.length === 0 ? (
                                            <div className="text-center py-8">
                                                <div className="mb-2 opacity-40"><svg className="w-8 h-8 mx-auto text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                                                <p className="text-gray-500 text-sm">No deposit requests yet. Add money to get started!</p>
                                            </div>
                                        ) : (() => {
                                            const sortedDeps = [...manualDeposits].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                                            const visibleDeps = showAllDeposits ? sortedDeps : sortedDeps.slice(0, 3);
                                            const hasMoreDeps = sortedDeps.length > 3;
                                            const PAYMENT_LABELS: Record<string, string> = { gpay: 'GPay', phonepe: 'PhonePe', paytm: 'Paytm', upi_other: 'UPI' };
                                            return (
                                                <>
                                                    <div
                                                        className="space-y-2 transition-all duration-300"
                                                        style={showAllDeposits ? { maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' } : {}}
                                                    >
                                                        {visibleDeps.map((dep) => {
                                                            const statusColors: Record<string, { bg: string; text: string; border: string; label: string }> = {
                                                                pending: { bg: 'rgba(234,179,8,0.08)', text: '#EAB308', border: 'rgba(234,179,8,0.15)', label: '⏳ Pending' },
                                                                approved: { bg: 'rgba(34,197,94,0.08)', text: '#22C55E', border: 'rgba(34,197,94,0.15)', label: '✅ Approved' },
                                                                rejected: { bg: 'rgba(239,68,68,0.08)', text: '#EF4444', border: 'rgba(239,68,68,0.15)', label: '❌ Rejected' },
                                                            };
                                                            const sc = statusColors[dep.status] || statusColors.pending;
                                                            return (
                                                                <div
                                                                    key={dep._id}
                                                                    className="group flex items-start justify-between p-3 sm:p-4 rounded-lg transition-all duration-200"
                                                                    style={{ background: sc.bg, border: `1px solid ${sc.border}` }}
                                                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(2px)'; }}
                                                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateX(0)'; }}
                                                                >
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className="text-xs font-bold" style={{ color: sc.text }}>{sc.label}</span>
                                                                            <span className="text-gray-600 text-xs">•</span>
                                                                            <span className="text-gray-500 text-xs">
                                                                                {new Date(dep.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-gray-500 text-xs">
                                                                            {PAYMENT_LABELS[dep.paymentMethod] || dep.paymentMethod} · Ref: <span className="text-gray-400 font-mono">{dep.upiReferenceId}</span>
                                                                        </p>
                                                                        {dep.adminNote && (
                                                                            <p className="text-xs mt-1" style={{ color: '#EF4444' }}>Reason: {dep.adminNote}</p>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-right ml-3 flex-shrink-0">
                                                                        <p className="text-white font-bold text-sm">₹{(dep.amount ?? 0).toLocaleString()}</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    {hasMoreDeps && (
                                                        <button
                                                            onClick={() => setShowAllDeposits(!showAllDeposits)}
                                                            className="w-full mt-3 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5"
                                                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,140,0,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,140,0,0.25)'; e.currentTarget.style.color = '#FF8C00'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
                                                        >
                                                            {showAllDeposits ? (
                                                                <><span>Show Less</span><span style={{ fontSize: '10px' }}>▲</span></>
                                                            ) : (
                                                                <><span>Show All ({sortedDeps.length - 3} more)</span><span style={{ fontSize: '10px' }}>▼</span></>
                                                            )}
                                                        </button>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </>

                            )}
                        </>
                    )}

                    {activeTab === 'Profile' && (
                        <>
                            {/* Profile Header Card */}
                            <div
                                className="relative overflow-hidden rounded-xl p-6 sm:p-8 mb-6"
                                style={{
                                    background: 'rgba(0,0,0,0.55)',
                                    backdropFilter: 'blur(20px) saturate(1.6)',
                                    WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                                }}
                            >
                                {/* Top glow line */}
                                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #FF8C00, #FF550040)' }} />

                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
                                    <div className="flex items-center gap-4 sm:gap-6">
                                        {/* Avatar */}
                                        <div className="relative">
                                            <div
                                                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-white text-3xl sm:text-4xl font-black"
                                                style={{ background: 'linear-gradient(135deg, #FF8C00, #FF5500)', boxShadow: '0 0 20px rgba(255,140,0,0.3)' }}
                                            >
                                                {profileData.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                            </div>
                                            <div
                                                className="absolute bottom-0 right-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full"
                                                style={{ background: '#22C55E', border: '3px solid rgba(0,0,0,0.9)' }}
                                            />
                                        </div>

                                        {/* User Info */}
                                        <div>
                                            <h2 className="text-white text-2xl sm:text-3xl font-black mb-1">{profileData.fullName}</h2>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-gray-500 text-sm">
                                                <div className="flex items-center gap-1">
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                    <span>{profileData.gameId}</span>
                                                </div>
                                                <span className="hidden sm:inline text-gray-600">•</span>
                                                <div className="flex items-center gap-1">
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                    <span>{profileData.location}</span>
                                                </div>
                                            </div>
                                            <p className="text-gray-500 text-sm mt-2 max-w-2xl">
                                                {profileData.bio}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Edit/Save/Cancel/Logout Buttons */}
                                    <div className="flex flex-wrap gap-2">
                                        {!isEditMode ? (
                                            <>
                                                <button
                                                    onClick={handleEditClick}
                                                    className="px-5 py-2 rounded-lg font-semibold text-sm text-white whitespace-nowrap transition-all duration-200"
                                                    style={{ background: 'linear-gradient(135deg, #FF8C00, #FF5500)', boxShadow: '0 0 14px rgba(255,140,0,0.2)' }}
                                                >
                                                    Edit Profile
                                                </button>
                                                <button
                                                    onClick={handleLogout}
                                                    className="px-5 py-2 rounded-lg font-semibold text-sm text-white whitespace-nowrap transition-all duration-200"
                                                    style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }}
                                                >
                                                    Logout
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={handleSaveProfile}
                                                    className="px-5 py-2 rounded-lg font-semibold text-sm text-white whitespace-nowrap transition-all duration-200"
                                                    style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)', boxShadow: '0 0 14px rgba(34,197,94,0.2)' }}
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="px-5 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all duration-200"
                                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Personal Information */}
                            <div className="grid grid-cols-1 gap-4">
                                {/* Personal Information */}
                                <div
                                    className="rounded-xl p-5 sm:p-6"
                                    style={{
                                        background: 'rgba(0,0,0,0.55)',
                                        backdropFilter: 'blur(20px) saturate(1.6)',
                                        WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
                                        border: '1px solid rgba(255,255,255,0.07)',
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                                    }}
                                >
                                    <div className="flex items-center gap-2.5 mb-5">
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                                            style={{ background: 'rgba(255,140,0,0.15)', color: '#FF8C00' }}
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        </div>
                                        <h3 className="text-white text-sm font-bold uppercase tracking-wide">Personal Information</h3>
                                    </div>

                                    <div className="space-y-3">
                                        {/* Full Name */}
                                        <div>
                                            <label className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold mb-1.5 block">Full Name {isEditMode && <span className="text-gray-600">({editedData.fullName.length}/50)</span>}</label>
                                            {isEditMode ? (
                                                <input
                                                    type="text"
                                                    value={editedData.fullName}
                                                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                                                    maxLength={50}
                                                    className="w-full text-white px-4 py-2.5 rounded-lg focus:outline-none text-sm transition-all"
                                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,140,0,0.3)' }}
                                                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255,140,0,0.6)'; }}
                                                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,140,0,0.3)'; }}
                                                />
                                            ) : (
                                                <div
                                                    className="w-full text-white px-4 py-2.5 rounded-lg text-sm"
                                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                                                >
                                                    {profileData.fullName}
                                                </div>
                                            )}
                                        </div>

                                        {/* Email */}
                                        <div>
                                            <label className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold mb-1.5 block">Email</label>
                                            {isEditMode ? (
                                                <input
                                                    type="email"
                                                    value={editedData.email}
                                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                                    className="w-full text-white px-4 py-2.5 rounded-lg focus:outline-none text-sm transition-all"
                                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,140,0,0.3)' }}
                                                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255,140,0,0.6)'; }}
                                                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,140,0,0.3)'; }}
                                                />
                                            ) : (
                                                <div
                                                    className="w-full text-white px-4 py-2.5 rounded-lg text-sm"
                                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                                                >
                                                    {profileData.email}
                                                </div>
                                            )}
                                        </div>

                                        {/* Phone */}
                                        <div>
                                            <label className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold mb-1.5 block">Phone Number</label>
                                            {isEditMode ? (
                                                <input
                                                    type="tel"
                                                    value={editedData.phone}
                                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                                    placeholder="Enter 10-digit number"
                                                    className="w-full text-white px-4 py-2.5 rounded-lg focus:outline-none text-sm transition-all"
                                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,140,0,0.3)' }}
                                                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255,140,0,0.6)'; }}
                                                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,140,0,0.3)'; }}
                                                />
                                            ) : (
                                                <div
                                                    className="w-full text-white px-4 py-2.5 rounded-lg text-sm"
                                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                                                >
                                                    {profileData.phone}
                                                </div>
                                            )}
                                        </div>

                                        {/* Game ID */}
                                        <div>
                                            <label className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold mb-1.5 block">Game ID {isEditMode && <span className="text-gray-600">({editedData.gameId.length}/20)</span>}</label>
                                            {isEditMode ? (
                                                <input
                                                    type="text"
                                                    value={editedData.gameId}
                                                    onChange={(e) => handleInputChange('gameId', e.target.value)}
                                                    maxLength={20}
                                                    placeholder="Only letters, numbers, and underscores"
                                                    className="w-full text-white px-4 py-2.5 rounded-lg focus:outline-none text-sm transition-all"
                                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,140,0,0.3)' }}
                                                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255,140,0,0.6)'; }}
                                                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,140,0,0.3)'; }}
                                                />
                                            ) : (
                                                <div
                                                    className="w-full text-white px-4 py-2.5 rounded-lg text-sm"
                                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                                                >
                                                    {profileData.gameId}
                                                </div>
                                            )}
                                        </div>

                                        {/* Date of Birth */}
                                        <div>
                                            <label className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold mb-1.5 block">Date of Birth {isEditMode && <span className="text-gray-600">(Read-only)</span>}</label>
                                            <div
                                                className="w-full text-white px-4 py-2.5 rounded-lg text-sm"
                                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                                            >
                                                {profileData.dateOfBirth}
                                            </div>
                                        </div>

                                        {/* Location */}
                                        <div>
                                            <label className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold mb-1.5 block">Location {isEditMode && <span className="text-gray-600">({editedData.location.length}/100)</span>}</label>
                                            {isEditMode ? (
                                                <input
                                                    type="text"
                                                    value={editedData.location}
                                                    onChange={(e) => handleInputChange('location', e.target.value)}
                                                    maxLength={100}
                                                    className="w-full text-white px-4 py-2.5 rounded-lg focus:outline-none text-sm transition-all"
                                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,140,0,0.3)' }}
                                                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255,140,0,0.6)'; }}
                                                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,140,0,0.3)'; }}
                                                />
                                            ) : (
                                                <div
                                                    className="w-full text-white px-4 py-2.5 rounded-lg text-sm"
                                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                                                >
                                                    {profileData.location}
                                                </div>
                                            )}
                                        </div>

                                        {/* Bio */}
                                        <div>
                                            <label className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold mb-1.5 block">Bio {isEditMode && <span className="text-gray-600">({editedData.bio.length}/500)</span>}</label>
                                            {isEditMode ? (
                                                <textarea
                                                    value={editedData.bio}
                                                    onChange={(e) => handleInputChange('bio', e.target.value)}
                                                    rows={3}
                                                    maxLength={500}
                                                    className="w-full text-white px-4 py-2.5 rounded-lg focus:outline-none text-sm leading-relaxed resize-none transition-all"
                                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,140,0,0.3)' }}
                                                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(255,140,0,0.6)'; }}
                                                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,140,0,0.3)'; }}
                                                />
                                            ) : (
                                                <div
                                                    className="w-full text-white px-4 py-2.5 rounded-lg text-sm leading-relaxed"
                                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                                                >
                                                    {profileData.bio}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </section >

            <Footer />

            {/* Toast Notification */}
            {
                toast && (
                    <div className="fixed bottom-6 right-6 z-50 animate-slideInRight">
                        <div className={`
                        ${toast.type === 'success'
                                ? 'bg-green-600/95 border-green-500/50'
                                : 'bg-red-600/95 border-red-500/50'
                            }
                        backdrop-blur-md border rounded-lg px-6 py-4 shadow-2xl max-w-md
                    `}>
                            <div className="flex items-start gap-3">
                                {/* Icon */}
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

                                {/* Message */}
                                <div className="flex-1">
                                    <p className="text-white font-semibold text-sm mb-1">
                                        {toast.type === 'success' ? 'Success!' : 'Error'}
                                    </p>
                                    <p className="text-white/90 text-sm leading-relaxed">
                                        {toast.message}
                                    </p>
                                </div>

                                {/* Close Button */}
                                <button
                                    onClick={() => setToast(null)}
                                    className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default DashboardPage;
