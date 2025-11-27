"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.restaurarBaseDatos = restaurarBaseDatos;
exports.crearRespaldo = crearRespaldo;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma_1 = require("../../db/prisma");
const DB_PATH = path_1.default.join(process.cwd(), "prisma", "dev.db");
const BACKUP_DIR = path_1.default.join(process.cwd(), "respaldo");
// Crear directorio de respaldo si no existe
if (!fs_1.default.existsSync(BACKUP_DIR)) {
    fs_1.default.mkdirSync(BACKUP_DIR, { recursive: true });
}
async function restaurarBaseDatos(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No se proporcionó ningún archivo" });
        }
        // Validar que sea un archivo .db
        if (!req.file.originalname.endsWith(".db")) {
            return res.status(400).json({ message: "El archivo debe ser un archivo .db válido" });
        }
        // Crear respaldo de la base de datos actual antes de restaurar
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupPath = path_1.default.join(BACKUP_DIR, `backup_before_restore_${timestamp}.db`);
        if (fs_1.default.existsSync(DB_PATH)) {
            fs_1.default.copyFileSync(DB_PATH, backupPath);
            console.log(`✅ Respaldo creado en: ${backupPath}`);
        }
        // Desconectar Prisma antes de reemplazar el archivo
        await prisma_1.prisma.$disconnect();
        // Reemplazar la base de datos actual con el archivo subido
        fs_1.default.writeFileSync(DB_PATH, req.file.buffer);
        console.log(`✅ Base de datos restaurada desde: ${req.file.originalname}`);
        // Reconectar Prisma
        await prisma_1.prisma.$connect();
        res.json({
            message: "Base de datos restaurada exitosamente",
            backup: backupPath,
            restored: req.file.originalname,
        });
    }
    catch (error) {
        console.error("❌ Error al restaurar base de datos:", error);
        // Intentar reconectar Prisma en caso de error
        try {
            await prisma_1.prisma.$connect();
        }
        catch (reconnectError) {
            console.error("❌ Error al reconectar Prisma:", reconnectError);
        }
        res.status(500).json({
            message: "Error al restaurar la base de datos",
            error: error instanceof Error ? error.message : "Error desconocido",
        });
    }
}
async function crearRespaldo(req, res) {
    try {
        if (!fs_1.default.existsSync(DB_PATH)) {
            return res.status(404).json({ message: "Base de datos no encontrada" });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupFileName = `backup_${timestamp}.db`;
        const backupPath = path_1.default.join(BACKUP_DIR, backupFileName);
        fs_1.default.copyFileSync(DB_PATH, backupPath);
        // Enviar el archivo como descarga
        res.download(backupPath, backupFileName, (err) => {
            if (err) {
                console.error("❌ Error al descargar respaldo:", err);
                res.status(500).json({ message: "Error al descargar el respaldo" });
            }
        });
    }
    catch (error) {
        console.error("❌ Error al crear respaldo:", error);
        res.status(500).json({
            message: "Error al crear respaldo",
            error: error instanceof Error ? error.message : "Error desconocido",
        });
    }
}
