const winston = require('winston');
const path = require('path');
require('winston-daily-rotate-file');

// Define log format for files (JSON)
const fileLogFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Define log format for console (human-readable)
const consoleLogFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf((info) => {
        const { timestamp, level, message, requestId, userRole, ...meta } = info;
        let log = `${timestamp} ${level}: ${message}`;

        // Add request ID if present
        if (requestId) {
            log += ` [${requestId}]`;
        }

        // Add user role if present (for debugging)
        if (userRole && process.env.LOG_SHOW_ROLE === 'true') {
            log += ` (${userRole})`;
        }

        // Add metadata if present (but not for simple logs)
        if (Object.keys(meta).length > 0 && meta.stack) {
            log += `\n${meta.stack}`;
        }

        return log;
    })
);

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

/**
 * Filter function to determine if a log entry should be displayed
 * based on environment variable configuration
 */
const shouldLogEntry = (info) => {
    const filterMode = process.env.LOG_FILTER_MODE || 'all';

    // In 'all' mode, log everything
    if (filterMode === 'all') {
        return info;
    }

    // Filter by role
    if (filterMode === 'role') {
        const filterRole = process.env.LOG_FILTER_ROLE;
        if (!filterRole) return info; // No filter set, show all

        // Show logs from the specified role OR anonymous requests
        if (info.userRole === filterRole || info.userRole === 'anonymous') {
            return info;
        }
        return false;
    }

    // Filter by specific user ID
    if (filterMode === 'user') {
        const filterUserId = process.env.LOG_FILTER_USER_ID;
        if (!filterUserId) return info; // No filter set, show all

        // Show logs from the specified user OR anonymous requests
        if (info.userId === filterUserId || info.userId === 'anonymous') {
            return info;
        }
        return false;
    }

    return info;
};

// Create daily rotate file transport for all logs (unfiltered)
const allLogsTransport = new winston.transports.DailyRotateFile({
    filename: path.join(__dirname, '../../logs/combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: fileLogFormat,
});

// Create daily rotate file transport for error logs (unfiltered)
const errorLogsTransport = new winston.transports.DailyRotateFile({
    filename: path.join(__dirname, '../../logs/error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '14d',
    format: fileLogFormat,
});

// Create daily rotate file transport for request logs (unfiltered)
const requestLogsTransport = new winston.transports.DailyRotateFile({
    filename: path.join(__dirname, '../../logs/requests-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: fileLogFormat,
    level: 'http',
});

// Create daily rotate file transport for database logs (unfiltered)
const databaseLogsTransport = new winston.transports.DailyRotateFile({
    filename: path.join(__dirname, '../../logs/database-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: fileLogFormat,
});

// Create role-specific log transports
const testerLogsTransport = new winston.transports.DailyRotateFile({
    filename: path.join(__dirname, '../../logs/tester-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(
        winston.format((info) => {
            return info.userRole === 'tester' ? info : false;
        })(),
        fileLogFormat
    ),
});

const adminLogsTransport = new winston.transports.DailyRotateFile({
    filename: path.join(__dirname, '../../logs/admin-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(
        winston.format((info) => {
            return info.userRole === 'admin' ? info : false;
        })(),
        fileLogFormat
    ),
});

const userLogsTransport = new winston.transports.DailyRotateFile({
    filename: path.join(__dirname, '../../logs/user-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(
        winston.format((info) => {
            return info.userRole === 'user' ? info : false;
        })(),
        fileLogFormat
    ),
});

// Create console transport with filtering
const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
        winston.format((info) => shouldLogEntry(info))(),
        consoleLogFormat
    ),
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

// Create logger instance
const logger = winston.createLogger({
    levels,
    format: fileLogFormat,
    transports: [
        // Console transport (filtered based on environment variables)
        consoleTransport,
        // Rotating file transports (unfiltered - for audit trail)
        allLogsTransport,
        errorLogsTransport,
        requestLogsTransport,
        // Role-specific transports
        testerLogsTransport,
        adminLogsTransport,
        userLogsTransport,
    ],
});

// Create a separate logger for database operations
const dbLogger = winston.createLogger({
    levels,
    format: fileLogFormat,
    transports: [databaseLogsTransport],
});

// Log the current filter configuration on startup
if (process.env.LOG_FILTER_MODE && process.env.LOG_FILTER_MODE !== 'all') {
    logger.info('Log filtering enabled', {
        filterMode: process.env.LOG_FILTER_MODE,
        filterRole: process.env.LOG_FILTER_ROLE || 'N/A',
        filterUserId: process.env.LOG_FILTER_USER_ID || 'N/A',
    });
}

// Export both loggers
module.exports = logger;
module.exports.dbLogger = dbLogger;
