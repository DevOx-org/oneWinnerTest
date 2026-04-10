import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingSettlement {
    _id: string;
    title: string;
    game: string;
    startDate: string;
    endDate: string;
    prizePool: number;
    status: string;
    participantCount: number;
    rankedCount: number;
    readyToDistribute: boolean;
    winningsDistributed: boolean;
    prizeDistribution: Record<string, number>;
    matchType?: string | null;
}

interface Participant {
    participantId: string;
    userId: string;
    username: string;
    email: string;
    status: string;
    registeredAt: string;
    entryFee: number;
    refunded: boolean;
    banReason: string | null;
    bannedAt: string | null;
    rank?: number | null;
    winningAmount?: number;
    winsDistributedAt?: string | null;
    teamLeaderName?: string | null;
    leaderGameName?: string | null;
    teamMember2?: string | null;
    teamMember3?: string | null;
    teamMember4?: string | null;
    assignedSlot?: number | null;
    totalKills?: number;
}

interface HistoryRecord {
    _id: string;
    title: string;
    game: string;
    startDate: string;
    endDate: string;
    prizePool: number;
    participantCount: number;
    winnerCount: number;
    totalDistributed: number;
    winners: { userId: string; rank: number; rankLabel: string; winningAmount: number; teamLeaderName: string | null }[];
    distributedAt: string;
    distributedBy: { name: string; email: string } | null;
}

