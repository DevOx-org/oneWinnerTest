import React, { useState, useEffect, useCallback } from 'react';

interface Testimonial {
    id: number;
    name: string;
    game: string;
    amount: string;
    rating: number;
    quote: string;
    avatar: string;
    accent: string;
    accentRgb: string;
}

const testimonials: Testimonial[] = [
    {
        id: 1, name: 'Nikhil Sharma', game: 'PUBG Mobile', amount: '₹5,000', rating: 5,
        quote: 'BattleXground is the real deal! No fake matches, genuine competition, and rewards that actually get paid. Highly recommended!',
        avatar: '/images/faces/nikhil.png', accent: '#FF8C00', accentRgb: '255,140,0',
    },
    {
        id: 2, name: 'Naitik Sharma', game: 'Free Fire Champion', amount: '₹3,000', rating: 5,
        quote: "Best gaming platform I've used! Fast payouts, great tournaments, and amazing community. Won multiple times!",
        avatar: '/images/faces/naitik.png', accent: '#00F0FF', accentRgb: '0,240,255',
    },
    {
        id: 3, name: 'Chaitanya Pandey', game: 'Call of Duty Player', amount: '₹5,000', rating: 5,
        quote: 'The tournament structure is perfect and the competition is fierce. Love the instant payout system!',
        avatar: '/images/faces/chaitanya.jpg', accent: '#BF5AF2', accentRgb: '191,90,242',
    },
    {
        id: 4, name: 'Deepanshu Kashyap', game: 'Valorant Pro', amount: '₹4,000', rating: 5,
        quote: "BattleXground changed my gaming career! Professional platform with real rewards. Couldn't ask for more!",
        avatar: '/images/faces/deepanshu.jpg', accent: '#FF2D55', accentRgb: '255,45,85',
    },
    {
        id: 5, name: 'Piyush Yadav', game: 'Free Fire Expert', amount: '₹2,000', rating: 5,
        quote: 'Transparent, fair, and rewarding. This is what competitive gaming should be like. Highly satisfied!',
        avatar: '/images/faces/piyush.png', accent: '#30D158', accentRgb: '48,209,88',
    },
];

const Testimonials: React.FC = () => {
    const [current, setCurrent] = useState(0);

    const next = useCallback(() => setCurrent((p) => (p + 1) % testimonials.length), []);
    const prev = useCallback(() => setCurrent((p) => (p === 0 ? testimonials.length - 1 : p - 1)), []);

    useEffect(() => {
        const id = setInterval(next, 5000);
        return () => clearInterval(id);
    }, [next]);

    const t = testimonials[current];

    return (
        <section
            className="relative py-20 sm:py-28 px-4 sm:px-6 overflow-hidden"
            style={{ background: 'linear-gradient(180deg, #050505 0%, #0c0c0c 50%, #050505 100%)' }}
        >
            {/* Ambient glow */}
            <div className="absolute pointer-events-none"
                style={{
                    width: '500px', height: '500px', top: '20%', left: '50%', transform: 'translateX(-50%)',
                    background: `radial-gradient(circle, rgba(${t.accentRgb},0.06) 0%, transparent 70%)`,
                    filter: 'blur(80px)', transition: 'background 0.5s ease',
                }}
            />

            <div className="container mx-auto max-w-5xl relative z-10">
                {/* Header */}
                <div className="text-center mb-14">
                    <div className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full"
                        style={{
                            background: 'rgba(191,90,242,0.08)',
                            border: '1px solid rgba(191,90,242,0.15)',
                        }}
                    >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#BF5AF2' }} />
                        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#BF5AF2' }}>
                            Testimonials
                        </span>
                    </div>

                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4">
                        <span className="text-white">What </span>
                        <span className="text-gradient-orange">Winners</span>
                        <span className="text-white"> Are Saying</span>
                    </h2>
                    <p className="text-gray-500 text-base sm:text-lg max-w-xl mx-auto">
                        Hear from our champion gamers who have won big on BattleXground
                    </p>
                </div>

                {/* Testimonial card */}
                <div className="relative max-w-3xl mx-auto">
                    {/* Nav buttons */}
                    <button
                        onClick={prev}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-16 z-10 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 group"
                        style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            backdropFilter: 'blur(12px)',
                        }}
                        aria-label="Previous"
                    >
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <button
                        onClick={next}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-16 z-10 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 group"
                        style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            backdropFilter: 'blur(12px)',
                        }}
                        aria-label="Next"
                    >
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>

                    {/* Card */}
                    <div
                        className="relative rounded-2xl p-[1px] transition-all duration-500"
                        style={{
                            background: `linear-gradient(135deg, rgba(${t.accentRgb},0.2) 0%, rgba(${t.accentRgb},0.03) 50%, rgba(255,255,255,0.03) 100%)`,
                        }}
                    >
                        <div
                            className="rounded-2xl p-8 sm:p-10 md:p-12 text-center"
                            style={{
                                background: 'linear-gradient(135deg, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.99) 100%)',
                            }}
                        >
                            {/* Quote mark */}
                            <div
                                className="text-5xl font-serif leading-none mb-4 transition-colors duration-500"
                                style={{ color: `rgba(${t.accentRgb},0.25)` }}
                            >
                                "
                            </div>

                            {/* Quote */}
                            <blockquote className="text-gray-300 text-base sm:text-lg leading-relaxed mb-8 max-w-2xl mx-auto">
                                {t.quote}
                            </blockquote>

                            {/* Avatar + info */}
                            <div className="flex flex-col items-center gap-3">
                                <div
                                    className="w-[100px] h-[100px] rounded-full overflow-hidden transition-all duration-500"
                                    style={{
                                        border: `2px solid rgba(${t.accentRgb},0.25)`,
                                        boxShadow: `0 0 20px rgba(${t.accentRgb},0.15)`,
                                    }}
                                >
                                    <img
                                        src={t.avatar}
                                        alt={t.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                <div>
                                    <h3 className="text-white font-bold text-lg">{t.name}</h3>
                                    <p className="text-gray-500 text-sm">{t.game}</p>
                                </div>

                                {/* Won amount */}
                                <div
                                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full mt-1"
                                    style={{
                                        background: `rgba(${t.accentRgb},0.1)`,
                                        border: `1px solid rgba(${t.accentRgb},0.2)`,
                                    }}
                                >
                                    <span className="text-sm font-bold" style={{ color: t.accent }}>
                                        Won {t.amount}
                                    </span>
                                </div>

                                {/* Stars */}
                                <div className="flex gap-1 mt-1">
                                    {[...Array(t.rating)].map((_, i) => (
                                        <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Dots */}
                    <div className="flex justify-center gap-2 mt-8">
                        {testimonials.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrent(i)}
                                className="h-1.5 rounded-full transition-all duration-300"
                                style={{
                                    width: i === current ? '32px' : '8px',
                                    background: i === current ? t.accent : 'rgba(255,255,255,0.15)',
                                    boxShadow: i === current ? `0 0 8px rgba(${t.accentRgb},0.4)` : 'none',
                                }}
                                aria-label={`Go to testimonial ${i + 1}`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Testimonials;
