import { Router } from 'express';
import * as ctrl from './reportes.controller';
import { authenticate } from '../../middleware/auth';

export const reportesRouter = Router();

// Kardex por producto
reportesRouter.get('/kardex/:inventarioId', authenticate, ctrl.kardex);

// Cartera de clientes (totales crédito vs contado)
reportesRouter.get('/cartera-clientes', authenticate, ctrl.carteraClientes);

// Detalle completo de un cliente
reportesRouter.get('/cliente-detalle/:clienteId', authenticate, ctrl.clienteDetalle);

// Reporte detallado de ventas por clientes con utilidad
reportesRouter.get('/ventas-detalladas-clientes', authenticate, ctrl.ventasDetalladasClientes);
