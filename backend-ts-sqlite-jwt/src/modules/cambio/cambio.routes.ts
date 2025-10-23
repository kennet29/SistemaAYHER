import { Router } from 'express';
import * as ctrl from './cambio.controller';
import { authenticate } from '../../middleware/auth';

export const cambioRouter = Router();

cambioRouter.get('/', authenticate, ctrl.list);
cambioRouter.post('/', authenticate, ctrl.create);
cambioRouter.get('/:id', authenticate, ctrl.getById);
