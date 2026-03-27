import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import AnalyticsOverview from '../components/admin/AnalyticsOverview';
import UserManagement from '../components/admin/UserManagement';
import TournamentManagement from '../components/admin/TournamentManagement';
import WithdrawalsManagement from '../components/admin/WithdrawalsManagement';
import SettlementPanel from '../components/admin/SettlementPanel';
import api from '../services/api';

type TabType = 'Analytics' | 'Users' | 'Tournaments' | 'Withdrawals' | 'Settlements';

interface SettlementAlert {
    tournamentId: string;
    name: string;
    endDate: string;
    prizePool: number;
    participantCount: number;
    rankedCount: number;
    readyToDistribute: boolean;
    timeSinceFinish: string;
}

const POLL_INTERVAL_MS = 45_000; // 45 seconds

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('Analytics');

    // ── Settlement alert state ─────────────────────────────────────────────────
    const [alertCount, setAlertCount] = useState(0);
    const [alertList, setAlertList] = useState<SettlementAlert[]>([]);
    const [alertDismissed, setAlertDismissed] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Redirect if not admin
    React.useEffect(() => {
        if (user && user.role !== 'admin') navigate('/dashboard');
    }, [user, navigate]);

    // ── Poll /api/admin/alerts/settlements every 45s ───────────────────────────
    const fetchAlerts = useCallback(async () => {
        try {
            const res = await api.get('/admin/alerts/settlements');
            const count = res.data.totalPendingSettlements ?? 0;
            setAlertCount(count);
            setAlertList(res.data.tournaments ?? []);
            // If count increased (new tournaments finished), un-dismiss the banner
            setAlertDismissed(prev => (count > 0 ? false : prev));
        } catch {
            // Silently ignore — non-critical background poll
        }
    }, []);

    useEffect(() => {
        if (!user || user.role !== 'admin') return;

        // Immediately on mount
        fetchAlerts();

        // then every 45s
        pollRef.current = setInterval(fetchAlerts, POLL_INTERVAL_MS);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [user, fetchAlerts]);

    const tabs: { key: TabType; label: string; accent: string }[] = [
        { key: 'Analytics', label: 'Analytics', accent: '#FF8C00' },
        { key: 'Users', label: 'Users', accent: '#6366F1' },
        { key: 'Tournaments', label: 'Tournaments', accent: '#F59E0B' },
        { key: 'Withdrawals', label: 'Withdrawals', accent: '#EF4444' },
        { key: 'Settlements', label: 'Settlements', accent: '#10B981' },
    ];

    if (!user || user.role !== 'admin') return null;

    const fmtINR = (n: number) => `₹${n.toLocaleString('en-IN')}`;

    return (
        <div className="min-h-screen bg-dark-900 text-white overflow-x-hidden">
            <Header />

            {/* Page Header */}
            <section
                className="relative pt-24 sm:pt-28 md:pt-32 pb-8 sm:pb-12 px-4 sm:px-6"
                style={{ background: 'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 100%)' }}
            >
                <div className="container mx-auto max-w-7xl">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-2">
                        <span className="text-white">Admin </span>
                        <span
                            style={{
                                background: 'linear-gradient(135deg, #FF8C00, #FF5500)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            Dashboard
                        </span>
                    </h1>
                    <p className="text-gray-500 text-sm sm:text-base">
                        Manage users, tournaments, withdrawals, and view analytics
                    </p>
                </div>
            </section>

            {/* Tab Bar */}
            <section
                className="relative sticky top-0 z-30"
                style={{
                    background: 'rgba(0, 0, 0, 0.98)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
            >
                <div
                    className="w-full h-px"
                    style={{
                        background: 'linear-gradient(90deg, rgba(255,140,0,0.6), rgba(255,80,0,0.2), transparent)',
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
                                Admin
                            </span>
                        </div>
                        <div className="flex overflow-x-auto scrollbar-hide flex-1">
                            {tabs.map(({ key, label, accent }) => {
                                const isActive = activeTab === key;
                                return (
                                    <button
                                        key={key}
                                        onClick={() => setActiveTab(key)}
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
                                            {label}
                                        </span>
                                        {/* Alert badge on Settlements tab */}
                                        {key === 'Settlements' && alertCount > 0 && (
                                            <span className="relative z-10 bg-orange-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                                                {alertCount > 9 ? '9+' : alertCount}
                                            </span>
                                        )}
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

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

                {/* ── Settlement Alert Banner (Phase 3) ──────────────────────── */}
                {alertCount > 0 && !alertDismissed && (
                    <div
                        className="mb-6 rounded-xl overflow-hidden"
                        style={{
                            background: 'rgba(0,0,0,0.55)',
                            backdropFilter: 'blur(20px) saturate(1.6)',
                            WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
                            border: '1px solid rgba(255,140,0,0.2)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,140,0,0.04)',
                        }}
                    >
                        {/* Banner header */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-3 border-b border-orange-500/10 gap-3 sm:gap-0" style={{ background: 'rgba(255,140,0,0.06)' }}>
                            <div className="flex items-center gap-3">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" />
                                </span>
                                <span className="text-orange-400 font-bold text-sm">
                                    ⚠️ Pending Tournament Settlements
                                </span>
                                <span className="bg-orange-500 text-white text-xs font-black px-2 py-0.5 rounded-full">
                                    {alertCount}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => { setActiveTab('Settlements'); setAlertDismissed(true); }}
                                    className="text-xs font-bold text-white px-4 py-1.5 rounded-lg transition-all"
                                    style={{ background: 'linear-gradient(135deg, #FF8C00, #FF5500)' }}
                                >
                                    View Settlements →
                                </button>
                                <button
                                    onClick={() => setAlertDismissed(true)}
                                    className="text-gray-500 hover:text-gray-300 text-lg leading-none"
                                    title="Dismiss (will reappear if count increases)"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        {/* Alert tournament rows */}
                        <div className="divide-y divide-white/5">
                            {alertList.slice(0, 5).map(t => (
                                <div key={t.tournamentId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-3 text-sm gap-2 sm:gap-0">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${t.readyToDistribute
                                                ? 'bg-green-500/15 text-green-400'
                                                : 'bg-yellow-500/15 text-yellow-400'
                                            }`}>
                                            {t.readyToDistribute ? '✅ Ready' : '⚠️ Needs Ranks'}
                                        </span>
                                        <span className="text-gray-200 font-medium truncate">{t.name}</span>
                                        <span className="text-gray-500 text-xs flex-shrink-0">
                                            Ended {t.timeSinceFinish}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 flex-shrink-0 text-xs text-gray-400 ml-4">
                                        <span className="text-orange-400 font-bold">{fmtINR(t.prizePool)}</span>
                                        <span>{t.participantCount} players · {t.rankedCount} ranked</span>
                                    </div>
                                </div>
                            ))}
                            {alertCount > 5 && (
                                <div className="px-5 py-2 text-xs text-gray-500 text-center">
                                    + {alertCount - 5} more pending settlement{alertCount - 5 !== 1 ? 's' : ''} —{' '}
                                    <button
                                        onClick={() => { setActiveTab('Settlements'); setAlertDismissed(true); }}
                                        className="text-orange-400 hover:text-orange-300 underline"
                                    >
                                        View all
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Footer: last checked */}
                        <div className="px-5 py-1.5 text-xs text-gray-600 text-right" style={{ background: 'rgba(0,0,0,0.3)' }}>
                            Auto-refreshes every 45 s · Last checked: {new Date().toLocaleTimeString('en-IN')}
                        </div>
                    </div>
                )}

                {/* Tab Content */}
                <div className="min-h-[600px]">
                    {activeTab === 'Analytics' && <AnalyticsOverview />}
                    {activeTab === 'Users' && <UserManagement />}
                    {activeTab === 'Tournaments' && <TournamentManagement />}
                    {activeTab === 'Withdrawals' && <WithdrawalsManagement />}
                    {activeTab === 'Settlements' && <SettlementPanel />}
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default AdminDashboard;
