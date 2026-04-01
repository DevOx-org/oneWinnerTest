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

        // Log the full error for debugging
        logger.error('Google token verification failed', {
            errorMessage: error.message,
            errorName: error.name,
            stack: error.stack?.split('\n').slice(0, 3).join(' | '),
        });

        // Provide a more specific error message based on the Google error
        const msg = error.message || '';
        if (msg.includes('Token used too late') || msg.includes('expired')) {
            throw new ApiError('Google token has expired. Please try signing in again.', 401);
        }
        if (msg.includes('audience') || msg.includes('client_id')) {
            throw new ApiError('Google authentication configuration error. Please contact support.', 500);
        }
        if (msg.includes('Wrong number of segments') || msg.includes('Invalid token')) {
            throw new ApiError('Invalid Google token received. Please try again.', 401);
        }

        throw new ApiError(`Google sign-in failed: ${msg || 'Unknown error'}`, 401);
    }
};

module.exports = { verifyGoogleToken };
