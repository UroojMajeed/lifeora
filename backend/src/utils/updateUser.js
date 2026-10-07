const User = require('../models/User');
const ApiError = require('./ApiError');

const ATTEMPTS = 3;

/**
 * Loads the user, lets `change(user)` edit it, and saves. If another save of the same user landed
 * first (Mongoose VersionError, e.g. the app's autosave and a "Next" tap arriving together), it
 * reloads the fresh copy and applies the change again instead of failing.
 * Returns { user, result } where result is whatever `change` returned.
 */
async function updateUser(userId, change) {
  for (let attempt = 1; ; attempt += 1) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');
    const result = await change(user);
    try {
      await user.save();
      return { user, result };
    } catch (err) {
      if (err.name !== 'VersionError' || attempt >= ATTEMPTS) throw err;
    }
  }
}

module.exports = updateUser;
