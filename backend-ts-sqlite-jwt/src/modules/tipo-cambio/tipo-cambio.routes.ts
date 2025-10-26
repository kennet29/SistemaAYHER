import { Router } from 'express';
import * as ctrl from './tipoCambio.Controller';
import { authenticate } from '../../middleware/auth';

export const tipoCambioRouter = Router();

// Solo ADMIN puede crear/actualizar
tipoCambioRouter.post('/', authenticate, ctrl.create);
tipoCambioRouter.get('/', authenticate, ctrl.list);
tipoCambioRouter.get('/latest',  ctrl.getLatest);
