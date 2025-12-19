import { Router } from "express";
import * as ctrl from "./devolucion.controller";
import { authenticate } from "../../middleware/auth";

export const devolucionRouter = Router();

// Devolución de Venta
devolucionRouter.post("/venta", authenticate, ctrl.createDevolucionVenta);
devolucionRouter.get("/venta", authenticate, ctrl.listDevolucionesVenta);
devolucionRouter.get("/venta/:id/pdf", authenticate, ctrl.imprimirNotaCreditoVenta);
devolucionRouter.patch("/venta/:id/cobrar", authenticate, ctrl.cobrarDevolucionVenta);

// Devolución de Compra
devolucionRouter.post("/compra", authenticate, ctrl.createDevolucionCompra);
