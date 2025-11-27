"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.create = create;
exports.update = update;
exports.remove = remove;
const prisma_1 = require("../../db/prisma");
// Listar todos los métodos de pago
async function list(_req, res) {
    try {
        const metodos = await prisma_1.prisma.metodoPago.findMany({
            orderBy: [{ activo: "desc" }, { nombre: "asc" }],
        });
        res.json({ metodos });
    }
    catch (error) {
        console.error("Error al listar métodos de pago:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
}
// Crear método de pago
async function create(req, res) {
    try {
        const { nombre, tipoCuenta, banco, numeroCuenta, titular, moneda, activo, observaciones } = req.body;
        if (!nombre || !tipoCuenta) {
            return res.status(400).json({ message: "Nombre y tipo de cuenta son requeridos" });
        }
        const metodo = await prisma_1.prisma.metodoPago.create({
            data: {
                nombre,
                tipoCuenta,
                banco,
                numeroCuenta,
                titular,
                moneda: moneda || "NIO",
                activo: activo !== undefined ? activo : true,
                observaciones,
            },
        });
        res.status(201).json({ metodo });
    }
    catch (error) {
        console.error("Error al crear método de pago:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
}
// Actualizar método de pago
async function update(req, res) {
    try {
        const id = Number(req.params.id);
        const { nombre, tipoCuenta, banco, numeroCuenta, titular, moneda, activo, observaciones } = req.body;
        const metodo = await prisma_1.prisma.metodoPago.update({
            where: { id },
            data: {
                nombre,
                tipoCuenta,
                banco,
                numeroCuenta,
                titular,
                moneda,
                activo,
                observaciones,
            },
        });
        res.json({ metodo });
    }
    catch (error) {
        console.error("Error al actualizar método de pago:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
}
// Eliminar método de pago
async function remove(req, res) {
    try {
        const id = Number(req.params.id);
        await prisma_1.prisma.metodoPago.delete({ where: { id } });
        res.json({ ok: true });
    }
    catch (error) {
        console.error("Error al eliminar método de pago:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
}
