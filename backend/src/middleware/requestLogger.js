const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const { sanitizeRequestBody, sanitizeHeaders, sanitizeQuery } = require('../utils/sanitizer');

/**
 * Request Logging Middleware
 * Logs all incoming requests with sanitized data
 */
const requestLogger = (req, res, next) => {
    // Generate unique request ID
    req.id = uuidv4();

    // Capture request start time
    req.startTime = Date.now();

    // Extract user info if authenticated
    const userId = req.user?.id || 'anonymous';
    const userEmail = req.user?.email || 'N/A';
    const userRole = req.user?.role || 'anonymous';

    // Sanitize request data
    const sanitizedBody = sanitizeRequestBody(req.body);
    const sanitizedQuery = sanitizeQuery(req.query);
    const sanitizedHeaders = sanitizeHeaders(req.headers);

    // Log request details
    logger.info('Incoming Request', {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl || req.url,
        route: req.route?.path || 'N/A',
        userId,
        userEmail,
        userRole,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent') || 'N/A',
        body: sanitizedBody,
        query: sanitizedQuery,
        params: req.params,
        headers: {
            'content-type': sanitizedHeaders['content-type'],
            'authorization': sanitizedHeaders['authorization'],
            'origin': sanitizedHeaders['origin'],
        },
        timestamp: new Date().toISOString(),
    });

    next();
};

module.exports = requestLogger;
