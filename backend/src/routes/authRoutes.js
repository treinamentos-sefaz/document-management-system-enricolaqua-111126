const express = require('express');
const { rateLimit } = require('express-rate-limit');
const authController = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');

const router = express.Router();
const authRateLimit = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 10,
	standardHeaders: 'draft-8',
	legacyHeaders: false,
	message: {
		error: {
			code: 'RATE_LIMITED',
			message: 'Muitas tentativas. Aguarde antes de tentar novamente.'
		}
	}
});

router.post('/register', authRateLimit, authController.register);
router.post('/login', authRateLimit, authController.login);
router.get('/me', authenticate, authController.me);

module.exports = router;