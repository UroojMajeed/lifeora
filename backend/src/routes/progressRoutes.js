const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const { getProgress, updateProgress } = require('../controllers/progressController');

router.use(requireAuth);
router.get('/', getProgress);
router.patch('/', updateProgress);

module.exports = router;
