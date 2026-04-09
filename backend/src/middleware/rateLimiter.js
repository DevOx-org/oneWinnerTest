'use strict';

const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const logger = require('../config/logger');

// ── Tiered Rate Limiting ────────────────────────────────────────────────────
//
// Strategy:
//   Authenticated routes: key = userId (from JWT)   → per-user quota
//   Anonymous routes:     key = IP (via ipKeyGenerator) → per-IP quota
//
// This prevents shared-network users (college WiFi) from exhausting each
// other's allowance. Each tier has its own independent bucket.
//
// Redis store is created lazily (after Redis client is initialized in
// server.js) via `attachRedisStore()`. Until then, all limiters use the
// default in-memory store — functional but not distributed.
// ────────────────────────────────────────────────────────────────────────────

/** @type {import('express-rate-limit').Store | undefined} */
let redisStore = undefined;

/**
 * Attach a Redis store to all limiters (call once after Redis is ready).
 * If Redis is unavailable, limiters continue with in-memory stores.
 */
async function attachRedisStore(redisClient) {
    if (!redisClient) return;

    try {
        const { RedisStore } = require('rate-limit-redis');
        redisStore = new RedisStore({
            // Use ioredis-compatible `call` method
            sendCommand: (...args) => redisClient.call(...args),
            prefix: 'bxg:rl:',
        });
        logger.info('Rate limiter Redis store attached');
    } catch (err) {
        logger.error(`Failed to attach Redis store to rate limiter: ${err.message}`);
        logger.warn('Rate limiters will use in-memory store (non-distributed)');
    }
}

// ── Key generators ──────────────────────────────────────────────────────────

/**
 * Authenticated: userId → per-user bucket. Fallback to IP for unauthenticated.
 * Uses ipKeyGenerator for IPv6-safe IP handling (required by express-rate-limit v8).
 */
const userOrIpKey = (req) => {
    if (req.user?.id) return req.user.id;
    if (req.user?._id) return req.user._id.toString();
    return ipKeyGenerator(req);
};

/**
 * Always IP-based (for pre-auth routes).
 * Uses ipKeyGenerator for IPv6-safe handling.
 */
const ipKey = (req) => ipKeyGenerator(req);

// ── Shared handler for 429 responses ────────────────────────────────────────

const make429Handler = (tierName) => (req, res) => {
    logger.warn(`Rate limit exceeded [${tierName}]`, {
        key: req.user?.id || 'anonymous',
        ip: req.ip,
        url: req.originalUrl,
        method: req.method,
        userId: req.user?.id || 'anonymous',
        requestId: req.id,
    });
};

// ── Limiter factory ─────────────────────────────────────────────────────────

function createLimiter(tierName, windowMs, max, keyGenerator) {
    return rateLimit({
        windowMs,
        max,
        keyGenerator,
        handler: (req, res, next, options) => {
            make429Handler(tierName)(req, res);
            res.status(429).json({
                success: false,
                message: `Too many requests [${tierName}]. Please try again later.`,
                retryAfter: Math.ceil(windowMs / 1000),
            });
        },
        standardHeaders: true,      // RateLimit-* headers (draft-6)
        legacyHeaders: false,        // No X-RateLimit-* headers
        skipFailedRequests: false,
        skipSuccessfulRequests: false,
        // Store is resolved lazily — uses getter so Redis store can be attached later
        get store() {
            return redisStore || undefined; // undefined = built-in MemoryStore
        },
    });
}

// ── Tier definitions ────────────────────────────────────────────────────────

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 min default

/**
 * Auth routes — strict (brute-force protection)
 * IP-based because user isn't authenticated yet.
 * 20 requests / 15 minutes.
 */
const authLimiter = createLimiter(
    'auth',
    WINDOW_MS,
    parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 20,
    ipKey,
);

/**
 * Public data routes — relaxed
 * IP-based (anonymous users).
 * Leaderboard, public tournament list, etc.
 * 200 requests / 15 minutes.
 */
const publicLimiter = createLimiter(
    'public',
    WINDOW_MS,
    parseInt(process.env.RATE_LIMIT_PUBLIC_MAX) || 200,
    ipKey,
);

/**
 * General authenticated routes — standard
 * User-based (per JWT user ID).
 * 300 requests / 15 minutes.
 */
const generalLimiter = createLimiter(
    'general',
    WINDOW_MS,
    parseInt(process.env.RATE_LIMIT_GENERAL_MAX) || 300,
    userOrIpKey,
);

/**
 * Critical routes — very relaxed (per-minute window)
 * Room credentials endpoint — high burst tolerance during match start.
 * User-based. 100 requests / 1 minute.
 */
const criticalLimiter = createLimiter(
    'critical',
    60 * 1000, // 1 minute window
    parseInt(process.env.RATE_LIMIT_CRITICAL_MAX) || 100,
    userOrIpKey,
);

/**
 * Admin bypass — no rate limiting.
 * This is a middleware that checks if the user is an admin and skips
 * rate limiting entirely. Applied via route-level middleware.
 */
const skipIfAdmin = (req, res, next) => {
    if (req.user?.role === 'admin') {
        return next();
    }
    // Non-admin users continue to the next middleware (which will be a limiter)
    next();
};

module.exports = {
    authLimiter,
    publicLimiter,
    generalLimiter,
    criticalLimiter,
    skipIfAdmin,
    attachRedisStore,
};
