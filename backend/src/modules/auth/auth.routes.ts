import { Router } from 'express';
import { login, me, logout } from './auth.controller';
import { validateBody } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.post('/login', validateBody({
  email: { type: 'string', required: true },
  password: { type: 'string', required: true },
}), login);
router.get('/me', authenticate, me);
router.post('/logout', authenticate, logout);

export default router;
