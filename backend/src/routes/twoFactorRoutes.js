import { Router } from 'express';
import { setup2fa, verifySetup, verifyLogin } from '../controllers/twoFactorController.js';
import { twoFactorLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/setup', setup2fa);
router.post('/verify-setup', verifySetup);
router.post('/verify-login', twoFactorLimiter, verifyLogin);

export default router;