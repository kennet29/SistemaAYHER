import { Router } from 'express';
import * as ctrl from './tipoCambio.Controller';
import { authenticate } from '../../middleware/auth';

export const tipoCambioRouter = Router();

tipoCambioRouter.post('/',  ctrl.create);
tipoCambioRouter.get('/',  ctrl.list);
tipoCambioRouter.get('/latest',  ctrl.getLatest);