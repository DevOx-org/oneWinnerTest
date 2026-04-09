'use strict';

const Redis = require('ioredis');
const logger = require('./logger');

// ── Redis Client (Graceful Fallback) ───────────────────────────────────────
//
// If REDIS_URL is set, connects to Redis (Upstash / Redis Cloud / self-hosted).
// If REDIS_URL is missing or connection fails, the exported client is `null`
// and every consumer MUST check `if (redisClient)` before calling any method.
//
// Upstash requires TLS — the `rediss://` protocol prefix handles this.
// ────────────────────────────────────────────────────────────────────────────

let redisClient = null;

/**
 * Initialise the Redis connection.
 * Call once from server.js at startup.
 * @returns {Promise<import('ioredis').Redis | null>}
 */
async function initRedis() {
    const url = process.env.REDIS_URL;

    if (!url) {
        logger.warn('REDIS_URL not set — running without Redis (in-memory fallback for rate limiting, no caching)');
        return null;
    }

    try {
        const client = new Redis(url, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                // Exponential backoff: 200ms, 400ms, 800ms, …, max 5 s
                const delay = Math.min(times * 200, 5000);
                logger.warn(`Redis reconnecting — attempt ${times}, next in ${delay}ms`);
                return delay;
            },
            // Upstash connections are TLS — the `rediss://` prefix auto-enables TLS
            // If the URL already starts with `rediss://`, ioredis handles it.
            enableReadyCheck: true,
            connectTimeout: 10000, // 10 s connect timeout
            lazyConnect: false,    // connect immediately
        });

        // ── Connection event handlers ─────────────────────────────────────────
        client.on('connect', () => {
            logger.info('Redis connected');
        });

        client.on('ready', () => {
            logger.info('Redis ready — accepting commands');
        });

        client.on('error', (err) => {
            logger.error(`Redis error: ${err.message}`);
        });

        client.on('close', () => {
            logger.warn('Redis connection closed');
        });

        // Wait for the connection to be ready (or fail fast)
        await client.ping();
        logger.info('Redis PING successful — connection verified');

        redisClient = client;
        return client;
    } catch (err) {
        logger.error(`Redis connection failed — falling back to in-memory: ${err.message}`);
        redisClient = null;
        return null;
    }
}

/**
 * Get the current Redis client (may be null if not connected).
 * @returns {import('ioredis').Redis | null}
 */
function getRedisClient() {
    return redisClient;
}

/**
 * Gracefully close the Redis connection.
 * Call from server shutdown handlers.
 */
async function closeRedis() {
    if (redisClient) {
        try {
            await redisClient.quit();
            logger.info('Redis connection closed gracefully');
        } catch (err) {
            logger.error(`Redis close error: ${err.message}`);
            redisClient.disconnect();
        }
        redisClient = null;
    }
}

module.exports = { initRedis, getRedisClient, closeRedis };
