import React from 'react';
import { Link } from 'react-router-dom';

const footerLinks = {
    quickLinks: [
        { label: 'Home', to: '/' },
        { label: 'Tournaments', to: '/tournaments' },
        { label: 'Leaderboard', to: '/leaderboard' },
        { label: 'My Profile', to: '/dashboard' },
    ],
    games: [
        { label: 'PUBG Mobile', to: '#' },
        { label: 'Free Fire', to: '#' },
        { label: 'Call of Duty', to: '#' },
        { label: 'Valorant', to: '#' }
    ],
    support: [
        { label: 'Contact Us', to: '/contact' },
        { label: 'Terms of Service', to: '/terms' },
        { label: 'Privacy Policy', to: '/privacy' },
        { label: 'Refund Policy', to: '/refund' },
    ],
};

const socials = [
    {
        label: 'Instagram',
        href: 'https://www.instagram.com/battlexgroundofficial/',
        icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
            </svg>
        ),
    },
    {
        label: 'YouTube',
        href: 'https://www.youtube.com/@battlexgroundofficial',
        icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
        ),
    },
    {
        label: 'Discord',
        href: '#',
        icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
        ),
    },
];

const LinkColumn: React.FC<{ title: string; links: { label: string; to: string }[] }> = ({ title, links }) => (
    <div>
        <h4
            className="text-xs font-semibold uppercase tracking-widest mb-5"
            style={{ color: 'rgba(255,255,255,0.35)' }}
        >
            {title}
        </h4>
        <ul className="space-y-3">
            {links.map((l) => (
                <li key={l.label}>
                    {l.to.startsWith('/') ? (
                        <Link
                            to={l.to}
                            className="text-gray-500 text-sm hover:text-white transition-colors duration-200 flex items-center gap-1.5 group"
                        >
                            <span className="w-0 group-hover:w-2 h-[1px] bg-orange-500 transition-all duration-200" />
                            {l.label}
                        </Link>
                    ) : (
                        <a
                            href={l.to}
                            className="text-gray-500 text-sm hover:text-white transition-colors duration-200 flex items-center gap-1.5 group"
                        >
                            <span className="w-0 group-hover:w-2 h-[1px] bg-orange-500 transition-all duration-200" />
                            {l.label}
                        </a>
                    )}
                </li>
            ))}
        </ul>
    </div>
);

const Footer: React.FC = () => {
    return (
        <footer className="relative overflow-hidden" style={{ background: '#000000' }}>
            {/* Top accent line */}
            <div className="h-[1px] w-full"
                style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,140,0,0.3) 20%, rgba(0,240,255,0.2) 50%, rgba(191,90,242,0.3) 80%, transparent)',
                }}
            />

            {/* Ambient glow */}
            <div className="absolute pointer-events-none"
                style={{
                    width: '400px', height: '400px', bottom: '-200px', left: '10%',
                    background: 'radial-gradient(circle, rgba(255,140,0,0.04) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                }}
            />

            <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-8">

                    {/* Brand (wider column) */}
                    <div className="lg:col-span-2">
                        <Link to="/" className="flex items-center gap-2 mb-5 group">
                            <img 
                                src="/images/bgx-logo.png" 
                                alt="BattleXGround Logo" 
                                className="h-8 sm:h-10 relative z-10 drop-shadow-[0_0_15px_rgba(255,140,0,0.3)] transition-transform duration-300 group-hover:scale-105"
                            />
                        </Link>

                        <p className="text-gray-600 text-sm leading-relaxed mb-6 max-w-xs">
                            India's premier esports tournament platform. Compete, win, and claim your victory in popular mobile and PC games.
                        </p>

                        {/* Socials */}
                        <div className="flex gap-2">
                            {socials.map((s) => (
                                <a
                                    key={s.label}
                                    href={s.href}
                                    target={s.href !== '#' ? '_blank' : undefined}
                                    rel={s.href !== '#' ? 'noopener noreferrer' : undefined}
                                    className="w-9 h-9 rounded-full flex items-center justify-center text-gray-600 transition-all duration-300 hover:text-white hover:scale-110"
                                    style={{
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                    }}
                                    aria-label={s.label}
                                >
                                    {s.icon}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Link columns */}
                    <div className="grid grid-cols-3 gap-4 lg:col-span-3 lg:gap-8">
                        <LinkColumn title="Quick Links" links={footerLinks.quickLinks} />
                        <LinkColumn title="Games" links={footerLinks.games} />
                        <LinkColumn title="Support" links={footerLinks.support} />
                    </div>
                </div>
            </div>

            {/* Bottom bar */}
            <div
                className="border-t relative z-10"
                style={{ borderColor: 'rgba(255,255,255,0.04)' }}
            >
                <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-5">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                        <p className="text-gray-700 text-xs">
                            © 2026 BattleXGround. All rights reserved. Made for Indian gamers.
                        </p>
                        <div className="flex flex-wrap justify-center sm:justify-end gap-3 sm:gap-5">
                            <Link to="/terms" className="text-gray-700 hover:text-gray-400 text-xs transition-colors duration-200">Terms</Link>
                            <Link to="/privacy" className="text-gray-700 hover:text-gray-400 text-xs transition-colors duration-200">Privacy</Link>
                            <Link to="/refund" className="text-gray-700 hover:text-gray-400 text-xs transition-colors duration-200">Refund</Link>
                            <Link to="/contact" className="text-gray-700 hover:text-gray-400 text-xs transition-colors duration-200">Contact</Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
