const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);

        logger.info(`MongoDB Connected: ${conn.connection.host}`);

        // Connection event handlers
        mongoose.connection.on('error', (err) => {
            logger.error(`MongoDB connection error: ${err}`);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
        });

        // Enable Mongoose debug mode for query logging
        if (process.env.NODE_ENV === 'development') {
            // Safe stringify that handles circular references (e.g. session objects in transactions)
            const safeStringify = (obj, maxLen = 200) => {
                if (!obj) return null;
                try {
                    const seen = new WeakSet();
                    const str = JSON.stringify(obj, (key, value) => {
                        if (typeof value === 'object' && value !== null) {
                            if (seen.has(value)) return '[Circular]';
                            seen.add(value);
                        }
                        return value;
                    });
                    return str.substring(0, maxLen);
                } catch {
                    return '[Unserializable]';
                }
            };

            mongoose.set('debug', (collectionName, method, query, doc) => {
                const { dbLogger } = require('./logger');
                dbLogger.info('Mongoose Query', {
                    collection: collectionName,
                    method,
                    query: safeStringify(query),
                    doc: safeStringify(doc),
                    timestamp: new Date().toISOString(),
                });
            });
        }

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            logger.info('MongoDB connection closed through app termination');
            process.exit(0);
        });

    } catch (error) {
        logger.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
