import { Router } from "express";
import {
  createCliente,
  getClientes,
  getClienteById,
  searchClientes,
  updateCliente,
  deleteCliente,
} from "./cliente.controller";


export const clienteRouter = Router();

// Crear cliente
clienteRouter.post("/",  createCliente);

// Listar clientes
clienteRouter.get("/",  getClientes);

// Buscar clientes
clienteRouter.get("/buscar",  searchClientes);

// Obtener cliente por ID
clienteRouter.get("/:id",  getClienteById);

// Actualizar cliente
clienteRouter.put("/:id",  updateCliente);

// Eliminar cliente
clienteRouter.delete("/:id",  deleteCliente);
