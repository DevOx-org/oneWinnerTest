import React, { useRef, useEffect } from 'react';

/**
 * FlameText — renders children text with a realistic burning flame effect.
 *
 * Technique:
 *  1. SVG feTurbulence filter animates a noise pattern (flame distortion)
 *  2. CSS layers: base text (readable) + flame overlay (animated gradient)
 *  3. Tiny canvas spawns micro-sparks that rise from the text
 */

/* ── Mini spark system for text ──────────────────────── */
interface TextSpark {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    life: number;
    maxLife: number;
    hue: number; // 20-50 range (red-orange to yellow)
}

const FlameText: React.FC<{
    children: React.ReactNode;
    className?: string;
}> = ({ children, className = '' }) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);
    const sparksRef = useRef<TextSpark[]>([]);
    const SPARK_COUNT = 18;

    useEffect(() => {
        const canvas = canvasRef.current;
        const wrapper = wrapperRef.current;
        if (!canvas || !wrapper) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            const rect = wrapper.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = (rect.height + 40) * dpr; // extra space above for sparks
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height + 40}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        resize();
        window.addEventListener('resize', resize);

        const spawn = (): TextSpark => {
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            return {
                x: Math.random() * w,
                y: h - 20 - Math.random() * 15,
                vx: (Math.random() - 0.5) * 0.6,
                vy: -(0.4 + Math.random() * 1.2),
                size: 0.5 + Math.random() * 1.5,
                life: 0,
                maxLife: 40 + Math.random() * 60,
                hue: 20 + Math.random() * 30,
            };
        };

        sparksRef.current = Array.from({ length: SPARK_COUNT }, () => {
            const s = spawn();
            s.life = Math.random() * s.maxLife;
            return s;
        });

        const loop = () => {
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            ctx.clearRect(0, 0, w, h);

            for (let i = 0; i < sparksRef.current.length; i++) {
                const s = sparksRef.current[i];
                s.x += s.vx + (Math.random() - 0.5) * 0.3;
                s.y += s.vy;
                s.life++;

                if (s.life >= s.maxLife || s.y < -5) {
                    sparksRef.current[i] = spawn();
                    continue;
                }

                const progress = s.life / s.maxLife;
                let alpha = progress < 0.2
                    ? progress / 0.2
                    : 1 - (progress - 0.2) / 0.8;
                alpha = Math.max(0, alpha) * 0.9;

                // Glow
                const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 5);
                g.addColorStop(0, `hsla(${s.hue},100%,60%,${alpha * 0.35})`);
                g.addColorStop(1, `hsla(${s.hue},100%,50%,0)`);
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size * 5, 0, Math.PI * 2);
                ctx.fillStyle = g;
                ctx.fill();

                // Core
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${s.hue},100%,70%,${alpha})`;
                ctx.fill();
            }

            animRef.current = requestAnimationFrame(loop);
        };

        animRef.current = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(animRef.current);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <>
            {/* SVG filter for flame distortion (shared, render once) */}
            <svg className="absolute w-0 h-0" aria-hidden="true">
                <defs>
                    <filter id="flame-distort" x="-20%" y="-20%" width="140%" height="140%">
                        <feTurbulence
                            type="fractalNoise"
                            baseFrequency="0.015 0.08"
                            numOctaves="3"
                            seed="2"
                            result="noise"
                        >
                            <animate
                                attributeName="seed"
                                values="2;8;2"
                                dur="2s"
                                repeatCount="indefinite"
                            />
                        </feTurbulence>
                        <feDisplacementMap
                            in="SourceGraphic"
                            in2="noise"
                            scale="6"
                            xChannelSelector="R"
                            yChannelSelector="G"
                        />
                    </filter>
                </defs>
            </svg>

            <span ref={wrapperRef} className={`flame-text-wrapper relative inline-block ${className}`}>
                {/* Spark canvas (positioned above the text) */}
                <canvas
                    ref={canvasRef}
                    className="absolute left-0 pointer-events-none"
                    style={{ bottom: '0', zIndex: 2 }}
                />

                {/* Base readable text */}
                <span className="flame-text-base relative z-[1]">
                    {children}
                </span>

                {/* Flame overlay (animated, clipped to text) */}
                <span
                    className="flame-text-fire absolute inset-0 z-[1]"
                    aria-hidden="true"
                >
                    {children}
                </span>
            </span>
        </>
    );
};

export default FlameText;
