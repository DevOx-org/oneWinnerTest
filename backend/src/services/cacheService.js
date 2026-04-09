'use strict';

const { getRedisClient } = require('../config/redis');
const logger = require('../config/logger');

// ── Cache Service ───────────────────────────────────────────────────────────
//
// Redis-backed caching layer for hot-path data.
// Currently covers room credentials — the single most burst-sensitive query.
//
// During match start, many participants hit GET /api/tournaments/:id/room-details
// simultaneously. Without caching, each request triggers a MongoDB query
// with `select('+roomId +roomPassword')`. With caching, only the first
// request hits the DB; all subsequent requests within the TTL are served
// from Redis in < 1 ms.
//
// Cache key format:  bxg:room:creds:<tournamentId>
// TTL:               ROOM_CACHE_TTL env var (default 300 = 5 minutes)
//
// If Redis is unavailable, functions fall back to returning null
// (caller must then query MongoDB directly).
// ────────────────────────────────────────────────────────────────────────────

const ROOM_CACHE_PREFIX = 'bxg:room:creds:';
const DEFAULT_TTL = parseInt(process.env.ROOM_CACHE_TTL) || 300; // 5 minutes

/**
 * Get room credentials from cache.
 *
 * @param {string} tournamentId
 * @returns {Promise<{roomId: string, roomPassword: string} | null>}
 *   Cached credentials or null (cache miss / Redis unavailable).
 */
async function getRoomCredentialsCached(tournamentId) {
    const redis = getRedisClient();
    if (!redis) return null;

    try {
        const cached = await redis.get(`${ROOM_CACHE_PREFIX}${tournamentId}`);
        if (cached) {
            logger.debug('Room credentials cache HIT', { tournamentId });
            return JSON.parse(cached);
        }
        logger.debug('Room credentials cache MISS', { tournamentId });
        return null;
    } catch (err) {
        logger.error(`Cache read error (room creds): ${err.message}`, { tournamentId });
        return null;
    }
}

/**
 * Store room credentials in cache.
 *
 * @param {string} tournamentId
 * @param {{roomId: string, roomPassword: string}} credentials
 * @param {number} [ttl] — TTL in seconds (default: ROOM_CACHE_TTL)
 */
async function setRoomCredentialsCached(tournamentId, credentials, ttl = DEFAULT_TTL) {
    const redis = getRedisClient();
    if (!redis) return;

    try {
        await redis.set(
            `${ROOM_CACHE_PREFIX}${tournamentId}`,
            JSON.stringify(credentials),
            'EX',
            ttl,
        );
        logger.debug('Room credentials cached', { tournamentId, ttl });
    } catch (err) {
        logger.error(`Cache write error (room creds): ${err.message}`, { tournamentId });
    }
}

/**
 * Invalidate cached room credentials.
 * Call this when admin updates room credentials via setRoomCredentials.
 *
 * @param {string} tournamentId
 */
async function invalidateRoomCredentials(tournamentId) {
    const redis = getRedisClient();
    if (!redis) return;

    try {
        await redis.del(`${ROOM_CACHE_PREFIX}${tournamentId}`);
        logger.info('Room credentials cache invalidated', { tournamentId });
    } catch (err) {
        logger.error(`Cache invalidation error (room creds): ${err.message}`, { tournamentId });
    }
}

module.exports = {
    getRoomCredentialsCached,
    setRoomCredentialsCached,
    invalidateRoomCredentials,
};
