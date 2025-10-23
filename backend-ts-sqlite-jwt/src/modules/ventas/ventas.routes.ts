import { Router } from 'express';
import * as ctrl from './ventas.controller';
import { authenticate } from '../../middleware/auth';

export const ventaRouter = Router();

ventaRouter.get('/', authenticate, ctrl.list);
ventaRouter.post('/', authenticate, ctrl.create);
ventaRouter.get('/:id', authenticate, ctrl.getById);
