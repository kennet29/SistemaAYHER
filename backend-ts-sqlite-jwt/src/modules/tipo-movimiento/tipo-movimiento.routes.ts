import { Router } from 'express';
import * as ctrl from './tipoMovimiento.controller';
import { authenticate } from '../../middleware/auth';

export const tipoMovimientoRouter = Router();

// 📌 Crear nuevo tipo de movimiento
tipoMovimientoRouter.post('/', authenticate, ctrl.create);

// 📌 Listar todos
tipoMovimientoRouter.get('/', authenticate, ctrl.list);

// 📌 Obtener por ID
tipoMovimientoRouter.get('/:id', authenticate, ctrl.get);

// 📌 Actualizar tipo de movimiento
tipoMovimientoRouter.put('/:id', authenticate, ctrl.update);

// 📌 Eliminar tipo de movimiento
tipoMovimientoRouter.delete('/:id', authenticate, ctrl.remove);
