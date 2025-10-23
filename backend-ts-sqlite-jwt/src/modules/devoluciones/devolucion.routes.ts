import { Router } from 'express';
import * as ctrl from './devolucion.controller';
import { authenticate } from '../../middleware/auth';

export const devolucionRouter = Router();

// Devolución de Venta
devolucionRouter.post('/venta', authenticate, ctrl.createDevolucionVenta);

// Devolución de Compra
devolucionRouter.post('/compra', authenticate, ctrl.createDevolucionCompra);
