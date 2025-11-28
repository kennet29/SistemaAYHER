import { Router, type RequestHandler } from 'express';
import * as ctrl from './ventas.controller';
import { authenticate } from '../../middleware/auth';

export const ventaRouter = Router();

// Routes refactor for clarity and consistency
ventaRouter
  .route('/')
  .get(ctrl.list)
  .post(authenticate, ctrl.create);

// Facturas de crédito no canceladas
ventaRouter.get('/pendientes', authenticate, ctrl.listPendientes);

// Historial de Proformas
ventaRouter.get('/proformas', authenticate, ctrl.listProformas);
ventaRouter.get('/proformas/:id', authenticate, ctrl.getProformaById);
ventaRouter.get('/proformas/:id/excel', authenticate, ctrl.generarProformaExcel);

ventaRouter
  .route('/:id')
  .get(authenticate, ctrl.getById);

// Excel de una venta (historial)
ventaRouter.get('/:id/excel', authenticate, ctrl.generarVentaExcel);

// Marcar/actualizar cancelada (crédito pagado)
ventaRouter.patch('/:id/cancelada', authenticate, ctrl.updateCancelada);

// PDF Proforma endpoint
// - Keeps unauthenticated access to allow frontends without token if desired
// - Sets CORP header to avoid browser blocking cross-origin resource download
const setPdfHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
};

const logPdfHit: RequestHandler = (req, _res, next) => {
  try {
    console.info('[ventas] /proforma/pdf hit', {
      method: req.method,
      ua: req.headers['user-agent'],
      ip: (req.headers['x-forwarded-for'] as string) || req.ip,
    });
  } catch {}
  next();
};

ventaRouter
  .route('/proforma/pdf')
  .post(setPdfHeaders, logPdfHit, ctrl.proforma)
  .get((_req, res) => res.status(405).json({ message: 'Use POST with JSON payload to generate Proforma PDF.' }));
