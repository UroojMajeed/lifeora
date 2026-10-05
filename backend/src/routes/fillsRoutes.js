const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const { updateFills } = require('../controllers/handoffsController');

router.use(requireAuth);
// Replaces the whole list of fills; responds like GET /api/handoffs.
router.put('/', updateFills);

module.exports = router;
