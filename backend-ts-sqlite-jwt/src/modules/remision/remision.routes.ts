import { Router } from "express";
import {
  crearRemision,
  listarRemisiones,
  obtenerRemision,
  remisionesPendientes,
  marcarRemisionFacturada,
  imprimirRemisionExcel,
  imprimirRemision
} from "./remision.controller";

import { authenticate } from "../../middleware/auth";

export const remisionRouter = Router();

/* ===========================
      RUTAS REMISIONES
=========================== */

// ✅ Crear remisión
remisionRouter.post("/",  crearRemision);

// ✅ Exportar historial completo a Excel
remisionRouter.get("/export/excel",  imprimirRemisionExcel);

// ✅ Exportar remisión individual Excel A4 para imprimir
remisionRouter.get("/print/excel/:id",  imprimirRemisionExcel);

// ✅ Imprimir remisión en HTML (por si la usas después)
remisionRouter.get("/print/:id",  imprimirRemision);

// ✅ Remisiones pendientes
remisionRouter.get("/pendientes",  remisionesPendientes);

// ✅ Listar todas remisiones
remisionRouter.get("/",  listarRemisiones);

// ✅ Obtener una remisión específica
remisionRouter.get("/:id",  obtenerRemision);

// ✅ Marcar una remisión como facturada
remisionRouter.put("/:id/facturar",  marcarRemisionFacturada);
