const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(new ApiError(401, 'Authentication required'));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    return next();
  } catch {
    return next(new ApiError(401, 'Invalid or expired token'));
  }
}

module.exports = requireAuth;
