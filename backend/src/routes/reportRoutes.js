import { Router } from 'express';
import { getSystemReport } from '../controllers/reportController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = Router();

// Only the top administrator can see the full system report
router.get('/', requireAuth, requireRole('administrator'), getSystemReport);

export default router;