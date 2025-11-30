import { Router } from 'express';
import * as ctrl from './configuracion.controller';
import { authenticate } from '../../middleware/auth';

export const configuracionRouter = Router();

// 📌 Obtener configuración
configuracionRouter.get('/',  ctrl.getConfiguracion);

// 📌 Crear o actualizar configuración
configuracionRouter.post('/',  ctrl.upsertConfiguracion);

// 📌 Eliminar configuración (opcional)
configuracionRouter.delete('/',  ctrl.deleteConfiguracion);

// 📌 Obtener siguiente número de factura
configuracionRouter.get('/siguiente-numero-factura', ctrl.getSiguienteNumeroFactura);

// 📌 Actualizar último número de factura
configuracionRouter.post('/actualizar-numero-factura', ctrl.actualizarUltimoNumeroFactura);
