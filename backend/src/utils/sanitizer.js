/**
 * Sanitizer Utility
 * Removes or redacts sensitive information from objects before logging
 */

const SENSITIVE_FIELDS = [
    'password',
    'confirmPassword',
    'currentPassword',
    'newPassword',
    'token',
    'accessToken',
    'refreshToken',
    'authorization',
    'apiKey',
    'api_key',
    'secret',
    'razorpay_signature',
    'RAZORPAY_KEY_SECRET',
];

const PARTIAL_REDACT_FIELDS = [
    'email',
    'phone',
    'mobile',
    'cardNumber',
    'card_number',
];

/**
 * Sanitize an object by removing or redacting sensitive fields
 * @param {Object} obj - Object to sanitize
 * @param {Boolean} deep - Whether to recursively sanitize nested objects
 * @returns {Object} - Sanitized copy of the object
 */
function sanitize(obj, deep = true) {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
        return obj.map((item) => (deep ? sanitize(item, deep) : item));
    }

    // Create a shallow copy
    const sanitized = { ...obj };

    // Sanitize each field
    for (const key in sanitized) {
        const lowerKey = key.toLowerCase();

        // Completely redact sensitive fields
        if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
            sanitized[key] = '[REDACTED]';
            continue;
        }

        // Partially redact fields (show first 3 and last 2 characters)
        if (PARTIAL_REDACT_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
            const value = String(sanitized[key]);
            if (value.length > 5) {
                sanitized[key] = `${value.substring(0, 3)}***${value.substring(value.length - 2)}`;
            } else {
                sanitized[key] = '***';
            }
            continue;
        }

        // Recursively sanitize nested objects
        if (deep && typeof sanitized[key] === 'object' && sanitized[key] !== null) {
            sanitized[key] = sanitize(sanitized[key], deep);
        }
    }

    return sanitized;
}

/**
 * Sanitize request body for logging
 * @param {Object} body - Request body
 * @returns {Object} - Sanitized body
 */
function sanitizeRequestBody(body) {
    if (!body || Object.keys(body).length === 0) {
        return {};
    }
    return sanitize(body);
}

/**
 * Sanitize headers for logging
 * @param {Object} headers - Request headers
 * @returns {Object} - Sanitized headers
 */
function sanitizeHeaders(headers) {
    const sanitized = { ...headers };

    // Redact authorization header but keep the type
    if (sanitized.authorization) {
        const parts = sanitized.authorization.split(' ');
        if (parts.length === 2) {
            sanitized.authorization = `${parts[0]} [REDACTED]`;
        } else {
            sanitized.authorization = '[REDACTED]';
        }
    }

    // Redact cookie header
    if (sanitized.cookie) {
        sanitized.cookie = '[REDACTED]';
    }

    return sanitized;
}

/**
 * Sanitize query parameters for logging
 * @param {Object} query - Query parameters
 * @returns {Object} - Sanitized query
 */
function sanitizeQuery(query) {
    if (!query || Object.keys(query).length === 0) {
        return {};
    }
    return sanitize(query);
}

module.exports = {
    sanitize,
    sanitizeRequestBody,
    sanitizeHeaders,
    sanitizeQuery,
};
