"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clienteRouter = void 0;
const express_1 = require("express");
const cliente_controller_1 = require("./cliente.controller");
exports.clienteRouter = (0, express_1.Router)();
// Crear cliente
exports.clienteRouter.post("/", cliente_controller_1.createCliente);
// Listar clientes
exports.clienteRouter.get("/", cliente_controller_1.getClientes);
// Buscar clientes
exports.clienteRouter.get("/buscar", cliente_controller_1.searchClientes);
// Obtener cliente por ID
exports.clienteRouter.get("/:id", cliente_controller_1.getClienteById);
// Actualizar cliente
exports.clienteRouter.put("/:id", cliente_controller_1.updateCliente);
// Eliminar cliente
exports.clienteRouter.delete("/:id", cliente_controller_1.deleteCliente);
