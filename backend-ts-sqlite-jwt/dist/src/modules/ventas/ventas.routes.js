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
exports.ventaRouter = void 0;
const express_1 = require("express");
const ctrl = __importStar(require("./ventas.controller"));
const auth_1 = require("../../middleware/auth");
exports.ventaRouter = (0, express_1.Router)();
// Routes refactor for clarity and consistency
exports.ventaRouter
    .route('/')
    .get(ctrl.list)
    .post(auth_1.authenticate, ctrl.create);
// Facturas de crédito no canceladas
exports.ventaRouter.get('/pendientes', auth_1.authenticate, ctrl.listPendientes);
// Historial de Proformas
exports.ventaRouter.get('/proformas', auth_1.authenticate, ctrl.listProformas);
exports.ventaRouter.get('/proformas/:id', auth_1.authenticate, ctrl.getProformaById);
exports.ventaRouter.get('/proformas/:id/excel', auth_1.authenticate, ctrl.generarProformaExcel);
exports.ventaRouter
    .route('/:id')
    .get(auth_1.authenticate, ctrl.getById);
// Marcar/actualizar cancelada (crédito pagado)
exports.ventaRouter.patch('/:id/cancelada', auth_1.authenticate, ctrl.updateCancelada);
// PDF Proforma endpoint
// - Keeps unauthenticated access to allow frontends without token if desired
// - Sets CORP header to avoid browser blocking cross-origin resource download
const setPdfHeaders = (_req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
};
const logPdfHit = (req, _res, next) => {
    try {
        console.info('[ventas] /proforma/pdf hit', {
            method: req.method,
            ua: req.headers['user-agent'],
            ip: req.headers['x-forwarded-for'] || req.ip,
        });
    }
    catch { }
    next();
};
exports.ventaRouter
    .route('/proforma/pdf')
    .post(setPdfHeaders, logPdfHit, ctrl.proforma)
    .get((_req, res) => res.status(405).json({ message: 'Use POST with JSON payload to generate Proforma PDF.' }));
