import { Router } from 'express';
import { backupDatabase, restoreDatabase } from '../controllers/systemController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

router.use(requireAuth, requireRole('administrator'));
router.post('/backup', backupDatabase);
router.post('/restore', restoreDatabase);

export default router;