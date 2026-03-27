'use strict';

const { OAuth2Client } = require('google-auth-library');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Verify a Google ID token and extract user information.
 * NEVER trust frontend data — this is the single source of truth.
 *
 * @param {string} idToken — the credential string from Google Sign-In
 * @returns {{ email: string, name: string, picture: string|null, googleId: string }}
 */
const verifyGoogleToken = async (idToken) => {
    try {
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        if (!payload) {
            throw new ApiError('Invalid Google token: no payload', 401);
        }

        if (!payload.email) {
            throw new ApiError('Google account does not have an email address', 400);
        }

        if (!payload.email_verified) {
            throw new ApiError('Google email is not verified', 400);
        }

        logger.info(`Google token verified for email: ${payload.email}`);

        return {
            email: payload.email.toLowerCase(),
            name: payload.name || payload.email.split('@')[0],
            picture: payload.picture || null,
            googleId: payload.sub,
        };
    } catch (error) {
        // Re-throw ApiErrors as-is
        if (error instanceof ApiError) {
            throw error;
        }

        logger.error(`Google token verification failed: ${error.message}`);
        throw new ApiError('Invalid or expired Google token', 401);
    }
};

module.exports = { verifyGoogleToken };
