import React from 'react';

const steps = [
    {
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
        num: '01',
        title: 'Create Account',
        description: 'Sign up for free and verify your profile to get started with competitive gaming.',
        accent: '#FF8C00',
        accentRgb: '255,140,0',
    },
    {
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path strokeLinecap="round" strokeLinejoin="round" d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path strokeLinecap="round" strokeLinejoin="round" d="M4 22h16"/><path strokeLinecap="round" strokeLinejoin="round" d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path strokeLinecap="round" strokeLinejoin="round" d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path strokeLinecap="round" strokeLinejoin="round" d="M18 2H6v7c0 6 6 10 6 10s6-4 6-10Z"/></svg>,
        num: '02',
        title: 'Choose Tournament',
        description: 'Browse available tournaments for your favorite games and select your preferred match type.',
        accent: '#00F0FF',
        accentRgb: '0,240,255',
    },
    {
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8"><rect width="20" height="14" x="2" y="5" rx="2"/><path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20"/></svg>,
        num: '03',
        title: 'Pay Entry Fee',
        description: 'Secure payment processing with multiple payment options including UPI, cards, and wallets.',
        accent: '#BF5AF2',
        accentRgb: '191,90,242',
    },
    {
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8"><rect width="20" height="12" x="2" y="6" rx="2"/><path strokeLinecap="round" strokeLinejoin="round" d="M6 12h4m-2-2v4m10-2h.01M16 10h.01"/></svg>,
        num: '04',
        title: 'Play & Win',
        description: 'Join the match, showcase your skills, and compete with players from across the country.',
        accent: '#30D158',
        accentRgb: '48,209,88',
    },
    {
        icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8"><polyline strokeLinecap="round" strokeLinejoin="round" points="20 12 20 22 4 22 4 12"/><rect width="20" height="5" x="2" y="7"/><line strokeLinecap="round" strokeLinejoin="round" x1="12" x2="12" y1="22" y2="7"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>,
        num: '05',
        title: 'Claim Rewards',
        description: 'Winners receive instant payouts directly to their registered bank accounts or digital wallets.',
        accent: '#FF2D55',
        accentRgb: '255,45,85',
    },
];

const HowItWorks: React.FC = () => {
    return (
        <section
            className="relative py-20 sm:py-28 px-4 sm:px-6 overflow-hidden"
            style={{ background: 'linear-gradient(180deg, #000000 0%, #060606 50%, #000000 100%)' }}
        >
            {/* Ambient glow */}
            <div className="absolute pointer-events-none"
                style={{
                    width: '500px', height: '500px', top: '10%', right: '-10%',
                    background: 'radial-gradient(circle, rgba(191,90,242,0.06) 0%, transparent 70%)',
                    filter: 'blur(80px)',
                }}
            />

            <div className="container mx-auto max-w-6xl relative z-10">
                {/* Header */}
                <div className="text-center mb-16 sm:mb-20">
                    <div className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full"
                        style={{
                            background: 'rgba(0,240,255,0.08)',
                            border: '1px solid rgba(0,240,255,0.15)',
                        }}
                    >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#00F0FF' }} />
                        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#00F0FF' }}>
                            Getting Started
                        </span>
                    </div>

                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4">
                        <span className="text-white">How It </span>
                        <span className="text-gradient-orange">Works</span>
                    </h2>
                    <p className="text-gray-500 text-base sm:text-lg max-w-xl mx-auto">
                        Get started in minutes and begin your journey to become a champion
                    </p>
                </div>

                {/* Steps */}
                <div className="relative">
                    {/* Connecting line (desktop) */}
                    <div className="hidden lg:block absolute top-[52px] left-[10%] right-[10%] h-[1px]"
                        style={{
                            background: 'linear-gradient(90deg, transparent, rgba(255,140,0,0.3) 20%, rgba(0,240,255,0.3) 50%, rgba(191,90,242,0.3) 80%, transparent)',
                        }}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-5">
                        {steps.map((s, i) => (
                            <div key={i} className="group flex flex-col items-center text-center">
                                {/* Step number circle */}
                                <div className="relative mb-6">
                                    {/* Outer ring */}
                                    <div
                                        className="w-[104px] h-[104px] rounded-full flex items-center justify-center transition-all duration-500 group-hover:scale-110"
                                        style={{
                                            background: `conic-gradient(from 0deg, rgba(${s.accentRgb},0.3), rgba(${s.accentRgb},0.05) 50%, rgba(${s.accentRgb},0.3))`,
                                            padding: '2px',
                                        }}
                                    >
                                        {/* Inner circle */}
                                        <div
                                            className="w-full h-full rounded-full flex items-center justify-center relative"
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(0,0,0,0.98), rgba(0,0,0,0.98))',
                                            }}
                                        >
                                            <span className="text-3xl relative z-10 transition-transform duration-300 group-hover:scale-110">
                                                {s.icon}
                                            </span>

                                            {/* Glow on hover */}
                                            <div
                                                className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                                style={{
                                                    background: `radial-gradient(circle, rgba(${s.accentRgb},0.15) 0%, transparent 70%)`,
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Step number badge */}
                                    <div
                                        className="absolute -top-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                                        style={{
                                            background: `linear-gradient(135deg, ${s.accent}, ${s.accent}cc)`,
                                            color: '#fff',
                                            boxShadow: `0 0 12px rgba(${s.accentRgb},0.4)`,
                                        }}
                                    >
                                        {s.num}
                                    </div>
                                </div>

                                {/* Text */}
                                <h3 className="text-white font-bold text-lg mb-2 group-hover:text-white transition-colors">
                                    {s.title}
                                </h3>
                                <p className="text-gray-500 text-sm leading-relaxed max-w-[220px] group-hover:text-gray-400 transition-colors duration-300">
                                    {s.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;
