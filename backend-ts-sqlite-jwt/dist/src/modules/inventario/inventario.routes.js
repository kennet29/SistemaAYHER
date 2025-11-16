"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventarioRouter = void 0;
const express_1 = require("express");
const ctrl = __importStar(require("./inventario.controller"));
exports.inventarioRouter = (0, express_1.Router)();
exports.inventarioRouter.get('/', ctrl.list);
exports.inventarioRouter.post('/', ctrl.create);
exports.inventarioRouter.get('/:id', ctrl.getById);
exports.inventarioRouter.put('/:id', ctrl.update);
exports.inventarioRouter.delete('/:id', ctrl.remove);
// Reemplazo de la VIEW vw_ProductosConSustituto
exports.inventarioRouter.get('/report/con-sustituto/all', ctrl.viewConSustituto);
// Reemplazo del SP sp_BuscarProductoDisponible
exports.inventarioRouter.get('/buscar-disponible', ctrl.buscarProductoDisponible);
// Asignar ubicaciones en lote (A1..Z12)
exports.inventarioRouter.post('/asignar-ubicaciones', ctrl.asignarUbicaciones);
// Bajo stock (stockActual <= stockMinimo)
exports.inventarioRouter.get('/low-stock', ctrl.listLowStock);
