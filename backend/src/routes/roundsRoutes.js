const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const { startNextRound } = require('../controllers/handoffsController');

router.use(requireAuth);
router.post('/next', startNextRound);

module.exports = router;
