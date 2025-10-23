import { Router } from "express";
import * as ctrl from "./presupuestoExcel.controller";
import { authenticate } from "../../middleware/auth";

export const presupuestoRouter = Router();

// Generar Excel sin guardar en la base de datos
presupuestoRouter.post("/generar-excel", authenticate, ctrl.generarExcelPresupuesto);
