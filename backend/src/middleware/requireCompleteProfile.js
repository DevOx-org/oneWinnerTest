const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

/**
 * Middleware: requireCompleteProfile
 *
 * Blocks access to protected features (e.g. tournament registration)
 * if the user has not completed their profile (phone is missing).
 *
 * Must be placed AFTER the `protect` middleware in the middleware chain.
 */
const requireCompleteProfile = asyncHandler(async (req, res, next) => {
    if (!req.user || !req.user.profileCompleted) {
        throw new ApiError(
            'Please complete your profile before accessing this feature. A phone number is required.',
            403
        );
    }
    next();
});

module.exports = requireCompleteProfile;
