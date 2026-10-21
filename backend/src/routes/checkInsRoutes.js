const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const { saveCheckIn } = require('../controllers/checkInsController');

router.use(requireAuth);
// The weekly check-in; responds like GET /api/handoffs.
router.post('/', saveCheckIn);

module.exports = router;
