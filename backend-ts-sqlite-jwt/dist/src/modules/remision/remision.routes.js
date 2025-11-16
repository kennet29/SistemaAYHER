"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remisionRouter = void 0;
const express_1 = require("express");
const remision_controller_1 = require("./remision.controller");
exports.remisionRouter = (0, express_1.Router)();
/* ===========================
      RUTAS REMISIONES
=========================== */
// ✅ Crear remisión
exports.remisionRouter.post("/", remision_controller_1.crearRemision);
// ✅ Exportar historial completo a Excel
exports.remisionRouter.get("/export/excel", remision_controller_1.imprimirRemisionExcel);
// ✅ Exportar remisión individual Excel A4 para imprimir
exports.remisionRouter.get("/print/excel/:id", remision_controller_1.imprimirRemisionExcel);
exports.remisionRouter.get("/print/pdf/:id", remision_controller_1.imprimirRemisionPDF);
// ✅ Imprimir remisión en HTML (por si la usas después)
exports.remisionRouter.get("/print/:id", remision_controller_1.imprimirRemision);
// ✅ Remisiones pendientes
exports.remisionRouter.get("/pendientes", remision_controller_1.remisionesPendientes);
// ✅ Listar todas remisiones
exports.remisionRouter.get("/", remision_controller_1.listarRemisiones);
// ✅ Obtener una remisión específica
exports.remisionRouter.get("/:id", remision_controller_1.obtenerRemision);
// ✅ Marcar una remisión como facturada
exports.remisionRouter.put("/:id/facturar", remision_controller_1.marcarRemisionFacturada);
