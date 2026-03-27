import React, { useRef, useEffect } from 'react';

/* ── Spark Particle type ─────────────────────────────── */
interface Spark {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    life: number;
    maxLife: number;
    color: string;
}

/* ── Config ───────────────────────────────────────────── */
const PARTICLE_COUNT = 60;
const COLORS = [
    'rgba(255,160,20,',   // orange
    'rgba(255,200,60,',   // amber
    'rgba(255,230,120,',  // light yellow
    'rgba(255,120,10,',   // deep orange
    'rgba(255,80,20,',    // red-orange ember
];

function randomRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

/**
 * A canvas-based fire-spark / ember particle system.
 * Sparks originate from the bottom-right and drift diagonally upward.
 * Renders behind hero content via absolute positioning + low z-index.
 */
const FireSparks: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);
    const sparksRef = useRef<Spark[]>([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        /* Resize handler */
        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            const parent = canvas.parentElement;
            const w = parent ? parent.clientWidth : window.innerWidth;
            const h = parent ? parent.clientHeight : window.innerHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        resize();
        window.addEventListener('resize', resize);

        /* Spawn a single spark from the bottom-right area */
        const spawn = (): Spark => {
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;

            // Spawn zone: bottom 15% of height, right 35% of width
            const x = w * (0.65 + Math.random() * 0.35);
            const y = h * (0.85 + Math.random() * 0.15);

            return {
                x,
                y,
                vx: randomRange(-1.2, -0.3),          // drift left
                vy: randomRange(-1.8, -0.5),           // drift up
                size: randomRange(0.8, 2.5),
                life: 0,
                maxLife: randomRange(80, 180),          // frames
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
            };
        };

        /* Initialize pool */
        sparksRef.current = Array.from({ length: PARTICLE_COUNT }, () => {
            const s = spawn();
            s.life = Math.random() * s.maxLife; // stagger initial life
            return s;
        });

        /* Animation loop */
        const loop = () => {
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;

            ctx.clearRect(0, 0, w, h);

            for (let i = 0; i < sparksRef.current.length; i++) {
                const s = sparksRef.current[i];

                // Advance
                s.x += s.vx + randomRange(-0.15, 0.15);   // slight jitter
                s.y += s.vy + randomRange(-0.1, 0.1);
                s.life++;

                // Respawn when dead or off-screen
                if (s.life >= s.maxLife || s.x < -10 || s.y < -10) {
                    sparksRef.current[i] = spawn();
                    continue;
                }

                // Alpha: fade-in first 15%, fade-out last 40%
                const progress = s.life / s.maxLife;
                let alpha: number;
                if (progress < 0.15) {
                    alpha = progress / 0.15;
                } else if (progress > 0.6) {
                    alpha = 1 - (progress - 0.6) / 0.4;
                } else {
                    alpha = 1;
                }
                alpha = Math.max(0, Math.min(1, alpha)) * 0.85;

                // Draw glow (larger, softer)
                const glowRadius = s.size * 4;
                const gradient = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowRadius);
                gradient.addColorStop(0, `${s.color}${(alpha * 0.5).toFixed(2)})`);
                gradient.addColorStop(1, `${s.color}0)`);

                ctx.beginPath();
                ctx.arc(s.x, s.y, glowRadius, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();

                // Draw core (bright, small)
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fillStyle = `${s.color}${alpha.toFixed(2)})`;
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
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 15 }}   /* above slices (z-10) but below content (z-30) */
        />
    );
};

export default FireSparks;
