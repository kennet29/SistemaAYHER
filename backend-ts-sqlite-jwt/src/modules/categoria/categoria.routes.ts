import { Router } from 'express';
import * as ctrl from './categoria.controller';
import { authenticate } from '../../middleware/auth';

export const categoriaRouter = Router();

// Rutas protegidas con autenticación
categoriaRouter.get('/', authenticate, ctrl.list);
categoriaRouter.get('/:id', authenticate, ctrl.getById);
categoriaRouter.post('/', authenticate, ctrl.create);
categoriaRouter.put('/:id', authenticate, ctrl.update);
categoriaRouter.delete('/:id', authenticate, ctrl.remove);
