"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.getLatest = getLatest;
exports.create = create;
const prisma_1 = require("../../db/prisma");
const zod_1 = require("zod");
// ✅ Validación con Zod (convierte string numérico a número automáticamente)
const TipoCambioSchema = zod_1.z.object({
    fecha: zod_1.z.string().optional(),
    valor: zod_1.z.preprocess((val) => Number(val), zod_1.z.number().positive()),
});
// 📋 Listar últimos 50 registros
async function list(_req, res) {
    try {
        const tipos = await prisma_1.prisma.tipoCambio.findMany({
            orderBy: { fecha: 'desc' },
            take: 50,
        });
        // ✅ Asegurar que valor sea numérico
        const tiposConvertidos = tipos.map((t) => ({
            ...t,
            valor: Number(t.valor),
        }));
        res.json({ tipos: tiposConvertidos });
    }
    catch (error) {
        console.error('Error al listar tipos de cambio:', error);
        res.status(500).json({ message: 'Error al obtener los tipos de cambio.' });
    }
}
// 🔍 Obtener el último tipo de cambio registrado
async function getLatest(_req, res) {
    try {
        const ultimo = await prisma_1.prisma.tipoCambio.findFirst({
            orderBy: { fecha: 'desc' },
        });
        if (!ultimo) {
            return res.status(404).json({ message: 'No hay registros de tipo de cambio' });
        }
        // ✅ Convertir a número antes de enviar
        res.json({ tipoCambio: { ...ultimo, valor: Number(ultimo.valor) } });
    }
    catch (error) {
        console.error('Error al obtener último tipo de cambio:', error);
        res.status(500).json({ message: 'Error al obtener el último tipo de cambio.' });
    }
}
// ➕ Crear un nuevo registro de tipo de cambio
async function create(req, res) {
    try {
        const parsed = TipoCambioSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json(parsed.error.format());
        }
        const data = parsed.data;
        const fecha = data.fecha ? new Date(data.fecha) : new Date();
        // 🕒 Verificar si ya existe uno registrado en el mismo día
        const inicioDia = new Date(fecha);
        inicioDia.setHours(0, 0, 0, 0);
        const finDia = new Date(fecha);
        finDia.setHours(23, 59, 59, 999);
        const existe = await prisma_1.prisma.tipoCambio.findFirst({
            where: {
                fecha: {
                    gte: inicioDia,
                    lte: finDia,
                },
            },
        });
        if (existe) {
            return res.status(409).json({
                message: 'Ya existe un tipo de cambio registrado para hoy.',
                tipoCambio: { ...existe, valor: Number(existe.valor) },
            });
        }
        // 💾 Crear nuevo registro
        const nuevo = await prisma_1.prisma.tipoCambio.create({
            data: {
                fecha,
                valor: Number(data.valor),
            },
        });
        res.status(201).json({ tipoCambio: { ...nuevo, valor: Number(nuevo.valor) } });
    }
    catch (error) {
        console.error('Error al crear tipo de cambio:', error);
        res.status(500).json({ message: 'Error al registrar el tipo de cambio.' });
    }
}
