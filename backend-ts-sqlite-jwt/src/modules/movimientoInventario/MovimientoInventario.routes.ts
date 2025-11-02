import { Router } from "express";
import * as ctrl from "./MovimientoInventario.controller";
import { authenticate } from "../../middleware/auth";

export const movimientoInventarioRouter = Router();

// 📋 Listar todos los movimientos
movimientoInventarioRouter.get("/", authenticate, ctrl.list);

// ➕ Registrar nuevo movimiento
movimientoInventarioRouter.post("/", authenticate, ctrl.create);
