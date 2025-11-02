import { Router } from 'express';
import * as ctrl from './tipoMovimiento.controller';
import { authenticate } from '../../middleware/auth';

export const tipoMovimientoRouter = Router();

// 📌 Crear nuevo tipo de movimiento
tipoMovimientoRouter.post('/',  ctrl.create);

// 📌 Listar todos
tipoMovimientoRouter.get('/',  ctrl.list);

// 📌 Obtener por ID
tipoMovimientoRouter.get('/:id',  ctrl.get);

// 📌 Actualizar tipo de movimiento
tipoMovimientoRouter.put('/:id',  ctrl.update);

// 📌 Eliminar tipo de movimiento
tipoMovimientoRouter.delete('/:id',  ctrl.remove);
