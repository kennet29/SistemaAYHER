import { Router } from "express";
import { listarRecientes } from "./cotizacion.controller";

export const cotizacionRouter = Router();

cotizacionRouter.get("/recientes", listarRecientes);
