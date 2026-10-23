import { Router } from 'express';
import { listUsers, getUser, createUser, updateUser, deleteUser } from './users.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { validateBody, validateObjectId } from '../../middleware/validation.middleware';

const router = Router();
router.use(authenticate, requireRole('ADMIN'));

router.get('/', listUsers);
router.get('/:id', validateObjectId('id'), getUser);
router.post('/', validateBody({
  name: { type: 'string', required: true },
  email: { type: 'string', required: true },
  password: { type: 'string', required: true },
  role: { type: 'string', required: true, enum: ['ADMIN', 'FINANCE_OFFICER', 'DEPARTMENT_HEAD'] },
  departmentId: { type: 'objectId', required: false },
  status: { type: 'string', required: false, enum: ['ACTIVE', 'INACTIVE'] },
}), createUser);
router.put('/:id', validateObjectId('id'), updateUser);
router.delete('/:id', validateObjectId('id'), deleteUser);

export default router;
