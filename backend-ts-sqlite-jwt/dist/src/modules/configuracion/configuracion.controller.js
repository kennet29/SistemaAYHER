"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actualizarUltimoNumeroFactura = exports.getSiguienteNumeroFactura = exports.deleteConfiguracion = exports.upsertConfiguracion = exports.getConfiguracion = void 0;
const prisma_1 = require("../../db/prisma");
/**
 * 📌 Obtener la configuración actual
 * Solo hay un registro en la tabla Configuracion
 */
const getConfiguracion = async (req, res) => {
    try {
        const config = await prisma_1.prisma.configuracion.findFirst();
        if (!config) {
            return res.status(404).json({ message: 'No hay configuración registrada' });
        }
        res.json(config);
    }
    catch (error) {
        console.error('Error al obtener configuración:', error);
        res.status(500).json({ message: 'Error al obtener configuración', error });
    }
};
exports.getConfiguracion = getConfiguracion;
/**
 * 📌 Crear o actualizar configuración
 * Si no existe, la crea; si ya existe, la actualiza.
 */
const upsertConfiguracion = async (req, res) => {
    try {
        const data = req.body;
        // 🔹 Eliminar campos no válidos (por si vienen del frontend)
        delete data.message;
        // 🔹 Verificar si ya existe una configuración
        const existente = await prisma_1.prisma.configuracion.findFirst();
        let config;
        if (existente) {
            // ✅ Si ya existe, la actualiza
            config = await prisma_1.prisma.configuracion.update({
                where: { id: existente.id },
                data,
            });
        }
        else {
            // ✅ Si no existe, crea una nueva (sin incluir "message")
            config = await prisma_1.prisma.configuracion.create({
                data: {
                    ruc: data.ruc || "12345",
                    razonSocial: data.razonSocial || "AYHER",
                    direccion: data.direccion || "Dirección de prueba",
                    telefono1: data.telefono1 || "555555",
                    telefono2: data.telefono2 || "5555555",
                    correo: data.correo || "testeo@gmail.com",
                    sitioWeb: data.sitioWeb || "ayher.com",
                    logoUrl: data.logoUrl || null,
                    mensajeFactura: data.mensajeFactura || "Mensaje de prueba",
                },
            });
        }
        res.json(config);
    }
    catch (error) {
        console.error("Error al guardar configuración:", error);
        res.status(500).json({ message: "Error al guardar configuración", error });
    }
};
exports.upsertConfiguracion = upsertConfiguracion;
/**
 * 📌 Eliminar configuración (opcional)
 * No siempre se usa, pero se deja disponible por si se requiere resetear.
 */
const deleteConfiguracion = async (req, res) => {
    try {
        const existente = await prisma_1.prisma.configuracion.findFirst();
        if (!existente) {
            return res.status(404).json({ message: 'No hay configuración para eliminar' });
        }
        await prisma_1.prisma.configuracion.delete({ where: { id: existente.id } });
        res.json({ message: 'Configuración eliminada correctamente' });
    }
    catch (error) {
        console.error('Error al eliminar configuración:', error);
        res.status(500).json({ message: 'Error al eliminar configuración', error });
    }
};
exports.deleteConfiguracion = deleteConfiguracion;
/**
 * 📌 Obtener el siguiente número de factura disponible
 */
const getSiguienteNumeroFactura = async (req, res) => {
    try {
        const config = await prisma_1.prisma.configuracion.findFirst();
        if (!config) {
            return res.status(404).json({ message: 'No hay configuración registrada' });
        }
        const siguienteNumero = (config.ultimoNumeroFactura || 0) + 1;
        res.json({ siguienteNumero, ultimoNumero: config.ultimoNumeroFactura });
    }
    catch (error) {
        console.error('Error al obtener siguiente número de factura:', error);
        res.status(500).json({ message: 'Error al obtener siguiente número de factura', error });
    }
};
exports.getSiguienteNumeroFactura = getSiguienteNumeroFactura;
/**
 * 📌 Actualizar el último número de factura usado
 */
const actualizarUltimoNumeroFactura = async (req, res) => {
    try {
        const { ultimoNumero } = req.body;
        if (!ultimoNumero || isNaN(ultimoNumero)) {
            return res.status(400).json({ message: 'Número de factura inválido' });
        }
        const config = await prisma_1.prisma.configuracion.findFirst();
        if (!config) {
            return res.status(404).json({ message: 'No hay configuración registrada' });
        }
        const updated = await prisma_1.prisma.configuracion.update({
            where: { id: config.id },
            data: { ultimoNumeroFactura: parseInt(ultimoNumero) },
        });
        res.json({ ultimoNumeroFactura: updated.ultimoNumeroFactura });
    }
    catch (error) {
        console.error('Error al actualizar último número de factura:', error);
        res.status(500).json({ message: 'Error al actualizar último número de factura', error });
    }
};
exports.actualizarUltimoNumeroFactura = actualizarUltimoNumeroFactura;
