import { Router } from 'express';
import {
  createInputer,
  deleteInputer,
  listAllUsers,
  changeUserRole,
  uploadPgpKey
} from '../controllers/userController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';


const router = Router();

// All user-management routes require an active session
router.use(requireAuth);

// Manager and above can add inputers
router.post('/inputer', requireRole('manager'), createInputer);

// Admin and above can delete inputers
router.delete('/inputer/:id', requireRole('admin'), deleteInputer);

// Admin and above can list all users
router.get('/', requireRole('admin'), listAllUsers);

// Only the top role can change another user's role
router.patch('/:id/role', requireRole('administrator'), changeUserRole);

router.post('/pgp', uploadPgpKey);

export default router;