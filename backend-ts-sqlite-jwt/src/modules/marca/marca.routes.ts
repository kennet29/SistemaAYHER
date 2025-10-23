import { Router } from 'express';
import * as ctrl from './marca.controller';
import { authenticate } from '../../middleware/auth';

export const marcaRouter = Router();

marcaRouter.get('/', authenticate, ctrl.list);
marcaRouter.post('/', authenticate, ctrl.create);
marcaRouter.get('/:id', authenticate, ctrl.getById);
marcaRouter.put('/:id', authenticate, ctrl.update);
marcaRouter.delete('/:id', authenticate, ctrl.remove);
