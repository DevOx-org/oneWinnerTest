import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────



interface WithdrawalRequest {
    _id: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    upiId: string;
    adminNote?: string | null;
    createdAt: string;
    processedAt?: string | null;
    userId: { _id: string; name: string; email: string; phone?: string } | string;
    processedBy?: { name: string; email: string } | null;
    walletTxnId?: string;
}

type StatusTab = 'pending' | 'approved' | 'rejected';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getUserName = (u: WithdrawalRequest['userId']) => typeof u === 'object' ? u.name : 'Unknown';
const getUserEmail = (u: WithdrawalRequest['userId']) => typeof u === 'object' ? u.email : '';
const getUserPhone = (u: WithdrawalRequest['userId']) => typeof u === 'object' ? (u.phone ?? '') : '';

const fmtDate = (iso?: string | null) => !iso ? '—' : new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

const fmtINR = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN')}`;



// ─── Component ────────────────────────────────────────────────────────────────

const WithdrawalsManagement: React.FC = () => {
    const [statusTab, setStatusTab] = useState<StatusTab>('pending');
    const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Per-row action state
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
    const [rejectNote, setRejectNote] = useState<Record<string, string>>({});
    const [showRejectBox, setShowRejectBox] = useState<Record<string, boolean>>({});
    const [showConfirmApprove, setShowConfirmApprove] = useState<Record<string, boolean>>({});


    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 5000);
    };

    // ── Fetch ─────────────────────────────────────────────────────────────────

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: '20',
                status: statusTab,
            });
            const res = await api.get(`/admin/withdrawals?${params}`);
            setRequests(res.data.requests ?? []);
            setTotalPages(res.data.pagination?.pages ?? 1);
            setTotalCount(res.data.pagination?.total ?? 0);
        } catch (err: any) {
            setError(err.response?.data?.message ?? 'Failed to load withdrawal requests');
        } finally {
            setLoading(false);
        }
    }, [currentPage, statusTab]);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);
    useEffect(() => { setCurrentPage(1); }, [statusTab]);

    // ── Approve ───────────────────────────────────────────────────────────────

    const handleApprove = async (id: string, adminNote?: string) => {
        setActionLoading(p => ({ ...p, [id]: true }));
        try {
            await api.patch(`/admin/withdrawals/${id}/approve`, { adminNote: adminNote || null });
            showToast('✅ Withdrawal approved — lockedBalance cleared, lifetimeWithdrawn updated.', 'success');
            setShowConfirmApprove(p => ({ ...p, [id]: false }));
            fetchRequests();
        } catch (err: any) {
            showToast(err.response?.data?.message ?? 'Approval failed', 'error');
        } finally {
            setActionLoading(p => ({ ...p, [id]: false }));
        }
    };

    // ── Reject ────────────────────────────────────────────────────────────────

    const handleReject = async (id: string) => {
        const note = (rejectNote[id] ?? '').trim();
        if (!note) { showToast('Rejection reason is required', 'error'); return; }
        setActionLoading(p => ({ ...p, [id]: true }));
        try {
            await api.patch(`/admin/withdrawals/${id}/reject`, { adminNote: note });
            showToast('❌ Rejected — held amount restored to user\'s winning balance.', 'success');
            setShowRejectBox(p => ({ ...p, [id]: false }));
            setRejectNote(p => ({ ...p, [id]: '' }));
            fetchRequests();
        } catch (err: any) {
            showToast(err.response?.data?.message ?? 'Rejection failed', 'error');
        } finally {
            setActionLoading(p => ({ ...p, [id]: false }));
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────



    return (
        <div>
            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 24, right: 24, zIndex: 9999,
                    padding: '12px 20px', borderRadius: 10, maxWidth: 380,
                    background: toast.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                    border: `1px solid ${toast.type === 'success' ? '#10b981' : '#ef4444'}`,
                    color: toast.type === 'success' ? '#10b981' : '#ef4444',
                    fontWeight: 600, fontSize: 14,
                }}>
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white">💸 Withdrawal Requests</h2>
                    <p className="text-gray-400 text-sm mt-1">
                        {totalCount} {statusTab} request{totalCount !== 1 ? 's' : ''}
                        {statusTab === 'pending' && totalCount > 0 && (
                            <span className="ml-2 text-orange-400 font-semibold">⚠️ Requires action</span>
                        )}
                    </p>
                </div>
                <button
                    onClick={fetchRequests}
                    className="text-gray-400 hover:text-white text-sm px-3 py-2 border border-white/10 rounded-lg hover:border-white/20 transition-colors"
                >
                    ↻ Refresh
                </button>
            </div>

            {/* Status Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 border-b border-white/8 pb-0 overflow-x-auto scrollbar-hide">
                {(['pending', 'approved', 'rejected'] as StatusTab[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setStatusTab(tab)}
                        className={`py-3 px-5 text-sm font-semibold border-b-2 transition-all capitalize ${statusTab === tab
                                ? 'border-orange-500 text-orange-400'
                                : 'border-transparent text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        {tab === 'pending' ? '⏳' : tab === 'approved' ? '✅' : '❌'} {tab}
                        {statusTab === tab && totalCount > 0 && (
                            <span className="ml-2 bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded-full">
                                {totalCount}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="text-center py-20 text-gray-400">Loading…</div>
            ) : error ? (
                <div className="text-center py-16">
                    <p className="text-red-400 mb-3">{error}</p>
                    <button onClick={fetchRequests} className="text-orange-400 text-sm border border-orange-500/30 px-4 py-2 rounded-lg">Retry</button>
                </div>
            ) : requests.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-5xl mb-4">🏦</p>
                    <p className="text-gray-400">No {statusTab} withdrawal requests.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map((wr) => {
                        const name = getUserName(wr.userId);
                        const email = getUserEmail(wr.userId);
                        const phone = getUserPhone(wr.userId);
                        const isActing = actionLoading[wr._id];

                        return (
                            <div key={wr._id} className="bg-dark-800/60 border border-white/8 rounded-xl p-5">
                                {/* Top row: user info + amount */}
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="text-white font-bold text-base">{name}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${wr.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                    wr.status === 'approved' ? 'bg-green-500/10  text-green-400  border-green-500/20' :
                                                        'bg-red-500/10    text-red-400    border-red-500/20'
                                                }`}>
                                                {wr.status.charAt(0).toUpperCase() + wr.status.slice(1)}
                                            </span>
                                        </div>
                                        <p className="text-gray-400 text-sm">{email}{phone ? ` · ${phone}` : ''}</p>
                                        <p className="text-gray-600 text-xs mt-1">ID: {wr._id}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-white text-2xl font-black">{fmtINR(wr.amount)}</p>
                                        <p className="text-gray-500 text-xs">Requested {fmtDate(wr.createdAt)}</p>
                                    </div>
                                </div>

                                {/* UPI Details */}
                                <div className="bg-white/3 border border-white/5 rounded-lg p-3 mb-4 text-sm">
                                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-2 font-semibold">UPI Details</p>
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <p className="text-gray-500 text-xs">UPI ID</p>
                                            <p className="text-white font-mono font-semibold text-base">{wr.upiId ?? 'N/A'}</p>
                                        </div>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(wr.upiId ?? '')}
                                            className="text-orange-400 text-xs hover:text-orange-300 border border-orange-500/20 px-2 py-1 rounded"
                                        >
                                            📋 Copy
                                        </button>
                                    </div>
                                </div>

                                {/* Processing info (for approved/rejected) */}
                                {wr.processedAt && (
                                    <div className="text-xs text-gray-500 mb-3">
                                        <span>Processed: {fmtDate(wr.processedAt)}</span>
                                        {wr.processedBy && typeof wr.processedBy === 'object' && (
                                            <span> · by <span className="text-gray-300">{wr.processedBy.name}</span></span>
                                        )}
                                        {wr.adminNote && (
                                            <span> · Note: <span className="text-orange-400">{wr.adminNote}</span></span>
                                        )}
                                    </div>
                                )}

                                {/* Action buttons — only for pending */}
                                {wr.status === 'pending' && (
                                    <div className="border-t border-white/5 pt-4">
                                        {!showRejectBox[wr._id] && !showConfirmApprove[wr._id] && (
                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <button
                                                    onClick={() => setShowConfirmApprove(p => ({ ...p, [wr._id]: true }))}
                                                    disabled={isActing}
                                                    className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-2.5 px-4 rounded-lg text-sm font-bold transition-all"
                                                >
                                                    ✅ Approve (Mark Paid)
                                                </button>
                                                <button
                                                    onClick={() => setShowRejectBox(p => ({ ...p, [wr._id]: true }))}
                                                    disabled={isActing}
                                                    className="flex-1 bg-red-600/15 hover:bg-red-600/30 border border-red-500/25 text-red-400 hover:text-red-300 py-2.5 px-4 rounded-lg text-sm font-bold transition-all"
                                                >
                                                    ❌ Reject
                                                </button>
                                            </div>
                                        )}

                                        {/* Approve confirmation */}
                                        {showConfirmApprove[wr._id] && (
                                            <div className="bg-green-900/15 border border-green-500/20 rounded-xl p-4">
                                                <p className="text-green-400 font-bold text-sm mb-1">⚠️ Confirm Approval</p>
                                                <p className="text-gray-400 text-xs mb-3">
                                                    Confirm that you have manually transferred <strong className="text-white">{fmtINR(wr.amount)}</strong> to{' '}
                                                    UPI ID: <strong className="text-white">{wr.upiId}</strong>.
                                                    This action is <span className="text-yellow-400">irreversible</span> — it will release the locked hold permanently.
                                                </p>
                                                <div className="flex flex-col sm:flex-row gap-2 w-full">
                                                    <button
                                                        onClick={() => handleApprove(wr._id)}
                                                        disabled={isActing}
                                                        className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-2 px-4 rounded-lg text-sm font-bold"
                                                    >
                                                        {isActing ? '⏳ Processing…' : '✅ Yes, I Transferred — Approve'}
                                                    </button>
                                                    <button
                                                        onClick={() => setShowConfirmApprove(p => ({ ...p, [wr._id]: false }))}
                                                        className="px-4 py-2 bg-white/5 hover:bg-white/8 text-gray-400 rounded-lg text-sm"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Reject form */}
                                        {showRejectBox[wr._id] && (
                                            <div className="bg-red-900/10 border border-red-500/15 rounded-xl p-4">
                                                <p className="text-red-400 font-bold text-sm mb-2">Reject Withdrawal — Reason Required</p>
                                                <p className="text-gray-500 text-xs mb-3">
                                                    The user will see this reason. Funds will be automatically restored to their <strong className="text-white">winning balance</strong>.
                                                </p>
                                                <input
                                                    type="text"
                                                    placeholder="Rejection reason (e.g. Invalid UPI ID — please update)"
                                                    value={rejectNote[wr._id] ?? ''}
                                                    onChange={e => setRejectNote(p => ({ ...p, [wr._id]: e.target.value }))}
                                                    className="w-full bg-dark-700/80 text-white px-3 py-2 rounded-lg border border-red-500/20 focus:border-red-500 focus:outline-none text-sm mb-2"
                                                    maxLength={500}
                                                />
                                                <div className="flex flex-col sm:flex-row gap-2 w-full">
                                                    <button
                                                        onClick={() => handleReject(wr._id)}
                                                        disabled={isActing || !(rejectNote[wr._id] ?? '').trim()}
                                                        className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white py-2 px-4 rounded-lg text-sm font-bold"
                                                    >
                                                        {isActing ? '⏳ Rejecting…' : 'Confirm Rejection + Auto-Restore Balance'}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setShowRejectBox(p => ({ ...p, [wr._id]: false }));
                                                            setRejectNote(p => ({ ...p, [wr._id]: '' }));
                                                        }}
                                                        className="px-4 py-2 bg-white/5 hover:bg-white/8 text-gray-400 rounded-lg text-sm"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg disabled:opacity-40 text-sm transition-colors"
                            >
                                ← Previous
                            </button>
                            <span className="text-gray-400 text-sm">Page {currentPage} of {totalPages}</span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg disabled:opacity-40 text-sm transition-colors"
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default WithdrawalsManagement;
