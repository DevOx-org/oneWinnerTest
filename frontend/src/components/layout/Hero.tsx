import React from 'react';
import { Link } from 'react-router-dom';
import FireSparks from './FireSparks';


/* ── Slice data ─────────────────────────────────────────────── */
const slices = [
    { game: 'CALL OF DUTY', img: '/images/heroes/cod-real.jpg', glow: '#FF2D55', pos: '60% center' },
    { game: 'PUBG', img: '/images/heroes/pubg-real.jpg', glow: '#00F0FF', pos: 'center center' },
    { game: 'FREE FIRE', img: '/images/heroes/freefire-real.jpg', glow: '#FF8C00', pos: 'center center' },
    { game: 'COUNTER STRIKE', img: '/images/heroes/csgo-real.jpg', glow: '#FF2D55', pos: 'center center' },
    { game: 'VALORANT', img: '/images/heroes/valorant-real.jpg', glow: '#BF5AF2', pos: 'center 20%' },
    { game: 'WARZONE', img: '/images/heroes/warzone-real.jpg', glow: '#00F0FF', pos: 'center center' },
];

const Hero: React.FC = () => {
    return (
        <section
            id="hero-banner"
            className="relative w-full overflow-hidden"
            style={{
                aspectRatio: '16/9',
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #000000 0%, #080808 50%, #000000 100%)',
            }}
        >
            {/* ── Ambient glow blobs ──────────────────────────────── */}
            <div
                className="absolute pointer-events-none"
                style={{
                    width: '50%',
                    height: '60%',
                    top: '-10%',
                    left: '-10%',
                    background: 'radial-gradient(circle, rgba(191,90,242,0.12) 0%, transparent 70%)',
                    filter: 'blur(80px)',
                }}
            />
            <div
                className="absolute pointer-events-none"
                style={{
                    width: '40%',
                    height: '50%',
                    bottom: '-10%',
                    right: '-5%',
                    background: 'radial-gradient(circle, rgba(0,240,255,0.10) 0%, transparent 70%)',
                    filter: 'blur(80px)',
                }}
            />
            <div
                className="absolute pointer-events-none"
                style={{
                    width: '30%',
                    height: '40%',
                    top: '30%',
                    right: '20%',
                    background: 'radial-gradient(circle, rgba(255,45,85,0.08) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                }}
            />

            {/* ── Diagonal slice panels ───────────────────────────── */}
            <div className="absolute inset-0 flex bg-black" style={{ transform: 'skewX(-12deg)', left: '-15vw', right: '-15vw' }}>
                {slices.map((s, i) => (
                    <div
                        key={s.game}
                        className={`hero-slice relative flex-1 overflow-hidden group cursor-pointer ${i >= 2 ? 'hidden sm:block' : ''}`}
                        style={{
                            animationDelay: `${i * 0.1}s`,
                            marginLeft: i === 0 ? 0 : '-2px',
                        }}
                    >
                        {/* Neon edge glow (left side of each slice) */}
                        {i > 0 && (
                            <div
                                className="absolute left-0 top-0 h-full z-10"
                                style={{
                                    width: '3px',
                                    background: `linear-gradient(to bottom, transparent 5%, ${s.glow} 30%, ${s.glow} 70%, transparent 95%)`,
                                    boxShadow: `0 0 12px 3px ${s.glow}50, 0 0 30px 6px ${s.glow}25`,
                                }}
                            />
                        )}

                        {/* Skew wrapper to separate transform from hover scale */}
                        <div
                            className="absolute h-full max-w-none origin-center"
                            style={{
                                top: 0,
                                left: 'calc(-15vh - 20px)',
                                width: 'calc(100% + 30vh + 40px)',
                                transform: 'skewX(12deg)'
                            }}
                        >
                            <img
                                src={s.img}
                                alt={s.game}
                                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                                style={{ objectPosition: s.pos }}
                                loading="eager"
                            />
                        </div>

                        {/* Bottom gradient for label */}
                        <div
                            className="absolute bottom-0 left-0 right-0 z-10"
                            style={{
                                height: '35%',
                                background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)',
                            }}
                        />

                        {/* Game label */}
                        <span
                            className="absolute bottom-6 left-1/2 z-20 text-white font-semibold tracking-widest uppercase whitespace-nowrap select-none hidden sm:block"
                            style={{
                                transform: 'skewX(12deg) translateX(-50%)',
                                fontSize: 'clamp(0.55rem, 0.9vw, 0.8rem)',
                                letterSpacing: '0.15em',
                                textShadow: `0 0 10px ${s.glow}80`,
                            }}
                        >
                            {s.game}
                        </span>

                        {/* Hover overlay */}
                        <div
                            className="absolute inset-0 z-5 opacity-0 hover:opacity-100 transition-opacity duration-300"
                            style={{
                                background: `linear-gradient(to top, ${s.glow}18, transparent 60%)`,
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* ── Fire spark particles ───────────────────────── */}
            <FireSparks />

            {/* ── Dark gradient overlays for text readability ─────── */}
            <div className="absolute inset-0 z-10 bg-black/20 pointer-events-none transition-opacity duration-500" />
            <div
                className="absolute inset-0 z-20 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 45%, transparent 80%)',
                }}
            />

            {/* ── Top gradient fade ───────────────────────────────── */}
            <div
                className="absolute top-0 left-0 right-0 z-20 pointer-events-none"
                style={{
                    height: '15%',
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)',
                }}
            />

            {/* ── Hero content (centered) ────────────────────── */}
            <div className="relative z-30 flex flex-col items-center justify-center h-full px-6 sm:px-10 md:px-16 lg:px-20 max-w-4xl mx-auto text-center pointer-events-none">
                {/* Headline */}
                <div className="flex justify-center mb-8 pointer-events-auto">
                    <img
                        src="/images/bgx-logo.png"
                        alt="BattleXGround Logo"
                        className="w-full max-w-[800px] sm:max-w-[1000px] md:max-w-[1200px] lg:max-w-[1500px] xl:max-w-[1800px] object-contain drop-shadow-2xl"
                    />
                </div>

                <p
                    className="text-gray-300 text-[12px] sm:text-base md:text-xl lg:text-2xl font-bold max-w-4xl mb-10 leading-relaxed uppercase pointer-events-auto"
                    style={{ fontFamily: "'Chakra Petch', sans-serif" }}
                >
                    <span className="block tracking-normal sm:tracking-widest">Unleash the power, dominate the field.</span>
                    <span className="block tracking-normal sm:tracking-widest">Enter the ultimate battleground.</span>
                </p>

                {/* CTA buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mt-4 pointer-events-auto">
                    <Link
                        to="/tournaments"
                        className="gradient-orange text-white px-8 py-3.5 rounded-full font-bold text-sm sm:text-base tracking-widest hover:shadow-2xl hover:shadow-orange-500/40 transition-all duration-300 transform hover:scale-105"
                        style={{ fontFamily: "'Chakra Petch', sans-serif" }}
                    >
                        JOIN TOURNAMENT
                    </Link>
                    <Link
                        to="/tournaments"
                        className="text-white px-8 py-3.5 rounded-full font-bold text-sm sm:text-base tracking-widest transition-all duration-300 transform hover:scale-105"
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            backdropFilter: 'blur(12px)',
                            fontFamily: "'Chakra Petch', sans-serif"
                        }}
                    >
                        EXPLORE MATCHES
                    </Link>
                </div>

                {/* Stats row */}
                <div className="flex items-center justify-center gap-6 sm:gap-8 mt-10">
                    {[
                        { value: '5K+', label: 'Players' },
                        { value: '₹50k+', label: 'Prize Pool' },
                        { value: '20+', label: 'Tournaments' },
                    ].map((stat) => (
                        <div key={stat.label} className="text-center">
                            <p className="text-white text-xl sm:text-2xl font-bold">{stat.value}</p>
                            <p className="text-gray-500 text-xs uppercase tracking-wider mt-0.5">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Scroll indicator ────────────────────────────── */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 animate-bounce z-30">
                <div className="w-6 h-10 border-2 border-white/20 rounded-full flex items-start justify-center p-2">
                    <div className="w-1.5 h-3 bg-white/40 rounded-full" />
                </div>
            </div>
        </section>
    );
};

export default Hero;
