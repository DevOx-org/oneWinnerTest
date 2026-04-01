import React, { useState, useEffect, useCallback } from 'react';
import {
    getManualPayments,
    approveManualPayment,
    rejectManualPayment,
    type AdminManualPayment,
} from '../../services/adminService';

type FilterStatus = '' | 'pending' | 'approved' | 'rejected';

const PAYMENT_LABELS: Record<string, string> = {
    gpay: 'Google Pay',
    phonepe: 'PhonePe',
    paytm: 'Paytm',
    upi_other: 'UPI Other',
};

const ManualPaymentsManagement: React.FC = () => {
    const [requests, setRequests] = useState<AdminManualPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Modals
    const [approving, setApproving] = useState<string | null>(null);
    const [rejecting, setRejecting] = useState<string | null>(null);
    const [rejectNote, setRejectNote] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        setActionError(null);
        try {
            const res = await getManualPayments({
                status: filterStatus || undefined,
                page,
                limit: 20,
                search: searchTerm || undefined,
            });
            setRequests(res.requests);
            setTotalPages(res.pagination.pages);
            setTotal(res.pagination.total);
        } catch (err: any) {
            setActionError(err?.response?.data?.message || 'Failed to load manual payments');
        } finally {
            setLoading(false);
        }
    }, [filterStatus, page, searchTerm]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    // Debounced search
    const [searchInput, setSearchInput] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(searchInput);
            setPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const handleApprove = async (id: string) => {
        setActionLoading(true);
        setActionError(null);
        setActionSuccess(null);
        try {
            const res = await approveManualPayment(id);
            setActionSuccess(res.message);
            setApproving(null);
            fetchRequests();
        } catch (err: any) {
            setActionError(err?.response?.data?.message || 'Failed to approve');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async (id: string) => {
        setActionLoading(true);
        setActionError(null);
        setActionSuccess(null);
        try {
            const res = await rejectManualPayment(id, rejectNote);
            setActionSuccess(res.message);
            setRejecting(null);
            setRejectNote('');
            fetchRequests();
        } catch (err: any) {
            setActionError(err?.response?.data?.message || 'Failed to reject');
        } finally {
            setActionLoading(false);
        }
    };

    const statusColors: Record<string, { bg: string; text: string; border: string; label: string }> = {
        pending: { bg: 'rgba(234,179,8,0.08)', text: '#EAB308', border: 'rgba(234,179,8,0.2)', label: '⏳ Pending' },
        approved: { bg: 'rgba(34,197,94,0.08)', text: '#22C55E', border: 'rgba(34,197,94,0.2)', label: '✅ Approved' },
        rejected: { bg: 'rgba(239,68,68,0.08)', text: '#EF4444', border: 'rgba(239,68,68,0.2)', label: '❌ Rejected' },
    };

    const filterTabs: { key: FilterStatus; label: string }[] = [
        { key: '', label: 'All' },
        { key: 'pending', label: 'Pending' },
        { key: 'approved', label: 'Approved' },
        { key: 'rejected', label: 'Rejected' },
    ];

    const glassCard: React.CSSProperties = {
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(20px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)',
    };

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white">Manual Payments</h2>
                    <p className="text-gray-500 text-sm">Review and process user deposit requests</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                        {total} total
                    </span>
                </div>
            </div>

            {/* Success/Error banners */}
            {actionSuccess && (
                <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22C55E' }}>
                    ✅ {actionSuccess}
                </div>
            )}
            {actionError && (
                <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
                    ⚠️ {actionError}
                </div>
            )}

            {/* Filters + Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
                <div className="flex gap-1.5 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    {filterTabs.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => { setFilterStatus(key); setPage(1); }}
                            className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200"
                            style={{
                                background: filterStatus === key ? 'rgba(255,140,0,0.15)' : 'transparent',
                                color: filterStatus === key ? '#FF8C00' : 'rgba(255,255,255,0.4)',
                                border: filterStatus === key ? '1px solid rgba(255,140,0,0.3)' : '1px solid transparent',
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <div className="flex-1 max-w-xs">
                    <input
                        type="text"
                        placeholder="Search by name, email or UPI ref..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="w-full text-white px-4 py-2 rounded-lg focus:outline-none text-sm"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                </div>
            </div>

            {/* Table/Cards */}
            <div className="rounded-xl overflow-hidden" style={glassCard}>
                {loading ? (
                    <div className="text-center py-16 text-gray-500 text-sm">Loading manual payments...</div>
                ) : requests.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="mb-2 opacity-40">
                            <svg className="w-10 h-10 mx-auto text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p className="text-gray-500 text-sm">No manual payment requests found.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {/* Table Header (desktop only) */}
                        <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-500" style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <div className="col-span-2">User</div>
                            <div className="col-span-1">Amount</div>
                            <div className="col-span-2">Payment</div>
                            <div className="col-span-2">UPI Ref</div>
                            <div className="col-span-2">Date</div>
                            <div className="col-span-1">Status</div>
                            <div className="col-span-2 text-right">Actions</div>
                        </div>

                        {requests.map((req) => {
                            const sc = statusColors[req.status] || statusColors.pending;
                            const userName = req.userId && typeof req.userId === 'object' ? req.userId.name : 'Unknown';
                            const userEmail = req.userId && typeof req.userId === 'object' ? req.userId.email : 'Unknown';

                            return (
                                <div key={req._id} className="px-5 py-4 transition-all duration-200 hover:bg-white/[0.02]">
                                    {/* Desktop layout */}
                                    <div className="hidden lg:grid grid-cols-12 gap-4 items-center">
                                        <div className="col-span-2 min-w-0">
                                            <p className="text-white text-sm font-semibold truncate">{userName}</p>
                                            <p className="text-gray-500 text-xs truncate">{userEmail}</p>
                                        </div>
                                        <div className="col-span-1">
                                            <p className="text-white font-bold text-sm">₹{(req.amount ?? 0).toLocaleString()}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-gray-400 text-xs">{PAYMENT_LABELS[req.paymentMethod] || req.paymentMethod}</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-gray-300 text-xs font-mono">{req.upiReferenceId}</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-gray-500 text-xs">
                                                {new Date(req.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                            <p className="text-gray-600 text-[10px]">
                                                {new Date(req.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <div className="col-span-1">
                                            <span
                                                className="text-[10px] font-bold px-2 py-1 rounded-full"
                                                style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}
                                            >
                                                {sc.label}
                                            </span>
                                        </div>
                                        <div className="col-span-2 flex justify-end gap-2">
                                            {req.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => setApproving(req._id)}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
                                                        style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)' }}
                                                    >
                                                        ✅ Approve
                                                    </button>
                                                    <button
                                                        onClick={() => setRejecting(req._id)}
                                                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
                                                        style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}
                                                    >
                                                        ❌ Reject
                                                    </button>
                                                </>
                                            )}
                                            {req.status !== 'pending' && req.verifiedBy && typeof req.verifiedBy === 'object' && (
                                                <span className="text-gray-600 text-[10px]">by {req.verifiedBy.name}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Mobile layout */}
                                    <div className="lg:hidden space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-white text-sm font-semibold">{userName}</p>
                                                <p className="text-gray-500 text-xs">{userEmail}</p>
                                            </div>
                                            <span
                                                className="text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0"
                                                style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}
                                            >
                                                {sc.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-white font-bold">₹{(req.amount ?? 0).toLocaleString()}</p>
                                                <p className="text-gray-500 text-xs">{PAYMENT_LABELS[req.paymentMethod]}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-gray-400 text-xs font-mono">{req.upiReferenceId}</p>
                                                <p className="text-gray-600 text-xs">
                                                    {new Date(req.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                </p>
                                            </div>
                                        </div>
                                        {req.adminNote && (
                                            <p className="text-xs" style={{ color: '#EF4444' }}>Note: {req.adminNote}</p>
                                        )}
                                        {req.status === 'pending' && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setApproving(req._id)}
                                                    className="flex-1 py-2 rounded-lg text-xs font-bold text-white"
                                                    style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)' }}
                                                >
                                                    ✅ Approve
                                                </button>
                                                <button
                                                    onClick={() => setRejecting(req._id)}
                                                    className="flex-1 py-2 rounded-lg text-xs font-bold text-white"
                                                    style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}
                                                >
                                                    ❌ Reject
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(page - 1)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-30 transition-all"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
                        >
                            ← Prev
                        </button>
                        <span className="text-xs text-gray-500">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(page + 1)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-30 transition-all"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
                        >
                            Next →
                        </button>
                    </div>
                )}
            </div>

            {/* Approve Confirmation Modal */}
            {approving && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
                    <div className="w-full max-w-sm rounded-xl p-6" style={glassCard}>
                        <h3 className="text-white font-bold text-lg mb-2">Approve Payment?</h3>
                        <p className="text-gray-400 text-sm mb-5">
                            This will credit the user's wallet with the deposited amount. This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setApproving(null)}
                                disabled={actionLoading}
                                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleApprove(approving)}
                                disabled={actionLoading}
                                className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)' }}
                            >
                                {actionLoading ? 'Approving...' : '✅ Approve'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {rejecting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
                    <div className="w-full max-w-sm rounded-xl p-6" style={glassCard}>
                        <h3 className="text-white font-bold text-lg mb-2">Reject Payment?</h3>
                        <p className="text-gray-400 text-sm mb-4">No wallet changes will be made.</p>
                        <textarea
                            value={rejectNote}
                            onChange={(e) => setRejectNote(e.target.value)}
                            placeholder="Rejection reason (optional)"
                            maxLength={500}
                            className="w-full text-white px-4 py-3 rounded-lg mb-4 focus:outline-none text-sm resize-none"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', minHeight: '80px' }}
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setRejecting(null); setRejectNote(''); }}
                                disabled={actionLoading}
                                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleReject(rejecting)}
                                disabled={actionLoading}
                                className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}
                            >
                                {actionLoading ? 'Rejecting...' : '❌ Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManualPaymentsManagement;
