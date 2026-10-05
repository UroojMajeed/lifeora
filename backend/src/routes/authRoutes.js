const router = require('express').Router();
const { rateLimit } = require('express-rate-limit');
const requireAuth = require('../middleware/auth');
const ApiError = require('../utils/ApiError');
const { createGuest, register, saveAccount, login, me, deleteMe } = require('../controllers/authController');

// Slows down password guessing: 20 tries per 15 minutes per IP is plenty for a real person.
const accountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  handler: (req, res, next) => next(new ApiError(429, 'Too many tries. Please wait a few minutes and try again.')),
});

router.post('/guest', createGuest);
router.post('/register', accountLimiter, register);
router.post('/login', accountLimiter, login);
router.post('/save', accountLimiter, requireAuth, saveAccount);
router.get('/me', requireAuth, me);
router.delete('/me', requireAuth, deleteMe);

module.exports = router;
