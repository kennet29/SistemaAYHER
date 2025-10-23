import { Router } from 'express';
import * as ctrl from './compras.controller';
import { authenticate } from '../../middleware/auth';

export const compraRouter = Router();

compraRouter.get('/', authenticate, ctrl.list);
compraRouter.post('/', authenticate, ctrl.create);
compraRouter.get('/:id', authenticate, ctrl.getById);