interface HistoryDetail {
    _id: string;
    title: string;
    participants: {
        userId: string; status: string; rank: number | null; rankLabel: string | null;
        winningAmount: number; winsDistributedAt: string | null; registeredAt: string;
        teamLeaderName: string | null; leaderGameName: string | null;
        teamMember2: string | null; teamMember3: string | null; teamMember4: string | null; assignedSlot: number | null;
    }[];
    totalDistributed: number;
    distributedAt: string;
    distributedBy: { name: string; email: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (d: string) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const INR = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

const RANK_COLORS: Record<string, string> = { '1st': '#fbbf24', '2nd': '#9ca3af', '3rd': '#d97706' };
const RANK_LABELS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];

function getRankLabel(rank: number | null | undefined) {
    if (!rank) return null;
    return RANK_LABELS[rank - 1] || `${rank}th`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SettlementPanel() {
    const [tab, setTab] = useState<'pending' | 'history'>('pending');

    // Pending
    const [pending, setPending] = useState<PendingSettlement[]>([]);
    const [pendingLoading, setPendingLoading] = useState(true);
    const [pendingError, setPendingError] = useState('');

    // History list
    const [history, setHistory] = useState<HistoryRecord[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState('');
    const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
    const [historyDetail, setHistoryDetail] = useState<Record<string, HistoryDetail>>({});

    // Manage modal (pending)
    const [manageTarget, setManageTarget] = useState<PendingSettlement | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [participantsLoading, setParticipantsLoading] = useState(false);
    const [rankInputs, setRankInputs] = useState<Record<string, string>>({});
    const [prizeInputs, setPrizeInputs] = useState<Record<string, string>>({});  // userId -> manual ₹ amount
    const [savingRank, setSavingRank] = useState<string | null>(null);
    const [distributing, setDistributing] = useState(false);
    const [killsInputs, setKillsInputs] = useState<Record<string, string>>({});

    // Player detail modal
    const [playerDetail, setPlayerDetail] = useState<Participant | null>(null);

    // Search (Manage modal)
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Toast
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 5000);
    };

    // ── Fetch pending ────────────────────────────────────────────────────────
    const fetchPending = useCallback(async () => {
        setPendingLoading(true); setPendingError('');
        try {
            const res = await api.get('/admin/settlements/pending');
            setPending(res.data.settlements ?? []);
        } catch (e: any) {
            setPendingError(e.response?.data?.message ?? 'Failed to load pending settlements');
        } finally { setPendingLoading(false); }
    }, []);

    // ── Fetch history ────────────────────────────────────────────────────────
    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true); setHistoryError('');
        try {
            const res = await api.get('/admin/settlements/history');
            setHistory(res.data.history ?? []);
        } catch (e: any) {
            setHistoryError(e.response?.data?.message ?? 'Failed to load settlement history');
        } finally { setHistoryLoading(false); }
    }, []);

    useEffect(() => { fetchPending(); }, [fetchPending]);
    useEffect(() => { if (tab === 'history') fetchHistory(); }, [tab, fetchHistory]);

    // ── Open manage modal ────────────────────────────────────────────────────
    const openManage = async (t: PendingSettlement) => {
        setManageTarget(t);
        setParticipantsLoading(true);
        setParticipants([]);
        setRankInputs({});
        setPrizeInputs({});
        setKillsInputs({});
        try {
            const res = await api.get(`/admin/tournaments/${t._id}/participants`);
            const list: Participant[] = (res.data.participants ?? []).filter(
                (p: Participant) => p.status === 'registered' || p.status === 'confirmed'
            );
            setParticipants(list);
            const initRanks: Record<string, string> = {};
            const initKills: Record<string, string> = {};
            list.forEach(p => {
                if (p.rank) initRanks[p.userId] = String(p.rank);
                if (p.totalKills) initKills[p.userId] = String(p.totalKills);
            });
            setRankInputs(initRanks);
            setKillsInputs(initKills);
            // Update manageTarget with matchType from API response
            if (res.data.tournament?.matchType) {
                setManageTarget(prev => prev ? { ...prev, matchType: res.data.tournament.matchType } : prev);
            }
        } catch { showToast('error', 'Failed to load participants'); }
        finally { setParticipantsLoading(false); }
    };

    // ── Save rank (+ optional totalKills for BR) ──────────────────────────────
    const saveRank = async (userId: string) => {
        if (!manageTarget) return;
        const rank = parseInt(rankInputs[userId] ?? '');
        if (!rank || rank < 1) { showToast('error', 'Enter a valid rank (≥ 1)'); return; }
        const killsStr = killsInputs[userId];
        const totalKills = killsStr !== undefined && killsStr !== '' ? parseInt(killsStr) : undefined;
        if (totalKills !== undefined && (isNaN(totalKills) || totalKills < 0)) {
            showToast('error', 'Total Kills must be a non-negative number'); return;
        }
        setSavingRank(userId);
        try {
            await api.patch(`/admin/tournaments/${manageTarget._id}/participants/${userId}/rank`, {
                rank,
                ...(totalKills !== undefined ? { totalKills } : {}),
            });
            setParticipants(prev => prev.map(p => p.userId === userId
                ? { ...p, rank, ...(totalKills !== undefined ? { totalKills } : {}) }
                : p
            ));
            showToast('success', `Rank ${rank} saved`);
        } catch (e: any) {
            showToast('error', e.response?.data?.message ?? 'Failed to save rank');
        } finally { setSavingRank(null); }
    };

    // ── Compute total manually assigned prize ────────────────────────────────
    const manualTotal = Object.values(prizeInputs).reduce((s, v) => s + (parseFloat(v) || 0), 0);
    const prizePool = manageTarget?.prizePool ?? 0;
    const remaining = prizePool - manualTotal;

    // ── Distribute winnings ──────────────────────────────────────────────────
    const handleDistribute = async () => {
        if (!manageTarget) return;
        const ranked = participants.filter(p => p.rank && p.rank >= 1);
        if (ranked.length === 0) { showToast('error', 'Set at least one rank before distributing'); return; }

        // Build manualPrizes — only for participants that have a manual amount entered
        const manualPrizes: Record<string, number> = {};
        let hasManual = false;
        for (const [uid, val] of Object.entries(prizeInputs)) {
            const amt = parseFloat(val);
            if (amt > 0) { manualPrizes[uid] = amt; hasManual = true; }
        }

        if (!window.confirm(`Distribute winnings for "${manageTarget.title}"?\n\nTotal distributing: ${INR(hasManual ? manualTotal : prizePool)}\n\nThis cannot be undone.`)) return;
        setDistributing(true);
        try {
            const res = await api.post(`/admin/tournaments/${manageTarget._id}/distribute-winnings`, {
                manualPrizes: hasManual ? manualPrizes : null,
            });
            showToast('success', `${INR(res.data.totalDistributed)} distributed to ${res.data.winners?.length} winner(s)! 🎉 Credited to their Total Earnings.`);
            setManageTarget(null);
            setParticipants([]);
            fetchPending();
            if (tab === 'history') fetchHistory();
        } catch (e: any) {
            showToast('error', e.response?.data?.message ?? 'Distribution failed');
        } finally { setDistributing(false); }
    };

    // ── Toggle history detail ────────────────────────────────────────────────
    const toggleHistoryDetail = async (id: string) => {
        if (expandedHistory === id) { setExpandedHistory(null); return; }
        setExpandedHistory(id);
        if (historyDetail[id]) return;
        try {
            const res = await api.get(`/admin/settlements/history/${id}`);
            setHistoryDetail(prev => ({ ...prev, [id]: res.data }));
        } catch { showToast('error', 'Failed to load settlement details'); }
    };

    const rankedParticipants = participants.filter(p => p.rank && p.rank >= 1).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));

    // ── Match-type conditional: Battle Royale uses modal-based settlement ─────
    const isBR = manageTarget?.matchType?.startsWith('Battle Royale') ?? false;

    // ── Debounce search term ─────────────────────────────────────────────────
    useEffect(() => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
    }, [searchTerm]);

    // ── Filtered participants (memoized, O(n)) ──────────────────────────────
    const filteredPlayers = useMemo(() => {
        if (!debouncedSearchTerm.trim()) return participants;
        const term = debouncedSearchTerm.trim().toLowerCase();
        return participants.filter(p =>
            p.leaderGameName?.toLowerCase().includes(term) ||
            p.teamLeaderName?.toLowerCase().includes(term) ||
            p.username?.toLowerCase().includes(term) ||
            p.email?.toLowerCase().includes(term)
        );
    }, [participants, debouncedSearchTerm]);

    // ── Highlight matching text helper ───────────────────────────────────────
    const highlightMatch = (text: string | null | undefined) => {
        if (!text) return '—';
        if (!debouncedSearchTerm.trim()) return text;
        const term = debouncedSearchTerm.trim();
        const idx = text.toLowerCase().indexOf(term.toLowerCase());
        if (idx === -1) return text;
        return (
            <>
                {text.slice(0, idx)}
                <span style={{ background: 'rgba(249,115,22,0.35)', borderRadius: 3, padding: '0 2px' }}>
                    {text.slice(idx, idx + term.length)}
                </span>
                {text.slice(idx + term.length)}
            </>
        );
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div style={{ fontFamily: "'Segoe UI', sans-serif", color: '#e5e7eb', minHeight: '100%' }}>

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 24, right: 24, zIndex: 9999,
                    padding: '12px 20px', borderRadius: 10,
                    background: toast.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    border: `1px solid ${toast.type === 'success' ? '#10b981' : '#ef4444'}`,
                    color: toast.type === 'success' ? '#10b981' : '#ef4444',
                    fontWeight: 600, fontSize: 14, maxWidth: 380,
                }}>
                    {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
                </div>
            )}

            {/* Header + Tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f3f4f6' }}>🏆 Settlement Centre</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setTab('pending')} style={tab === 'pending' ? tabActive : tabInactive}>
                        ⏳ Pending {pending.length > 0 && <span style={badge}>{pending.length}</span>}
                    </button>
                    <button onClick={() => setTab('history')} style={tab === 'history' ? tabActive : tabInactive}>
                        📋 History {history.length > 0 && <span style={{ ...badge, background: '#6b7280' }}>{history.length}</span>}
                    </button>
                </div>
            </div>

            {/* ── Pending Tab ──────────────────────────────────────────────── */}
            {tab === 'pending' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                        <button onClick={fetchPending} style={btnSm}>🔄 Refresh</button>
                    </div>
                    {pendingLoading && <LoadingRows />}
                    {pendingError && <ErrorMsg msg={pendingError} />}
                    {!pendingLoading && !pendingError && pending.length === 0 && (
                        <EmptyState icon="✅" msg="All caught up — no pending settlements." />
                    )}
                    {pending.map(t => (
                        <div key={t._id} style={card}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                                <div style={{ flex: 1, minWidth: 260 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f3f4f6' }}>{t.title}</h3>
                                        <span style={gameBadge}>{t.game}</span>
                                        <span style={t.readyToDistribute ? readyBadge : needsBadge}>
                                            {t.readyToDistribute ? '✅ Ready' : '⚠️ Needs Ranks'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', fontSize: 13, color: '#9ca3af', marginBottom: 10 }}>
                                        <span>📅 Ended: <strong style={{ color: '#d1d5db' }}>{fmt(t.endDate)}</strong></span>
                                        <span>🎯 Started: <strong style={{ color: '#d1d5db' }}>{fmtDate(t.startDate)}</strong></span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', fontSize: 13 }}>
                                        <StatChip icon="🏆" label="Prize Pool" value={INR(t.prizePool)} color="#f97316" />
                                        <StatChip icon="👥" label="Players" value={String(t.participantCount)} color="#60a5fa" />
                                        <StatChip icon="🎯" label="Ranked" value={String(t.rankedCount)} color={t.rankedCount > 0 ? '#10b981' : '#ef4444'} />
                                    </div>
                                    {Object.keys(t.prizeDistribution).length > 0 && (
                                        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                                            {Object.entries(t.prizeDistribution).map(([rank, pct]) => (
                                                <div key={rank} style={prizePill}>
                                                    <span style={{ color: RANK_COLORS[rank] || '#f97316', fontWeight: 700 }}>{rank}</span>
                                                    <span style={{ color: '#9ca3af', marginLeft: 4 }}>
                                                        {pct}% = {INR(Math.floor(t.prizePool * pct / 100))}
                                                    </span>
                                                </div>
                                            ))}
                                            <div style={{ ...prizePill, background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)' }}>
                                                <span style={{ color: '#6b7280', fontSize: 11 }}>or set custom ₹ per player</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => openManage(t)} style={btnSecondary}>👥 Manage Players →</button>
                            </div>
                        </div>
                    ))}
                </>
            )}

            {/* ── History Tab ───────────────────────────────────────────────── */}
            {tab === 'history' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                        <button onClick={fetchHistory} style={btnSm}>🔄 Refresh</button>
                    </div>
                    {historyLoading && <LoadingRows />}
                    {historyError && <ErrorMsg msg={historyError} />}
                    {!historyLoading && !historyError && history.length === 0 && (
                        <EmptyState icon="📋" msg="No settlements distributed yet." />
                    )}
                    {history.map(t => (
                        <div key={t._id} style={card}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                                <div style={{ flex: 1, minWidth: 260 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f3f4f6' }}>{t.title}</h3>
                                        <span style={gameBadge}>{t.game}</span>
                                        <span style={settledBadge}>✅ Settled</span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', fontSize: 13, color: '#9ca3af', marginBottom: 10 }}>
                                        <span>📅 Ended: <strong style={{ color: '#d1d5db' }}>{fmtDate(t.endDate)}</strong></span>
                                        <span>🕐 Settled: <strong style={{ color: '#10b981' }}>{fmt(t.distributedAt)}</strong></span>
                                        {t.distributedBy && <span>👤 By: <strong style={{ color: '#d1d5db' }}>{t.distributedBy.name}</strong></span>}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', fontSize: 13 }}>
                                        <StatChip icon="🏆" label="Prize Pool" value={INR(t.prizePool)} color="#f97316" />
                                        <StatChip icon="💰" label="Distributed" value={INR(t.totalDistributed)} color="#10b981" />
                                        <StatChip icon="🥇" label="Winners" value={String(t.winnerCount)} color="#fbbf24" />
                                        <StatChip icon="👥" label="Players" value={String(t.participantCount)} color="#60a5fa" />
                                    </div>
                                </div>
                                <button onClick={() => toggleHistoryDetail(t._id)} style={btnSm}>
                                    {expandedHistory === t._id ? '▲ Hide' : '▼ View Details'}
                                </button>
                            </div>
                            {expandedHistory === t._id && (
                                <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
                                    {!historyDetail[t._id] ? (
                                        <p style={{ color: '#6b7280', fontSize: 13 }}>Loading…</p>
                                    ) : (
                                        <>
                                            <h4 style={{ margin: '0 0 12px', color: '#f97316', fontSize: 14 }}>Winner Breakdown</h4>
                                            <div style={{ overflowX: 'auto' }}>
                                                <table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse', fontSize: 13 }}>
                                                <thead>
                                                    <tr>
                                                        {['Rank', 'Team Leader', 'Game Name', 'Slot', 'Prize Won', 'Credited At'].map(h => (
                                                            <th key={h} style={thStyle}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {historyDetail[t._id].participants
                                                        .filter(p => p.winningAmount > 0)
                                                        .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
                                                        .map((p, i) => (
                                                            <tr key={String(p.userId)} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                                <td style={tdStyle}>
                                                                    <span style={{ color: RANK_COLORS[p.rankLabel ?? ''] || '#f97316', fontWeight: 700 }}>
                                                                        {p.rankLabel ?? `#${p.rank}`}
                                                                    </span>
                                                                </td>
                                                                <td style={tdStyle}>{p.teamLeaderName ?? `Player ${i + 1}`}</td>
                                                                <td style={tdStyle}>{p.leaderGameName ?? '—'}</td>
                                                                <td style={tdStyle}>{p.assignedSlot ?? '—'}</td>
                                                                <td style={{ ...tdStyle, color: '#10b981', fontWeight: 700 }}>{INR(p.winningAmount)}</td>
                                                                <td style={tdStyle}>{p.winsDistributedAt ? fmt(p.winsDistributedAt) : '—'}</td>
                                                            </tr>
                                                        ))}
                                                </tbody>
                                                </table>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </>
            )}

            {/* ── Manage Players Modal ──────────────────────────────────────── */}
            {manageTarget && (
                <div style={modalOverlay} onClick={() => { if (!distributing) { setManageTarget(null); setParticipants([]); setSearchTerm(''); setDebouncedSearchTerm(''); setKillsInputs({}); } }}>
                    <div style={modalBox} onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f3f4f6' }}>{manageTarget.title}</h3>
                                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
                                    {manageTarget.game}
                                    {manageTarget.matchType && <span style={{ color: '#60a5fa', fontWeight: 600 }}> · {manageTarget.matchType}</span>}
                                    {' '}· Prize Pool: <strong style={{ color: '#f97316' }}>{INR(prizePool)}</strong> · {manageTarget.participantCount} players
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    onClick={handleDistribute}
                                    disabled={distributing || rankedParticipants.length === 0}
                                    style={{
                                        ...btnDistribute,
                                        opacity: (distributing || rankedParticipants.length === 0) ? 0.5 : 1,
                                        cursor: (distributing || rankedParticipants.length === 0) ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {distributing ? '⏳ Distributing…' : '🏆 Distribute Winnings'}
                                </button>
                                <button onClick={() => { setManageTarget(null); setParticipants([]); setSearchTerm(''); setDebouncedSearchTerm(''); setKillsInputs({}); }} style={btnSm}>✕</button>
                            </div>
                        </div>

                        {/* Prize summary bar */}
                        {rankedParticipants.length > 0 && (
                            <div style={{
                                background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)',
                                borderRadius: 10, padding: '10px 16px', marginBottom: 16,
                                display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13,
                            }}>
                                <span>Prize Pool: <strong style={{ color: '#f97316' }}>{INR(prizePool)}</strong></span>
                                <span>Assigned: <strong style={{ color: manualTotal > 0 ? '#60a5fa' : '#6b7280' }}>{INR(manualTotal)}</strong></span>
                                <span style={{ color: remaining < 0 ? '#ef4444' : '#10b981' }}>
                                    Remaining: <strong>{INR(remaining)}</strong>
                                    {remaining < 0 && ' ⚠️ Over budget!'}
                                </span>
                                <span style={{ color: '#6b7280', fontSize: 12 }}>
                                    💡 Leave prize blank to use % distribution below
                                </span>
                            </div>
                        )}

                        {/* Default % distribution pills */}
                        {Object.keys(manageTarget.prizeDistribution).length > 0 && (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                                <span style={{ fontSize: 12, color: '#6b7280', alignSelf: 'center' }}>Default %:</span>
                                {Object.entries(manageTarget.prizeDistribution).map(([rank, pct]) => (
                                    <div key={rank} style={prizePill}>
                                        <span style={{ color: RANK_COLORS[rank] || '#f97316', fontWeight: 700 }}>{rank}</span>
                                        <span style={{ color: '#9ca3af', marginLeft: 4 }}>{pct}% = {INR(Math.floor(prizePool * pct / 100))}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Search bar */}
                        {!participantsLoading && participants.length > 0 && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                marginBottom: 14,
                                flexWrap: 'wrap',
                            }}>
                                <div style={{
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    flex: '1 1 220px',
                                    maxWidth: 340,
                                    minWidth: 0,
                                }}>
                                    {/* SVG search icon */}
                                    <svg
                                        style={{
                                            position: 'absolute',
                                            left: 10,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            pointerEvents: 'none',
                                            opacity: 0.4,
                                        }}
                                        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                    >
                                        <circle cx="11" cy="11" r="8" />
                                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        placeholder="Search player or game ID…"
                                        style={{
                                            width: '100%',
                                            padding: searchTerm ? '7px 30px 7px 32px' : '7px 12px 7px 32px',
                                            borderRadius: 8,
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            background: 'rgba(255,255,255,0.03)',
                                            backdropFilter: 'blur(8px)',
                                            color: '#e5e7eb',
                                            fontSize: 12.5,
                                            outline: 'none',
                                            transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
                                            fontFamily: 'inherit',
                                            letterSpacing: '0.01em',
                                        }}
                                        onFocus={e => {
                                            e.currentTarget.style.borderColor = 'rgba(249,115,22,0.45)';
                                            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(249,115,22,0.08)';
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                        }}
                                        onBlur={e => {
                                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                                            e.currentTarget.style.boxShadow = 'none';
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                        }}
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={() => { setSearchTerm(''); setDebouncedSearchTerm(''); }}
                                            style={{
                                                position: 'absolute',
                                                right: 6,
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'transparent',
                                                border: 'none',
                                                borderRadius: '50%',
                                                width: 20,
                                                height: 20,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                color: '#6b7280',
                                                fontSize: 10,
                                                lineHeight: 1,
                                                transition: 'color 0.15s, background 0.15s',
                                                padding: 0,
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.background = 'transparent'; }}
                                            title="Clear search"
                                        >✕</button>
                                    )}
                                </div>
                                {/* Result count chip — only when searching */}
                                {debouncedSearchTerm.trim() && (
                                    <span style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: filteredPlayers.length > 0 ? '#9ca3af' : '#ef4444',
                                        background: filteredPlayers.length > 0 ? 'rgba(255,255,255,0.04)' : 'rgba(239,68,68,0.08)',
                                        border: `1px solid ${filteredPlayers.length > 0 ? 'rgba(255,255,255,0.06)' : 'rgba(239,68,68,0.15)'}`,
                                        borderRadius: 20,
                                        padding: '3px 10px',
                                        whiteSpace: 'nowrap',
                                        letterSpacing: '0.02em',
                                    }}>
                                        {filteredPlayers.length}/{participants.length} found
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Participants */}
                        {participantsLoading ? (
                            <p style={{ color: '#6b7280', textAlign: 'center', padding: '32px 0' }}>Loading participants…</p>
                        ) : participants.length === 0 ? (
                            <p style={{ color: '#6b7280', textAlign: 'center', padding: '32px 0' }}>No registered participants found.</p>
                        ) : filteredPlayers.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
                                <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
                                <p style={{ fontSize: 15, margin: 0 }}>No players found for &ldquo;<strong style={{ color: '#f97316' }}>{debouncedSearchTerm}</strong>&rdquo;</p>
                                <p style={{ fontSize: 12, margin: '6px 0 0', color: '#4b5563' }}>Try searching by Game ID or Player Name</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', minWidth: isBR ? 650 : 800, borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                            {(isBR
                                                ? ['Player', 'Team Leader', 'Game Name', 'Slot', 'Status', 'Rank', 'Kills', '']
                                                : ['Player', 'Team Leader', 'Game Name', 'Slot', 'Status', 'Rank', 'Set Rank', 'Prize ₹ (manual)', '']
                                            ).map(h => (
                                                <th key={h} style={thStyle}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPlayers.map(p => (
                                            <tr
                                                key={p.userId}
                                                style={{
                                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                    cursor: 'pointer',
                                                    background: p.rank ? 'rgba(249,115,22,0.03)' : 'transparent',
                                                }}
                                                onClick={() => setPlayerDetail(p)}
                                            >
                                                <td style={tdStyle}>
                                                    <div style={{ fontWeight: 600, color: '#f3f4f6' }}>{highlightMatch(p.username)}</div>
                                                    <div style={{ fontSize: 11, color: '#6b7280' }}>{highlightMatch(p.email)}</div>
                                                </td>
                                                <td style={tdStyle}>
                                                    <span style={{ color: p.teamLeaderName ? '#d1d5db' : '#4b5563' }}>
                                                        {highlightMatch(p.teamLeaderName)}
                                                    </span>
                                                </td>
                                                <td style={tdStyle}>
                                                    <span style={{ color: p.leaderGameName ? '#d1d5db' : '#4b5563' }}>
                                                        {highlightMatch(p.leaderGameName)}
                                                    </span>
                                                </td>
                                                <td style={tdStyle}>
                                                    <span style={{ color: p.assignedSlot != null ? '#60a5fa' : '#4b5563', fontWeight: p.assignedSlot != null ? 700 : 400 }}>
                                                        {p.assignedSlot != null ? `#${p.assignedSlot}` : '—'}
                                                    </span>
                                                </td>
                                                <td style={tdStyle}>
                                                    <span style={{
                                                        padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                                                        background: p.status === 'confirmed' ? 'rgba(16,185,129,0.12)' : 'rgba(249,115,22,0.12)',
                                                        color: p.status === 'confirmed' ? '#10b981' : '#f97316',
                                                    }}>{p.status}</span>
                                                </td>
                                                <td style={tdStyle}>
                                                    {p.rank
                                                        ? <span style={{ color: RANK_COLORS[getRankLabel(p.rank) ?? ''] || '#f97316', fontWeight: 700 }}>#{p.rank} {getRankLabel(p.rank)}</span>
                                                        : <span style={{ color: '#4b5563' }}>—</span>}
                                                </td>

                                                {/* ── BR mode: show kills + Details button ── */}
                                                {isBR ? (
                                                    <>
                                                        <td style={tdStyle}>
                                                            <span style={{ color: (p.totalKills ?? 0) > 0 ? '#10b981' : '#4b5563', fontWeight: (p.totalKills ?? 0) > 0 ? 700 : 400 }}>
                                                                {(p.totalKills ?? 0) > 0 ? p.totalKills : '—'}
                                                            </span>
                                                        </td>
                                                        <td style={tdStyle} onClick={e => e.stopPropagation()}>
                                                            <button
                                                                onClick={() => setPlayerDetail(p)}
                                                                style={{ ...btnSm, fontSize: 11, padding: '5px 10px' }}
                                                            >
                                                                Details →
                                                            </button>
                                                        </td>
                                                    </>
                                                ) : (
                                                    /* ── TDM mode: inline Set Rank, Prize ₹, Save ── */
                                                    <>
                                                        <td style={tdStyle} onClick={e => e.stopPropagation()}>
                                                            <input
                                                                type="number" min={1}
                                                                value={rankInputs[p.userId] ?? ''}
                                                                onChange={e => setRankInputs(prev => ({ ...prev, [p.userId]: e.target.value }))}
                                                                placeholder="1,2…"
                                                                style={{ ...rankInput, width: 60 }}
                                                            />
                                                        </td>
                                                        <td style={tdStyle} onClick={e => e.stopPropagation()}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <span style={{ color: '#6b7280', fontSize: 12 }}>₹</span>
                                                                <input
                                                                    type="number" min={0}
                                                                    value={prizeInputs[p.userId] ?? ''}
                                                                    onChange={e => setPrizeInputs(prev => ({ ...prev, [p.userId]: e.target.value }))}
                                                                    placeholder="e.g. 500"
                                                                    style={{ ...rankInput, width: 90 }}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td style={tdStyle} onClick={e => e.stopPropagation()}>
                                                            <button
                                                                onClick={() => saveRank(p.userId)}
                                                                disabled={savingRank === p.userId}
                                                                style={{ ...btnSm, opacity: savingRank === p.userId ? 0.5 : 1 }}
                                                            >
                                                                {savingRank === p.userId ? '…' : 'Save'}
                                                            </button>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <p style={{ fontSize: 12, color: '#6b7280', marginTop: 10, textAlign: 'center' }}>
                                    {isBR
                                        ? '💡 Click any row or "Details →" to set rank, kills, and prize inside the player modal'
                                        : '💡 Click any row to view full player registration details · Prize ₹ fields are optional — leave blank to use % distribution'
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Player Detail Modal ──────────────────────────────────────── */}
            {playerDetail && (
                <div style={{ ...modalOverlay, zIndex: 1001 }} onClick={() => setPlayerDetail(null)}>
                    <div style={{ ...modalBox, maxWidth: 500 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#f3f4f6' }}>
                                👤 Player Registration Details
                            </h3>
                            <button onClick={() => setPlayerDetail(null)} style={btnSm}>✕</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <DetailField label="Username" value={playerDetail.username} />
                            <DetailField label="Email" value={playerDetail.email} />
                            <DetailField label="Status" value={playerDetail.status} highlight={playerDetail.status === 'confirmed' ? '#10b981' : '#f97316'} />
                            <DetailField label="Assigned Slot" value={playerDetail.assignedSlot != null ? `#${playerDetail.assignedSlot}` : '—'} highlight={playerDetail.assignedSlot != null ? '#60a5fa' : undefined} />
                            <DetailField label="Team Leader Name" value={playerDetail.teamLeaderName || '—'} />
                            <DetailField label="Leader Game Name / ID" value={playerDetail.leaderGameName || '—'} />
                            <DetailField label="Team Member 2" value={playerDetail.teamMember2 || '—'} />
                            <DetailField label="Team Member 3" value={playerDetail.teamMember3 || '—'} />
                            <DetailField label="Team Member 4" value={playerDetail.teamMember4 || '—'} />
                            <DetailField label="Entry Fee Paid" value={INR(playerDetail.entryFee ?? 0)} />
                            <DetailField label="Registered At" value={playerDetail.registeredAt ? fmt(playerDetail.registeredAt) : '—'} />
                            {playerDetail.rank && (
                                <DetailField label="Rank" value={`#${playerDetail.rank} (${getRankLabel(playerDetail.rank)})`} highlight="#f97316" />
                            )}
                            {(playerDetail.winningAmount ?? 0) > 0 && (
                                <DetailField label="💰 Prize Won (Total Earnings)" value={INR(playerDetail.winningAmount!)} highlight="#10b981" />
                            )}
                        </div>

                        {(playerDetail.winningAmount ?? 0) > 0 && (
                            <div style={{
                                marginTop: 16, padding: '12px 16px', borderRadius: 10,
                                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                                fontSize: 13, color: '#10b981', textAlign: 'center',
                            }}>
                                ✅ {INR(playerDetail.winningAmount!)} credited to player's <strong>Total Earnings</strong> wallet
                                {playerDetail.winsDistributedAt && <span style={{ color: '#6b7280' }}> · {fmt(playerDetail.winsDistributedAt)}</span>}
                            </div>
                        )}

                        {/* ── BR Settlement Details Section ──────────────────── */}
                        {isBR && !manageTarget?.winningsDistributed && (
                            <>
                                <div style={{
                                    marginTop: 20,
                                    borderTop: '1px solid rgba(255,255,255,0.08)',
                                    paddingTop: 20,
                                }}>
                                    <h4 style={{
                                        margin: '0 0 16px',
                                        fontSize: 15,
                                        fontWeight: 700,
                                        color: '#f97316',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                    }}>
                                        ⚔️ Settlement Details
                                    </h4>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                        {/* Set Rank */}
                                        <div style={settlementFieldBox}>
                                            <label style={settlementLabel}>Set Rank</label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={rankInputs[playerDetail.userId] ?? ''}
                                                onChange={e => setRankInputs(prev => ({ ...prev, [playerDetail.userId]: e.target.value }))}
                                                placeholder="1, 2, 3…"
                                                style={settlementInput}
                                            />
                                        </div>

                                        {/* Prize ₹ */}
                                        <div style={settlementFieldBox}>
                                            <label style={settlementLabel}>Prize ₹</label>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: 13, pointerEvents: 'none' }}>₹</span>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    value={prizeInputs[playerDetail.userId] ?? ''}
                                                    onChange={e => setPrizeInputs(prev => ({ ...prev, [playerDetail.userId]: e.target.value }))}
                                                    placeholder="e.g. 500"
                                                    style={{ ...settlementInput, paddingLeft: 24 }}
                                                />
                                            </div>
                                        </div>

                                        {/* Total Kills */}
                                        <div style={settlementFieldBox}>
                                            <label style={settlementLabel}>Total Kills</label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={killsInputs[playerDetail.userId] ?? ''}
                                                onChange={e => setKillsInputs(prev => ({ ...prev, [playerDetail.userId]: e.target.value }))}
                                                placeholder="0"
                                                style={settlementInput}
                                            />
                                        </div>
                                    </div>

                                    {/* Save Settlement Button */}
                                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={() => saveRank(playerDetail.userId)}
                                            disabled={savingRank === playerDetail.userId || !rankInputs[playerDetail.userId]}
                                            style={{
                                                padding: '10px 24px',
                                                borderRadius: 10,
                                                border: 'none',
                                                background: (!rankInputs[playerDetail.userId] || savingRank === playerDetail.userId)
                                                    ? 'rgba(249,115,22,0.2)'
                                                    : 'linear-gradient(135deg, #f97316, #ea580c)',
                                                color: '#fff',
                                                fontSize: 13,
                                                fontWeight: 700,
                                                cursor: (!rankInputs[playerDetail.userId] || savingRank === playerDetail.userId) ? 'not-allowed' : 'pointer',
                                                opacity: (!rankInputs[playerDetail.userId] || savingRank === playerDetail.userId) ? 0.5 : 1,
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            {savingRank === playerDetail.userId ? '⏳ Saving…' : '💾 Save Settlement'}
                                        </button>
                                    </div>

                                    <p style={{ fontSize: 11, color: '#4b5563', marginTop: 10 }}>
                                        💡 Prize ₹ is optional — leave blank to use default % distribution. Total Kills is for record-keeping.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatChip({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
    return (
        <div>
            <div style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{icon} {label}</div>
            <div style={{ color, fontWeight: 700, fontSize: 15 }}>{value}</div>
        </div>
    );
}

function DetailField({ label, value, highlight }: { label: string; value: string | undefined; highlight?: string }) {
    return (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: highlight || '#f3f4f6' }}>{value || '—'}</div>
        </div>
    );
}

function LoadingRows() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map(i => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, height: 100 }} />
            ))}
        </div>
    );
}
function EmptyState({ icon, msg }: { icon: string; msg: string }) {
    return (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>{icon}</div>
            <p style={{ fontSize: 15 }}>{msg}</p>
        </div>
    );
}
function ErrorMsg({ msg }: { msg: string }) {
    return <p style={{ color: '#ef4444', fontSize: 14 }}>❌ {msg}</p>;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 14, padding: '18px 20px', marginBottom: 14,
};
const tabActive: React.CSSProperties = {
    padding: '8px 18px', borderRadius: 10, border: '1px solid #f97316',
    background: 'rgba(249,115,22,0.12)', color: '#f97316', cursor: 'pointer', fontSize: 13, fontWeight: 700,
};
const tabInactive: React.CSSProperties = {
    padding: '8px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
    background: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: 13, fontWeight: 500,
};
const badge: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: '#ef4444', color: '#fff', borderRadius: 20, fontSize: 10,
    fontWeight: 800, padding: '1px 6px', marginLeft: 6,
};
const btnSm: React.CSSProperties = {
    padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.06)', color: '#e5e7eb', cursor: 'pointer', fontSize: 13, fontWeight: 500,
};
const btnSecondary: React.CSSProperties = {
    padding: '9px 18px', borderRadius: 8, border: '1px solid rgba(249,115,22,0.4)',
    background: 'rgba(249,115,22,0.08)', color: '#f97316', cursor: 'pointer', fontSize: 13, fontWeight: 700,
};
const btnDistribute: React.CSSProperties = {
    padding: '9px 18px', borderRadius: 8, border: 'none',
    background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontSize: 13, fontWeight: 700,
};
const gameBadge: React.CSSProperties = {
    padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
    background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)',
};
const readyBadge: React.CSSProperties = {
    padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
    background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)',
};
const needsBadge: React.CSSProperties = {
    padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
    background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.25)',
};
const settledBadge: React.CSSProperties = {
    padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
    background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)',
};
const prizePill: React.CSSProperties = {
    background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)',
    borderRadius: 8, padding: '4px 12px', textAlign: 'center' as const, fontSize: 12,
};
const modalOverlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
};
const modalBox: React.CSSProperties = {
    background: '#111827', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16, padding: 24, width: '100%', maxWidth: 1000,
    maxHeight: '92vh', overflowY: 'auto',
};
const thStyle: React.CSSProperties = {
    padding: '10px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700,
    color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em',
    borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = { padding: '10px 10px', fontSize: 13, verticalAlign: 'middle' };
const rankInput: React.CSSProperties = {
    width: 72, padding: '6px 8px', borderRadius: 6,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#f3f4f6', fontSize: 13, outline: 'none',
};
const settlementFieldBox: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10, padding: '10px 14px',
};
const settlementLabel: React.CSSProperties = {
    display: 'block', fontSize: 11, color: '#6b7280', textTransform: 'uppercase',
    letterSpacing: '0.04em', marginBottom: 6, fontWeight: 600,
};
const settlementInput: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#f3f4f6', fontSize: 14, fontWeight: 600, outline: 'none',
    transition: 'border-color 0.2s',
};
