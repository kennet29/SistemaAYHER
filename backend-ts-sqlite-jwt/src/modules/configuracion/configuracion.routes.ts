import { Router } from 'express';
import * as ctrl from './configuracion.controller';
import { authenticate } from '../../middleware/auth';

export const configuracionRouter = Router();

// 📌 Obtener configuración
configuracionRouter.get('/', authenticate, ctrl.getConfiguracion);

// 📌 Crear o actualizar configuración
configuracionRouter.post('/', authenticate, ctrl.upsertConfiguracion);

// 📌 Eliminar configuración (opcional)
configuracionRouter.delete('/', authenticate, ctrl.deleteConfiguracion);
