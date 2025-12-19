import { Router } from "express";
import * as ctrl from "./MovimientoInventario.controller";
import { authenticate } from "../../middleware/auth";

export const movimientoInventarioRouter = Router();

// 📋 Listar todos los movimientos
movimientoInventarioRouter.get("/",  ctrl.list);

// ➕ Registrar nuevo movimiento
movimientoInventarioRouter.post("/",  ctrl.create);
movimientoInventarioRouter.patch("/:id", authenticate, ctrl.update);
movimientoInventarioRouter.delete("/:id", authenticate, ctrl.remove);
