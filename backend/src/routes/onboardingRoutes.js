const router = require('express').Router();
const { rateLimit } = require('express-rate-limit');
const requireAuth = require('../middleware/auth');
const ApiError = require('../utils/ApiError');
const {
  getOnboarding,
  updateOnboarding,
  extractSchedule,
  completeOnboarding,
} = require('../controllers/onboardingController');

// Each extraction is a paid Claude API call, so cap it per user.
const extractLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => req.userId,
  handler: (req, res, next) => next(new ApiError(429, "You've tried a lot in the last hour. Add activities by hand or try again later.")),
});

router.use(requireAuth);
router.get('/', getOnboarding);
router.put('/', updateOnboarding);
router.post('/schedule/extract', extractLimiter, extractSchedule);
router.post('/complete', completeOnboarding);

module.exports = router;
