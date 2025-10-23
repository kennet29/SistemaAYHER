import { Router } from 'express';
import * as ctrl from './tipoMovimiento.controller';
import { authenticate } from '../../middleware/auth';

export const tipoMovimientoRouter = Router();
tipoMovimientoRouter.get('/', authenticate, ctrl.list);
