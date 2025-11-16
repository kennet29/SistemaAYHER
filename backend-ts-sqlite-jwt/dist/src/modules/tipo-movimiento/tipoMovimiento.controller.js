"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.update = exports.get = exports.list = exports.create = void 0;
const prisma_1 = require("../../db/prisma");
/**
 * 📌 Crear un nuevo tipo de movimiento
 */
const create = async (req, res) => {
    try {
        const data = req.body;
        const tipo = await prisma_1.prisma.tipoMovimiento.create({ data });
        res.json(tipo);
    }
    catch (error) {
        console.error('Error al crear tipo de movimiento:', error);
        res.status(500).json({ message: 'Error al crear tipo de movimiento', error });
    }
};
exports.create = create;
/**
 * 📌 Listar todos los tipos de movimiento
 */
const list = async (req, res) => {
    try {
        const tipos = await prisma_1.prisma.tipoMovimiento.findMany({
            orderBy: { id: 'asc' },
        });
        res.json(tipos);
    }
    catch (error) {
        console.error('Error al listar tipos de movimiento:', error);
        res.status(500).json({ message: 'Error al listar tipos de movimiento', error });
    }
};
exports.list = list;
/**
 * 📌 Obtener un tipo de movimiento por ID
 */
const get = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const tipo = await prisma_1.prisma.tipoMovimiento.findUnique({ where: { id } });
        if (!tipo) {
            return res.status(404).json({ message: 'Tipo de movimiento no encontrado' });
        }
        res.json(tipo);
    }
    catch (error) {
        console.error('Error al obtener tipo de movimiento:', error);
        res.status(500).json({ message: 'Error al obtener tipo de movimiento', error });
    }
};
exports.get = get;
/**
 * 📌 Actualizar tipo de movimiento
 */
const update = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const data = req.body;
        const tipo = await prisma_1.prisma.tipoMovimiento.update({
            where: { id },
            data,
        });
        res.json(tipo);
    }
    catch (error) {
        console.error('Error al actualizar tipo de movimiento:', error);
        res.status(500).json({ message: 'Error al actualizar tipo de movimiento', error });
    }
};
exports.update = update;
/**
 * 📌 Eliminar tipo de movimiento
 */
const remove = async (req, res) => {
    try {
        const id = Number(req.params.id);
        await prisma_1.prisma.tipoMovimiento.delete({ where: { id } });
        res.json({ message: 'Tipo de movimiento eliminado correctamente' });
    }
    catch (error) {
        console.error('Error al eliminar tipo de movimiento:', error);
        res.status(500).json({ message: 'Error al eliminar tipo de movimiento', error });
    }
};
exports.remove = remove;
