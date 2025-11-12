import { Router } from 'express';
import * as ctrl from './inventario.controller';
import { authenticate } from '../../middleware/auth';

export const inventarioRouter = Router();

inventarioRouter.get('/',  ctrl.list);
inventarioRouter.post('/',  ctrl.create);
inventarioRouter.get('/:id',  ctrl.getById);
inventarioRouter.put('/:id',  ctrl.update);
inventarioRouter.delete('/:id',  ctrl.remove);

// Reemplazo de la VIEW vw_ProductosConSustituto
inventarioRouter.get('/report/con-sustituto/all',  ctrl.viewConSustituto);

// Reemplazo del SP sp_BuscarProductoDisponible
inventarioRouter.get('/buscar-disponible',  ctrl.buscarProductoDisponible);

// Asignar ubicaciones en lote (A1..Z12)
inventarioRouter.post('/asignar-ubicaciones', ctrl.asignarUbicaciones);

// Bajo stock (stockActual <= stockMinimo)
inventarioRouter.get('/low-stock', ctrl.listLowStock);
