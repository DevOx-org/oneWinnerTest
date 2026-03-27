import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Header: React.FC = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const navLinks = [
        { to: '/', label: 'Home' },
        { to: '/tournaments', label: 'Tournaments' },
        { to: '/leaderboard', label: 'Leaderboard' },
        ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : []),
    ];

    const isActive = (path: string) => location.pathname === path;

    return (
        <header className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-5 transition-all duration-500"
            style={{ paddingTop: scrolled ? '12px' : '20px' }}
        >
            <nav
                className="mx-auto transition-all duration-500"
                style={{
                    maxWidth: scrolled ? '960px' : '1180px',
                    background: 'rgba(0,0,0,0.55)',
                    backdropFilter: 'blur(20px) saturate(1.6)',
                    WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
                    borderRadius: scrolled ? '50px' : '16px',
                    border: '1px solid rgba(255,255,255,0.07)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)',
                    padding: scrolled ? '6px 6px 6px 18px' : '8px 8px 8px 20px',
                }}
            >
                <div className="flex items-center justify-between">

                    {/* ── Logo ───────────────────────────── */}
                    <Link to="/" className="flex items-center gap-2.5 shrink-0 group">

                        <img 
                            src="/images/bgx-logo.png" 
                            alt="BattleXGround Logo" 
                            className="h-4 sm:h-5 md:h-6 object-contain drop-shadow-lg"
                        />
                    </Link>

                    {/* ── Desktop Links ──────────────────── */}
                    <div className="hidden md:flex items-center gap-1 mx-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className="relative px-4 py-2 text-sm font-medium rounded-full transition-all duration-250 group"
                                style={{
                                    color: isActive(link.to) ? '#fff' : 'rgba(255,255,255,0.5)',
                                }}
                            >
                                {/* Active bg pill */}
                                {isActive(link.to) && (
                                    <span
                                        className="absolute inset-0 rounded-full"
                                        style={{ background: 'rgba(255,140,0,0.12)' }}
                                    />
                                )}

                                {/* Hover bg */}
                                <span
                                    className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                    style={{ background: 'rgba(255,255,255,0.05)' }}
                                />

                                <span className="relative z-10 group-hover:text-white transition-colors duration-200">
                                    {link.label}
                                </span>

                                {/* Active dot */}
                                {isActive(link.to) && (
                                    <span
                                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                                        style={{
                                            background: '#FF8C00',
                                            boxShadow: '0 0 6px rgba(255,140,0,0.6)',
                                        }}
                                    />
                                )}
                            </Link>
                        ))}
                    </div>

                    {/* ── Desktop CTA ────────────────────── */}
                    <Link to="/dashboard" className="hidden md:block shrink-0 group">
                        <div
                            className="relative overflow-hidden px-5 py-2 rounded-full font-semibold text-sm text-white transition-all duration-300 group-hover:shadow-lg"
                            style={{
                                background: 'linear-gradient(135deg, #FF8C00, #FF5500)',
                                boxShadow: '0 2px 16px rgba(255,140,0,0.2)',
                            }}
                        >
                            {/* Shimmer */}
                            <span
                                className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                                style={{
                                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                                }}
                            />
                            <span className="relative z-10 flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                </svg>
                                Profile
                            </span>
                        </div>
                    </Link>

                    {/* ── Mobile Hamburger ───────────────── */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden text-white p-2 rounded-full hover:bg-white/5 transition-colors"
                        aria-label="Toggle menu"
                    >
                        <div className="w-5 h-3.5 flex flex-col justify-between relative">
                            <span className="block h-0.5 bg-white rounded-full transition-all duration-300 origin-center"
                                style={{
                                    transform: isMobileMenuOpen ? 'translateY(6px) rotate(45deg)' : 'none',
                                    width: '100%',
                                }}
                            />
                            <span className="block h-0.5 bg-white rounded-full transition-all duration-200"
                                style={{
                                    width: '60%', marginLeft: 'auto',
                                    opacity: isMobileMenuOpen ? 0 : 1,
                                }}
                            />
                            <span className="block h-0.5 bg-white rounded-full transition-all duration-300 origin-center"
                                style={{
                                    transform: isMobileMenuOpen ? 'translateY(-6px) rotate(-45deg)' : 'none',
                                    width: isMobileMenuOpen ? '100%' : '75%',
                                }}
                            />
                        </div>
                    </button>
                </div>

                {/* ── Mobile Menu ────────────────────── */}
                <div
                    className="md:hidden overflow-hidden transition-all duration-400"
                    style={{
                        maxHeight: isMobileMenuOpen ? '350px' : '0px',
                        opacity: isMobileMenuOpen ? 1 : 0,
                        marginTop: isMobileMenuOpen ? '8px' : '0px',
                    }}
                >
                    <div
                        className="rounded-2xl p-3"
                        style={{
                            background: 'rgba(0,0,0,0.6)',
                            border: '1px solid rgba(255,255,255,0.05)',
                        }}
                    >
                        {navLinks.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="block px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200"
                                style={{
                                    color: isActive(link.to) ? '#FF8C00' : 'rgba(255,255,255,0.6)',
                                    background: isActive(link.to) ? 'rgba(255,140,0,0.08)' : 'transparent',
                                }}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <Link
                            to="/dashboard"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="block mt-2 text-center py-3 rounded-full font-semibold text-sm text-white"
                            style={{ background: 'linear-gradient(135deg, #FF8C00, #FF5500)' }}
                        >
                            My Profile
                        </Link>
                    </div>
                </div>
            </nav>
        </header>
    );
};

export default Header;
