import React from 'react';

/* ── Feature data with distinct accent colors ──────────── */
const features = [
    {
        icon: '🏆',
        title: 'Play & Win',
        description: 'Compete in multiple game modes and tournaments to showcase your skills and win amazing prizes.',
        accent: '#FF8C00',
        accentRgb: '255,140,0',
    },
    {
        icon: '🎁',
        title: 'Daily Rewards',
        description: 'Log in daily to claim exclusive rewards, bonuses, and special tournament entries.',
        accent: '#00F0FF',
        accentRgb: '0,240,255',
    },
    {
        icon: '🎮',
        title: 'Multiple Games',
        description: 'Play your favorite games including PUBG, Free Fire, Valorant, and Call of Duty.',
        accent: '#BF5AF2',
        accentRgb: '191,90,242',
    },
    {
        icon: '📊',
        title: 'Real-Time Stats',
        description: 'Track your performance with detailed stats, match history, and analytics to improve your game.',
        accent: '#30D158',
        accentRgb: '48,209,88',
    },
    {
        icon: '🔒',
        title: 'Secure Platform',
        description: 'Your data and transactions are protected with bank-level security and encryption.',
        accent: '#FF2D55',
        accentRgb: '255,45,85',
    },
    {
        icon: '💰',
        title: 'Instant Payout',
        description: 'Get your winnings instantly with our fast and reliable payment system.',
        accent: '#FFD60A',
        accentRgb: '255,214,10',
    },
];

const Features: React.FC = () => {
    return (
        <section className="relative py-20 sm:py-28 px-4 sm:px-6 overflow-hidden"
            style={{ background: 'linear-gradient(180deg, #050505 0%, #0a0a0a 50%, #050505 100%)' }}
        >
            {/* ── Ambient glow blobs ──────────────────── */}
            <div className="absolute pointer-events-none"
                style={{
                    width: '500px', height: '500px', top: '-100px', left: '-100px',
                    background: 'radial-gradient(circle, rgba(255,140,0,0.06) 0%, transparent 70%)',
                    filter: 'blur(80px)',
                }}
            />
            <div className="absolute pointer-events-none"
                style={{
                    width: '400px', height: '400px', bottom: '-50px', right: '-50px',
                    background: 'radial-gradient(circle, rgba(0,240,255,0.05) 0%, transparent 70%)',
                    filter: 'blur(80px)',
                }}
            />

            <div className="container mx-auto max-w-6xl relative z-10">
                {/* ── Section Header ───────────────────── */}
                <div className="text-center mb-16 sm:mb-20">
                    <div className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full"
                        style={{
                            background: 'rgba(255,140,0,0.08)',
                            border: '1px solid rgba(255,140,0,0.15)',
                        }}
                    >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF8C00' }} />
                        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#FF8C00' }}>
                            Features
                        </span>
                    </div>

                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4">
                        <span className="text-white">Why Choose </span>
                        <span className="text-gradient-orange">BattleXground</span>
                    </h2>
                    <p className="text-gray-500 text-base sm:text-lg max-w-xl mx-auto">
                        The ultimate competitive gaming platform built for Indian esports
                    </p>
                </div>

                {/* ── Cards Grid ───────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {features.map((f, i) => (
                        <div
                            key={i}
                            className="group relative rounded-2xl p-[1px] transition-all duration-500"
                            style={{
                                background: `linear-gradient(135deg, rgba(${f.accentRgb},0.15) 0%, rgba(${f.accentRgb},0.02) 50%, rgba(255,255,255,0.03) 100%)`,
                            }}
                        >
                            {/* Hover glow behind card */}
                            <div
                                className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm"
                                style={{
                                    background: `linear-gradient(135deg, rgba(${f.accentRgb},0.3) 0%, transparent 60%)`,
                                }}
                            />

                            {/* Card inner */}
                            <div
                                className="relative rounded-2xl p-7 sm:p-8 h-full transition-all duration-500 group-hover:translate-y-[-2px]"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.98) 100%)',
                                }}
                            >
                                {/* Corner accent line */}
                                <div
                                    className="absolute top-0 left-0 w-12 h-[2px] rounded-tr-full opacity-60 group-hover:opacity-100 group-hover:w-20 transition-all duration-500"
                                    style={{ background: f.accent }}
                                />
                                <div
                                    className="absolute top-0 left-0 h-12 w-[2px] rounded-br-full opacity-60 group-hover:opacity-100 group-hover:h-20 transition-all duration-500"
                                    style={{ background: f.accent }}
                                />

                                {/* Title */}
                                <h3
                                    className="text-white font-bold text-lg mb-2.5 transition-colors duration-300"
                                    style={{ color: 'rgba(255,255,255,0.95)' }}
                                >
                                    {f.title}
                                </h3>

                                {/* Description */}
                                <p className="text-gray-500 text-sm leading-relaxed group-hover:text-gray-400 transition-colors duration-300">
                                    {f.description}
                                </p>

                                {/* Bottom right arrow indicator */}
                                <div
                                    className="absolute bottom-6 right-6 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300"
                                    style={{
                                        background: `rgba(${f.accentRgb},0.1)`,
                                        border: `1px solid rgba(${f.accentRgb},0.2)`,
                                    }}
                                >
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke={f.accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Features;
