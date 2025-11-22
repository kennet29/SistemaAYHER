"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cotizacionRouter = void 0;
const express_1 = require("express");
const cotizacion_controller_1 = require("./cotizacion.controller");
exports.cotizacionRouter = (0, express_1.Router)();
exports.cotizacionRouter.get("/recientes", cotizacion_controller_1.listarRecientes);
