import { Router } from 'express';
import { listUsers, setRole } from './user.controller';
import { authenticate, requireRoles } from '../../middleware/auth';

export const userRouter = Router();

userRouter.get('/', authenticate, requireRoles('ADMIN'), listUsers);
userRouter.patch('/:id/role', authenticate, requireRoles('ADMIN'), setRole);
