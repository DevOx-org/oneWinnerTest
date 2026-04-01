import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import SEOHead from '../components/seo/SEOHead';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, googleLogin, isAuthenticated } = useAuth();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Auto-dismiss toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            const from = (location.state as any)?.from?.pathname || '/dashboard';
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, location]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Email validation
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }

        // Password validation
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setErrors({});

        try {
            await login(formData.email, formData.password);
            setToast({ message: 'Login successful!', type: 'success' });

            // Navigate after short delay to show success message
            setTimeout(() => {
                const from = (location.state as any)?.from?.pathname || '/dashboard';
                navigate(from, { replace: true });
            }, 1000);
        } catch (error: any) {
            setToast({ message: error.message || 'Login failed', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse: any) => {
        if (!credentialResponse.credential) {
            setToast({ message: 'Google login failed: no credential received', type: 'error' });
            return;
        }

        setLoading(true);
        try {
            await googleLogin(credentialResponse.credential);
            setToast({ message: 'Login successful!', type: 'success' });

            setTimeout(() => {
                const from = (location.state as any)?.from?.pathname || '/dashboard';
                navigate(from, { replace: true });
            }, 1000);
        } catch (error: any) {
            setToast({ message: error.message || 'Google login failed', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    return (
        <div className="min-h-screen bg-dark-900 flex flex-col">
            <SEOHead
                title="Login"
                description="Log in to your BattleXGround account. Access tournaments, your wallet, match history, and compete in daily esports events."
                path="/login"
            />
            <Header />

            <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
                <div className="w-full max-w-md">
                    {/* Login Card */}
                    <div className="bg-dark-800/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl mt-12">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">Welcome Back!</h1>
                            <p className="text-gray-400">Login to continue your gaming journey</p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Email */}
                            <div>
                                <label className="text-gray-300 text-sm font-semibold mb-2 block">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className={`w-full bg-dark-700/80 text-white px-4 py-3 rounded-lg border ${errors.email ? 'border-red-500' : 'border-white/10'
                                        } focus:border-orange-500 focus:outline-none transition-colors`}
                                    placeholder="Enter your email"
                                />
                                {errors.email && (
                                    <p className="text-red-400 text-xs mt-1">{errors.email}</p>
                                )}
                            </div>

                            {/* Password */}
                            <div>
                                <label className="text-gray-300 text-sm font-semibold mb-2 block">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        autoComplete="current-password"
                                        className={`w-full bg-dark-700/80 text-white px-4 py-3 pr-12 rounded-lg border ${errors.password ? 'border-red-500' : 'border-white/10'
                                            } focus:border-orange-500 focus:outline-none transition-colors`}
                                        placeholder="Enter your password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                                        tabIndex={-1}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? (
                                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                                                <line x1="1" y1="1" x2="23" y2="23" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="text-red-400 text-xs mt-1">{errors.password}</p>
                                )}
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-orange shadow-lg shadow-orange-500/40 hover:shadow-xl hover:shadow-orange-500/60 text-white py-3 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Logging in...' : 'Login'}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="flex items-center gap-4 my-6">
                            <div className="flex-1 h-px bg-white/10"></div>
                            <span className="text-gray-500 text-sm font-medium">or</span>
                            <div className="flex-1 h-px bg-white/10"></div>
                        </div>

                        {/* Google Sign-In */}
                        <div className="flex justify-center">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={() => setToast({ message: 'Google Sign-In failed', type: 'error' })}
                                theme="filled_black"
                                size="large"
                                width="350"
                                text="signin_with"
                                shape="rectangular"
                            />
                        </div>

                        {/* Signup Link */}
                        <div className="mt-6 text-center">
                            <p className="text-gray-400 text-sm">
                                Don't have an account?{' '}
                                <Link to="/signup" className="text-orange-500 hover:text-orange-400 font-semibold">
                                    Sign up
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />

            {/* Toast Notification */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 animate-slideInRight">
                    <div className={`
                        ${toast.type === 'success'
                            ? 'bg-green-600/95 border-green-500/50'
                            : 'bg-red-600/95 border-red-500/50'
                        }
                        backdrop-blur-md border rounded-lg px-6 py-4 shadow-2xl max-w-md
                    `}>
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

export default LoginPage;
