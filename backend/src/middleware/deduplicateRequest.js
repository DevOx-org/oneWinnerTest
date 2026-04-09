'use strict';

const { getRedisClient } = require('../config/redis');
const logger = require('../config/logger');

// ── Duplicate Request Guard ─────────────────────────────────────────────────
//
// Prevents the same user from making the same request (method + path) within
// a configurable window. Uses Redis SET NX EX for atomic check-and-lock.
//
// This protects against:
//   1. Frontend double-clicks (user hammering "Get Room Details" button)
//   2. Auto-retry loops that fire before the first response returns
//   3. Rapid polling hitting the server faster than intended
//
// If Redis is unavailable, this middleware becomes a no-op (passes through).
// ────────────────────────────────────────────────────────────────────────────

/**
 * Create a deduplication middleware for a specific route.
 *
 * @param {Object} options
 * @param {number} [options.windowSeconds=2] — lockout window in seconds
 * @param {string} [options.prefix='dedup'] — Redis key prefix for this guard
 * @returns {Function} Express middleware
 */
function deduplicateRequest({ windowSeconds = 2, prefix = 'dedup' } = {}) {
    return async (req, res, next) => {
        const redis = getRedisClient();

        // No Redis → skip deduplication (graceful degradation)
        if (!redis) {
            return next();
        }

        const userId = req.user?.id || req.user?._id?.toString() || req.ip;
        const routeKey = `${req.method}:${req.baseUrl}${req.path}`;
        const redisKey = `bxg:${prefix}:${userId}:${routeKey}`;

        try {
            // SET NX EX = set only if not exists, with expiry
            // Returns 'OK' if the key was set (first request), null if already exists (duplicate)
            const result = await redis.set(redisKey, '1', 'EX', windowSeconds, 'NX');

            if (!result) {
                logger.info('Duplicate request blocked', {
                    userId,
                    route: routeKey,
                    windowSeconds,
                    requestId: req.id,
                });

                return res.status(429).json({
                    success: false,
                    message: 'Request already in progress. Please wait a moment.',
                    retryAfter: windowSeconds,
                });
            }

            next();
        } catch (err) {
            // Redis error — don't block the request, just log and continue
            logger.error(`Dedup middleware Redis error: ${err.message}`, {
                userId,
                route: routeKey,
                requestId: req.id,
            });
            next();
        }
    };
}

module.exports = { deduplicateRequest };
