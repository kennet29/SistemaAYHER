import { Router } from 'express';
import * as ctrl from './reportes.controller';
import { authenticate } from '../../middleware/auth';

export const reportesRouter = Router();

// Kardex por producto
reportesRouter.get('/kardex/:inventarioId', authenticate, ctrl.kardex);

// Cartera de clientes (totales crédito vs contado)
reportesRouter.get('/cartera-clientes', authenticate, ctrl.carteraClientes);
