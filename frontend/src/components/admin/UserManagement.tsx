import React, { useEffect, useState } from 'react';
import { getAllUsers, getUserById, updateUser, deleteUser } from '../../services/adminService';
import type { AdminUser, Pagination } from '../../types/admin.types';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [sortBy, setSortBy] = useState('createdAt');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [currentPage, setCurrentPage] = useState(1);

    // Modal state
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editFormData, setEditFormData] = useState<Partial<AdminUser>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

    useEffect(() => {
        loadUsers();
    }, [search, roleFilter, sortBy, order, currentPage]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await getAllUsers({
                page: currentPage,
                limit: 20,
                search,
                role: roleFilter,
                sortBy,
                order,
            });

            setUsers(response.users);
            setPagination(response.pagination);
        } catch (err: any) {
            console.error('Failed to load users:', err);
            setError(err.response?.data?.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleEditUser = async (user: AdminUser) => {
        try {
            const details = await getUserById(user._id);
            setSelectedUser(details.user);
            setEditFormData({
                name: details.user.name,
                role: details.user.role,
                phone: details.user.phone,
                gameId: details.user.gameId,
                location: details.user.location,
                bio: details.user.bio,
            });
            setIsEditModalOpen(true);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to load user details');
        }
    };

    const handleSaveUser = async () => {
        if (!selectedUser) return;

        try {
            setIsSaving(true);
            await updateUser(selectedUser._id, editFormData);
            setIsEditModalOpen(false);
            loadUsers();
            alert('User updated successfully!');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to update user');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteUser = (user: AdminUser) => {
        setUserToDelete(user);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;

        setIsDeleting(userToDelete._id);

        try {
            const response = await deleteUser(userToDelete._id);

            // Optimistic update - remove from local state immediately
            setUsers(prevUsers => prevUsers.filter(u => u._id !== userToDelete._id));

            // Show success message with details
            const tournamentsMsg = response.tournamentsUpdated
                ? ` Removed from ${response.tournamentsUpdated} tournament(s).`
                : '';
            alert(`✅ User "${userToDelete.name}" deleted successfully!${tournamentsMsg}`);

            // Reload to ensure consistency
            await loadUsers();
        } catch (err: any) {
            console.error('Delete error:', err);

            // Specific error messages
            const errorMsg = err.response?.data?.message || 'Failed to delete user';
            alert(`❌ Error: ${errorMsg}`);

            // Reload on error to restore correct state
            await loadUsers();
        } finally {
            setIsDeleting(null);
            setUserToDelete(null);
        }
    };

    const cancelDelete = () => {
        setUserToDelete(null);
    };

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setOrder(order === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setOrder('desc');
        }
    };

    if (loading && users.length === 0) {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">User Management</h2>
                <div className="rounded-xl p-8 text-center" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-gray-400">Loading users...</p>
                </div>
            </div>
        );
    }

    if (error && users.length === 0) {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">User Management</h2>
                <div className="rounded-xl p-6 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', backdropFilter: 'blur(20px)' }}>
                    <p className="text-red-400">⚠️ {error}</p>
                    <button
                        onClick={loadUsers}
                        className="mt-4 px-4 py-2 text-white rounded-lg transition-all text-sm font-semibold"
                        style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-white">User Management</h2>
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="px-4 py-2 rounded-lg text-white placeholder-gray-500 focus:outline-none text-sm transition-all"
                        style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                    <select
                        value={roleFilter}
                        onChange={(e) => {
                            setRoleFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="px-4 py-2 rounded-lg text-white focus:outline-none text-sm transition-all"
                        style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                        <option value="">All Roles</option>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="tester">tester</option>
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(20px) saturate(1.6)', WebkitBackdropFilter: 'blur(20px) saturate(1.6)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                        <thead style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <tr>
                                <th
                                    className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-orange-500"
                                    onClick={() => handleSort('name')}
                                >
                                    Name {sortBy === 'name' && (order === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Email
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Role
                                </th>
                                <th
                                    className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-orange-500"
                                    onClick={() => handleSort('createdAt')}
                                >
                                    Joined {sortBy === 'createdAt' && (order === 'asc' ? '↑' : '↓')}
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {users.map((user) => (
                                <tr key={user._id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-white">{user.name}</div>
                                        <div className="text-xs text-gray-500">{user.phone}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                        {user.email}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin'
                                                ? 'bg-purple-900/50 text-purple-300 border border-purple-500/50'
                                                : user.role === 'tester'
                                                    ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-500/50'
                                                    : 'bg-blue-900/50 text-blue-300 border border-blue-500/50'
                                                }`}
                                        >
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleEditUser(user)}
                                            className="text-orange-500 hover:text-orange-400 mr-4"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(user)}
                                            disabled={isDeleting === user._id}
                                            className={`transition-colors ${isDeleting === user._id
                                                ? 'text-gray-500 cursor-not-allowed'
                                                : 'text-red-500 hover:text-red-400'
                                                }`}
                                        >
                                            {isDeleting === user._id ? 'Deleting...' : 'Delete'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination && pagination.pages > 1 && (
                    <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="text-sm text-gray-400">
                            Showing {(currentPage - 1) * pagination.limit + 1} to{' '}
                            {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} users
                        </div>
                        <div className="flex flex-wrap justify-center gap-2">
                            <button
                                onClick={() => setCurrentPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-4 py-2 text-white rounded-lg hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                            >
                                Previous
                            </button>
                            <div className="flex items-center gap-2">
                                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                                    const page = i + 1;
                                    return (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`px-4 py-2 rounded-lg transition-colors text-sm ${currentPage === page
                                                ? 'text-white font-bold'
                                                : 'text-gray-300 hover:bg-white/[0.04]'
                                                }`}
                                            style={currentPage === page ? { background: 'linear-gradient(135deg, #FF8C00, #FF5500)' } : { background: 'rgba(255,255,255,0.04)' }}
                                        >
                                            {page}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setCurrentPage(currentPage + 1)}
                                disabled={currentPage === pagination.pages}
                                className="px-4 py-2 text-white rounded-lg hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit User Modal */}
            {isEditModalOpen && selectedUser && (
                <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(4px)' }}>
                    <div className="rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div className="p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <h3 className="text-2xl font-bold text-white">Edit User</h3>
                            <p className="text-gray-400 mt-1">{selectedUser.email}</p>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                                <input
                                    type="text"
                                    value={editFormData.name || ''}
                                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg text-white focus:outline-none focus:border-orange-500"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                                <select
                                    value={editFormData.role || 'user'}
                                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as any })}
                                    className="w-full px-4 py-2 rounded-lg text-white focus:outline-none focus:border-orange-500"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                    <option value="tester">tester</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                                <input
                                    type="text"
                                    value={editFormData.phone || ''}
                                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg text-white focus:outline-none focus:border-orange-500"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Game ID</label>
                                <input
                                    type="text"
                                    value={editFormData.gameId || ''}
                                    onChange={(e) => setEditFormData({ ...editFormData, gameId: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg text-white focus:outline-none focus:border-orange-500"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
                                <input
                                    type="text"
                                    value={editFormData.location || ''}
                                    onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg text-white focus:outline-none focus:border-orange-500"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
                                <textarea
                                    value={editFormData.bio || ''}
                                    onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 rounded-lg text-white focus:outline-none focus:border-orange-500"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                                />
                            </div>
                        </div>

                        <div className="p-6 flex justify-end gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                disabled={isSaving}
                                className="px-6 py-2 text-white rounded-lg hover:bg-white/[0.06] disabled:opacity-50 transition-colors text-sm"
                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveUser}
                                disabled={isSaving}
                                className="px-6 py-2 text-white rounded-lg disabled:opacity-50 transition-all shadow-lg shadow-orange-500/30 font-semibold"
                                style={{ background: 'linear-gradient(135deg, #FF8C00, #FF5500)' }}
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {userToDelete && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-red-500/30 rounded-2xl shadow-2xl shadow-red-500/20 max-w-md w-full p-6 animate-fadeIn">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Delete User</h3>
                                <p className="text-sm text-gray-400">This action cannot be undone</p>
                            </div>
                        </div>

                        {/* User Details */}
                        <div className="bg-gray-800/50 rounded-lg p-4 mb-4 border border-gray-700">
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Name:</span>
                                    <span className="text-white font-medium">{userToDelete.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Email:</span>
                                    <span className="text-white font-medium">{userToDelete.email}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Role:</span>
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${userToDelete.role === 'admin'
                                        ? 'bg-purple-500/20 text-purple-300'
                                        : 'bg-blue-500/20 text-blue-300'
                                        }`}>
                                        {userToDelete.role}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Warning Message */}
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                            <p className="text-red-300 text-sm font-medium mb-2">This will:</p>
                            <ul className="space-y-1 text-sm text-red-200">
                                <li className="flex items-center gap-2">
                                    <span className="text-red-500">•</span>
                                    Mark the user as deleted
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-red-500">•</span>
                                    Remove them from all tournaments
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-red-500">•</span>
                                    Hide them from the user list
                                </li>
                            </ul>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={cancelDelete}
                                disabled={isDeleting === userToDelete._id}
                                className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting === userToDelete._id}
                                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-red-500/30"
                            >
                                {isDeleting === userToDelete._id ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Deleting...
                                    </span>
                                ) : (
                                    'Delete User'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
