import { Router } from "express";
import * as ctrl from "./metodosPago.controller";

export const metodosPagoRouter = Router();

metodosPagoRouter.get("/", ctrl.list);
metodosPagoRouter.post("/", ctrl.create);
metodosPagoRouter.put("/:id", ctrl.update);
metodosPagoRouter.delete("/:id", ctrl.remove);
