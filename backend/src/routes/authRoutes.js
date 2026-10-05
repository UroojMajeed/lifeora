const router = require('express').Router();
const requireAuth = require('../middleware/auth');
const { createGuest, register, login, me, deleteMe } = require('../controllers/authController');

router.post('/guest', createGuest);
router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, me);
router.delete('/me', requireAuth, deleteMe);

module.exports = router;
