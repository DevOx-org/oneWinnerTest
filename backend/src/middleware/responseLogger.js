const logger = require('../config/logger');

/**
 * Response Logging Middleware
 * Logs all outgoing responses with timing and status information
 */
const responseLogger = (req, res, next) => {
    // Capture the original res.json method
    const originalJson = res.json;

    // Override res.json to log response
    res.json = function (body) {
        // Calculate response time
        const responseTime = Date.now() - (req.startTime || Date.now());

        // Extract user info
        const userId = req.user?.id || 'anonymous';
        const userRole = req.user?.role || 'anonymous';

        // Determine log level based on status code
        const statusCode = res.statusCode;
        let logLevel = 'info';
        if (statusCode >= 500) {
            logLevel = 'error';
        } else if (statusCode >= 400) {
            logLevel = 'warn';
        }

        // Log response details
        logger[logLevel]('Outgoing Response', {
            requestId: req.id,
            method: req.method,
            url: req.originalUrl || req.url,
            userId,
            userRole,
            statusCode,
            responseTime: `${responseTime}ms`,
            contentLength: (() => { try { return JSON.stringify(body).length; } catch { return 0; } })(),
            success: body?.success !== undefined ? body.success : statusCode < 400,
            errorMessage: body?.message || body?.error || null,
            timestamp: new Date().toISOString(),
        });

        // Call the original json method
        return originalJson.call(this, body);
    };

    next();
};

module.exports = responseLogger;
