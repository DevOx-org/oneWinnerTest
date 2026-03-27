import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/authService';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

interface CompleteProfileForm {
    phone: string;
    dateOfBirth: string;
    location: string;
    bio: string;
    gameId: string;
}

const CompleteProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [formData, setFormData] = useState<CompleteProfileForm>({
        phone: '',
        dateOfBirth: '',
        location: '',
        bio: '',
        gameId: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setToast(null);

        try {
            // Build data — only send fields that have values
            const data: any = { phone: formData.phone };
            if (formData.dateOfBirth) data.dateOfBirth = formData.dateOfBirth;
            if (formData.location) data.location = formData.location;
            if (formData.bio) data.bio = formData.bio;
            if (formData.gameId) data.gameId = formData.gameId;

            const response = await authService.completeProfile(data);

            // Update user in context
            updateUser(response.user);

            // Update localStorage
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                localStorage.setItem('user', JSON.stringify({ ...parsed, ...response.user }));
            }

            setToast({ message: 'Profile completed successfully!', type: 'success' });

            setTimeout(() => {
                navigate('/dashboard', { replace: true });
            }, 1000);
        } catch (error: any) {
            setToast({ message: error.message || 'Failed to complete profile', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark-900 flex flex-col">
            <Header />
            <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16">
                <div className="w-full max-w-lg">
                    {/* Card */}
                    <div className="bg-dark-800/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Complete Your Profile</h1>
                            <p className="text-gray-400 text-sm">
                                Welcome{user?.name ? `, ${user.name}` : ''}! Please provide your phone number to start playing.
                            </p>
                        </div>

                        {/* Toast */}
                        {toast && (
                            <div className={`mb-6 p-3 rounded-lg text-sm font-medium ${
                                toast.type === 'success'
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                                {toast.message}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Phone (Required) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    Phone Number <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="+91XXXXXXXXXX"
                                    required
                                    className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25 transition-all"
                                />
                            </div>

                            {/* Date of Birth */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    Date of Birth
                                </label>
                                <input
                                    type="date"
                                    name="dateOfBirth"
                                    value={formData.dateOfBirth}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25 transition-all"
                                />
                            </div>

                            {/* Game ID */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    Game ID
                                </label>
                                <input
                                    type="text"
                                    name="gameId"
                                    value={formData.gameId}
                                    onChange={handleChange}
                                    placeholder="Your in-game username"
                                    className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25 transition-all"
                                />
                            </div>

                            {/* Location */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    Location
                                </label>
                                <input
                                    type="text"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    placeholder="City, State"
                                    className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25 transition-all"
                                />
                            </div>

                            {/* Bio */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    Bio
                                </label>
                                <textarea
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleChange}
                                    placeholder="Tell us about yourself..."
                                    rows={3}
                                    maxLength={500}
                                    className="w-full px-4 py-3 bg-dark-700 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/25 transition-all resize-none"
                                />
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading || !formData.phone}
                                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-amber-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Saving...
                                    </span>
                                ) : (
                                    'Complete Profile & Start Playing'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default CompleteProfilePage;
