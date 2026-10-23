import { Router } from 'express';
import {
  listDepartments, getDepartment, getDepartmentUtilization,
  createDepartment, updateDepartment, deleteDepartment,
} from './departments.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { validateBody, validateObjectId } from '../../middleware/validation.middleware';

const router = Router();
router.use(authenticate);

router.get('/', requireRole('ADMIN', 'FINANCE_OFFICER'), listDepartments);
router.get('/:id', validateObjectId('id'), requireRole('ADMIN', 'FINANCE_OFFICER', 'DEPARTMENT_HEAD'), getDepartment);
router.get('/:id/utilization', validateObjectId('id'), requireRole('ADMIN', 'FINANCE_OFFICER', 'DEPARTMENT_HEAD'), getDepartmentUtilization);
router.post('/', requireRole('ADMIN'), validateBody({
  name: { type: 'string', required: true },
  code: { type: 'string', required: true },
  head: { type: 'string', required: true },
}), createDepartment);
router.put('/:id', validateObjectId('id'), requireRole('ADMIN'), updateDepartment);
router.delete('/:id', validateObjectId('id'), requireRole('ADMIN'), deleteDepartment);

export default router;
