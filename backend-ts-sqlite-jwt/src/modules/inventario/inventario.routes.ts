import { Router } from 'express';
import * as ctrl from './inventario.controller';
import { authenticate } from '../../middleware/auth';

export const inventarioRouter = Router();

inventarioRouter.get('/', authenticate, ctrl.list);
inventarioRouter.post('/', authenticate, ctrl.create);
inventarioRouter.get('/:id', authenticate, ctrl.getById);
inventarioRouter.put('/:id', authenticate, ctrl.update);
inventarioRouter.delete('/:id', authenticate, ctrl.remove);

// Reemplazo de la VIEW vw_ProductosConSustituto
inventarioRouter.get('/report/con-sustituto/all', authenticate, ctrl.viewConSustituto);

// Reemplazo del SP sp_BuscarProductoDisponible
inventarioRouter.get('/buscar-disponible', authenticate, ctrl.buscarProductoDisponible);
