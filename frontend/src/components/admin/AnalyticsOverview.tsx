import React, { useEffect, useState } from 'react';
import { getAnalyticsOverview, getUserMetrics, getTournamentMetrics } from '../../services/adminService';
import type { Analytics, UserMetrics, TournamentMetrics } from '../../types/admin.types';

const AnalyticsOverview: React.FC = () => {
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [userMetrics, setUserMetrics] = useState<UserMetrics | null>(null);
    const [tournamentMetrics, setTournamentMetrics] = useState<TournamentMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState(30);

    useEffect(() => {
        loadAnalytics();
    }, [dateRange]);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);

            const [analyticsData, userMetricsData, tournamentMetricsData] = await Promise.all([
                getAnalyticsOverview(),
                getUserMetrics(dateRange),
                getTournamentMetrics(dateRange),
            ]);

            setAnalytics(analyticsData.analytics);
            setUserMetrics(userMetricsData.metrics);
            setTournamentMetrics(tournamentMetricsData.metrics);
        } catch (err: any) {
            console.error('Failed to load analytics:', err);
            setError(err.response?.data?.message || 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-IN').format(num);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">Analytics Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="rounded-xl p-6 animate-pulse" style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <div className="h-20"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">Analytics Overview</h2>
                <div className="rounded-xl p-6 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', backdropFilter: 'blur(20px)' }}>
                    <p className="text-red-400">⚠️ {error}</p>
                    <button
                        onClick={loadAnalytics}
                        className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!analytics) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Analytics Overview</h2>
                <select
                    value={dateRange}
                    onChange={(e) => setDateRange(Number(e.target.value))}
                    className="px-4 py-2 rounded-lg text-white text-sm focus:outline-none transition-all"
                    style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                </select>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon="👥"
                    label="Total Users"
                    value={formatNumber(analytics.totalUsers)}
                    subtext={`+${analytics.newUsersThisMonth} this month`}
                    color="blue"
                />
                <StatCard
                    icon="🏆"
                    label="Active Tournaments"
                    value={formatNumber(analytics.activeTournaments)}
                    subtext={`${analytics.totalTournaments} total`}
                    color="orange"
                />
                <StatCard
                    icon="💰"
                    label="Total Prize Pool"
                    value={formatCurrency(analytics.totalRevenue)}
                    subtext={`${analytics.completedTournaments} completed`}
                    color="green"
                />
                <StatCard
                    icon="📈"
                    label="Growth Rate"
                    value={`${analytics.growthRate > 0 ? '+' : ''}${analytics.growthRate}%`}
                    subtext="Month over month"
                    color={analytics.growthRate > 0 ? 'green' : 'red'}
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Growth Chart */}
                <div className="rounded-xl p-6" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(20px) saturate(1.6)', WebkitBackdropFilter: 'blur(20px) saturate(1.6)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
                    <h3 className="text-lg font-semibold text-white mb-4">User Growth</h3>
                    {userMetrics && userMetrics.userGrowth.length > 0 ? (
                        <div className="space-y-3">
                            <div className="h-48 flex items-end justify-between gap-2">
                                {userMetrics.userGrowth.slice(-14).map((data, index) => {
                                    const maxCount = Math.max(...userMetrics.userGrowth.map(d => d.count));
                                    const height = (data.count / maxCount) * 100;
                                    return (
                                        <div key={index} className="flex-1 flex flex-col items-center group">
                                            <div className="relative w-full">
                                                <div
                                                    className="w-full bg-gradient-to-t from-orange-500 to-orange-600 rounded-t-lg transition-all group-hover:from-orange-400 group-hover:to-orange-500"
                                                    style={{ height: `${height}%`, minHeight: '4px' }}
                                                ></div>
                                                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                    {data.count} users
                                                </div>
                                            </div>
                                            <span className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left">
                                                {new Date(data._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="text-sm text-gray-400 text-center">
                                Daily new user registrations
                            </div>
                        </div>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-gray-500">
                            No user growth data available
                        </div>
                    )}
                </div>

                {/* Role Distribution */}
                <div className="rounded-xl p-6" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(20px) saturate(1.6)', WebkitBackdropFilter: 'blur(20px) saturate(1.6)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
                    <h3 className="text-lg font-semibold text-white mb-4">User Roles</h3>
                    {userMetrics && userMetrics.roleDistribution.length > 0 ? (
                        <div className="space-y-4">
                            {userMetrics.roleDistribution.map((role, index) => {
                                const total = userMetrics.roleDistribution.reduce((sum, r) => sum + r.count, 0);
                                const percentage = ((role.count / total) * 100).toFixed(1);
                                return (
                                    <div key={index} className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-300 capitalize">{role._id}</span>
                                            <span className="text-white font-semibold">
                                                {formatNumber(role.count)} ({percentage}%)
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-700 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${role._id === 'admin'
                                                        ? 'bg-gradient-to-r from-purple-500 to-purple-600'
                                                        : 'bg-gradient-to-r from-blue-500 to-blue-600'
                                                    }`}
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-gray-500">
                            No role distribution data available
                        </div>
                    )}
                </div>
            </div>

            {/* Tournament Stats */}
            {tournamentMetrics && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Tournament Status */}
                    <div className="rounded-xl p-6" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(20px) saturate(1.6)', WebkitBackdropFilter: 'blur(20px) saturate(1.6)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
                        <h3 className="text-lg font-semibold text-white mb-4">Tournament Status</h3>
                        {tournamentMetrics.statusDistribution.length > 0 ? (
                            <div className="space-y-3">
                                {tournamentMetrics.statusDistribution.map((status, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <span className={`w-3 h-3 rounded-full ${getStatusColor(status._id)}`}></span>
                                            <span className="text-gray-300 capitalize">{status._id}</span>
                                        </div>
                                        <span className="text-white font-semibold">{formatNumber(status.count)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-32 flex items-center justify-center text-gray-500">
                                No tournament data available
                            </div>
                        )}
                    </div>

                    {/* Game Popularity */}
                    <div className="rounded-xl p-6" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(20px) saturate(1.6)', WebkitBackdropFilter: 'blur(20px) saturate(1.6)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
                        <h3 className="text-lg font-semibold text-white mb-4">Popular Games</h3>
                        {tournamentMetrics.gamePopularity.length > 0 ? (
                            <div className="space-y-3">
                                {tournamentMetrics.gamePopularity.slice(0, 5).map((game, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                                        <div>
                                            <div className="text-gray-300 font-medium">{game._id}</div>
                                            <div className="text-xs text-gray-500">
                                                {formatNumber(game.totalParticipants)} participants
                                            </div>
                                        </div>
                                        <span className="text-white font-semibold">{formatNumber(game.count)} tournaments</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-32 flex items-center justify-center text-gray-500">
                                No game data available
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper Components
interface StatCardProps {
    icon: string;
    label: string;
    value: string;
    subtext: string;
    color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, subtext }) => {

    return (
        <div
            className={`rounded-xl p-6 transition-all duration-300 hover:-translate-y-0.5 group`}
            style={{
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(20px) saturate(1.6)',
                WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
        >
            <div className="flex items-center justify-between mb-4">
                <span className="text-4xl">{icon}</span>
                <div className="text-right">
                    <p className="text-gray-500 text-sm">{label}</p>
                    <p className="text-3xl font-bold text-white mt-1">{value}</p>
                </div>
            </div>
            <p className="text-xs text-gray-600">{subtext}</p>
        </div>
    );
};

const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
        draft: 'bg-gray-500',
        upcoming: 'bg-blue-500',
        live: 'bg-green-500',
        completed: 'bg-purple-500',
        cancelled: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
};

export default AnalyticsOverview;
