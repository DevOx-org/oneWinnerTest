require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const connectDB = require('./config/database');
const { initRedis, closeRedis, getRedisClient } = require('./config/redis');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const responseLogger = require('./middleware/responseLogger');

// Rate limiting
const {
    authLimiter,
    publicLimiter,
    generalLimiter,
    attachRedisStore,
} = require('./middleware/rateLimiter');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const tournamentRoutes = require('./routes/tournamentRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const walletRoutes = require('./routes/walletRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const contactRoutes = require('./routes/contactRoutes');

// ── Bootstrap ───────────────────────────────────────────────────────────────

async function bootstrap() {
    // Connect to MongoDB
    await connectDB();

    // Connect to Redis (graceful — null if unavailable)
    const redisClient = await initRedis();

    // Attach Redis store to rate limiters (if Redis is available)
    if (redisClient) {
        await attachRedisStore(redisClient);
    }

    // Initialize express app
    const app = express();

    // ── Trust proxy ─────────────────────────────────────────────────────────
    // Required for correct req.ip behind reverse proxies (Render, NGINX, Cloudflare).
    // Without this, all users appear as the proxy's IP → rate limiting breaks.
    app.set('trust proxy', 1);

    // ── Security middleware ──────────────────────────────────────────────────
    // Helmet v8 has native Express v5 support — replaces manual res.setHeader() calls.
    app.use(helmet({
        contentSecurityPolicy: false,        // CSP is typically handled by frontend/CDN
        crossOriginEmbedderPolicy: false,    // Allow embedding from allowed origins
    }));

    // CORS configuration — allowed origins from environment
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174')
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean);

    app.use(cors({
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        maxAge: 86400, // preflight cache: 24 hours
    }));

    // ── Rate limiting — tiered strategy ─────────────────────────────────────
    //
    // Tier layout:
    //   /api/auth/*            → authLimiter    (strict, IP-based, 20/15min)
    //   /api/admin/*           → NO limiter     (admin users are unlimited)
    //   /api/leaderboard/*     → publicLimiter  (relaxed, IP-based, 200/15min)
    //   /api/tournaments (GET) → publicLimiter  (relaxed, IP-based, 200/15min)
    //   /api/*  (everything else) → generalLimiter (user-based, 300/15min)
    //
    // Route-specific limiters (e.g., criticalLimiter on room-details) are
    // applied inside their respective route files for precision.
    //
    // Admin routes have NO limiter — the admin bypass works because admin
    // routes require JWT + admin role check via protect + authorize middleware,
    // so they're naturally access-controlled.
    //
    app.use('/api/auth', authLimiter);
    app.use('/api/leaderboard', publicLimiter);
    // General limiter on /api — applies to everything EXCEPT routes above
    // (express-rate-limit creates independent buckets per limiter instance)
    // Admin routes skip this via the admin role check below
    app.use('/api', (req, res, next) => {
        // Skip general limiter for admin routes (they have no limit)
        if (req.path.startsWith('/admin')) {
            return next();
        }
        return generalLimiter(req, res, next);
    });

    // Body parser middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Custom request/response logging middleware
    app.use(requestLogger);
    app.use(responseLogger);

    // HTTP request logging (Morgan - for development only)
    if (process.env.NODE_ENV === 'development') {
        app.use(morgan('dev'));
    } else {
        app.use(morgan('combined', {
            stream: {
                write: (message) => logger.http(message.trim()),
            },
        }));
    }

    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/user', userRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/tournaments', tournamentRoutes);
    app.use('/api/payments', paymentRoutes);
    app.use('/api/wallet', walletRoutes);
    app.use('/api/leaderboard', leaderboardRoutes);
    app.use('/api/contact', contactRoutes);

    // Server time endpoint — frontend uses this instead of client Date.now()
    // to prevent clock-manipulation attacks on match status logic
    app.get('/api/server-time', (req, res) => {
        res.status(200).json({
            success: true,
            serverTime: new Date().toISOString(),
        });
    });

    // Health check route
    app.get('/api/health', (req, res) => {
        res.status(200).json({
            success: true,
            message: 'Server is running',
            timestamp: new Date().toISOString(),
            redis: getRedisClient() ? 'connected' : 'disconnected',
        });
    });

    // 404 handler
    app.use((req, res) => {
        res.status(404).json({
            success: false,
            message: 'Route not found',
        });
    });

    // Error handler middleware (must be last)
    app.use(errorHandler);

    // Start server
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
        logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });

    // ── Graceful shutdown ──────────────────────────────────────────────────
    const gracefulShutdown = async (signal) => {
        logger.info(`${signal} received — shutting down gracefully`);
        server.close(async () => {
            await closeRedis();
            logger.info('Server closed');
            process.exit(0);
        });
        // Force kill after 10s if graceful shutdown hangs
        setTimeout(() => {
            logger.error('Graceful shutdown timed out — forcing exit');
            process.exit(1);
        }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
        logger.error(`Unhandled Rejection: ${err.message}`);
        server.close(() => process.exit(1));
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
        logger.error(`Uncaught Exception: ${err.message}`);
        process.exit(1);
    });

    return app;
}

// Start the application
bootstrap().catch((err) => {
    logger.error(`Bootstrap failed: ${err.message}`);
    process.exit(1);
});

module.exports = bootstrap;
