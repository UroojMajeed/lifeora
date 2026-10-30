const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const { listHandoffs, updateHandoff, slipHandoff } = require('../controllers/handoffsController');

router.use(requireAuth);
router.get('/', listHandoffs);
// :activity is the activity's name, URL-encoded (e.g. "Email%20%26%20Messages").
router.put('/:activity', updateHandoff);
router.post('/:activity/slip', slipHandoff);

module.exports = router;
