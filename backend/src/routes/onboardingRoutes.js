const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const {
  getOnboarding,
  updateOnboarding,
  completeOnboarding,
} = require('../controllers/onboardingController');

router.use(requireAuth);
router.get('/', getOnboarding);
router.put('/', updateOnboarding);
router.post('/complete', completeOnboarding);

module.exports = router;
