"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const database_controller_1 = require("./database.controller");
const databaseRouter = (0, express_1.Router)();
// Configurar multer para manejar archivos en memoria
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB máximo
    },
});
// Restaurar base de datos desde archivo .db
databaseRouter.post("/restore", upload.single("database"), database_controller_1.restaurarBaseDatos);
// Crear y descargar respaldo de la base de datos
databaseRouter.get("/backup", database_controller_1.crearRespaldo);
exports.default = databaseRouter;
