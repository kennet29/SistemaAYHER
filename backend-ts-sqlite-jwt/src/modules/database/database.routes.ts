import { Router } from "express";
import multer from "multer";
import { restaurarBaseDatos, crearRespaldo } from "./database.controller";

const databaseRouter = Router();

// Configurar multer para manejar archivos en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB máximo
  },
});

// Restaurar base de datos desde archivo .db
databaseRouter.post("/restore", upload.single("database"), restaurarBaseDatos);

// Crear y descargar respaldo de la base de datos
databaseRouter.get("/backup", crearRespaldo);

export default databaseRouter;
