'use strict';

/**
 * Escape special regex characters in a string to prevent ReDoS attacks
 * when using user input in MongoDB $regex queries.
 *
 * @param {string} str - Raw user input
 * @returns {string} - Escaped string safe for $regex
 */
function escapeRegex(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { escapeRegex };
