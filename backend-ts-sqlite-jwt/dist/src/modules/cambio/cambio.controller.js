"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.getById = getById;
exports.create = create;
const prisma_1 = require("../../db/prisma");
const zod_1 = require("zod");
const stock_service_1 = require("../services/stock.service");
const DetalleSchema = zod_1.z.object({
    inventarioSalidaId: zod_1.z.number().int().positive(),
    inventarioEntradaId: zod_1.z.number().int().positive(),
    cantidadSalida: zod_1.z.number().int().positive(),
    cantidadEntrada: zod_1.z.number().int().positive(),
    precioUnitarioCordoba: zod_1.z.number().nonnegative()
});
const CambioSchema = zod_1.z.object({
    cliente: zod_1.z.string().optional(),
    motivo: zod_1.z.string().optional(),
    usuario: zod_1.z.string().optional(),
    observacion: zod_1.z.string().optional(),
    detalles: zod_1.z.array(DetalleSchema).min(1)
});
async function list(_req, res) {
    const cambios = await prisma_1.prisma.cambio.findMany({
        include: { detalles: true },
        orderBy: { id: 'desc' }
    });
    res.json({ cambios });
}
async function getById(req, res) {
    const id = Number(req.params.id);
    const cambio = await prisma_1.prisma.cambio.findUnique({
        where: { id },
        include: { detalles: true }
    });
    if (!cambio)
        return res.status(404).json({ message: 'No encontrado' });
    res.json({ cambio });
}
async function create(req, res) {
    const parsed = CambioSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json(parsed.error.format());
    const data = parsed.data;
    const result = await prisma_1.prisma.$transaction(async (tx) => {
        const tipoCambio = 36.5; // fallback simple; si necesitas, trae desde API de tipo cambio
        const cambio = await tx.cambio.create({
            data: {
                cliente: data.cliente,
                motivo: data.motivo,
                usuario: data.usuario,
                observacion: data.observacion
            }
        });
        for (const d of data.detalles) {
            await tx.detalleCambio.create({
                data: {
                    cambioId: cambio.id,
                    inventarioSalidaId: d.inventarioSalidaId,
                    inventarioEntradaId: d.inventarioEntradaId,
                    cantidadSalida: d.cantidadSalida,
                    cantidadEntrada: d.cantidadEntrada,
                    precioUnitarioCordoba: d.precioUnitarioCordoba,
                    precioUnitarioDolar: (Number(d.precioUnitarioCordoba) / tipoCambio),
                }
            });
            // Salida
            await (0, stock_service_1.crearMovimientoYAjustarStock)({
                tx,
                inventarioId: d.inventarioSalidaId,
                tipoMovimientoNombre: 'Cambio Salida',
                cantidad: d.cantidadSalida,
                precioVentaUnitarioCordoba: d.precioUnitarioCordoba,
                usuario: data.usuario,
                observacion: 'Cambio salida'
            });
            // Entrada
            await (0, stock_service_1.crearMovimientoYAjustarStock)({
                tx,
                inventarioId: d.inventarioEntradaId,
                tipoMovimientoNombre: 'Cambio Entrada',
                cantidad: d.cantidadEntrada,
                precioVentaUnitarioCordoba: d.precioUnitarioCordoba,
                usuario: data.usuario,
                observacion: 'Cambio entrada'
            });
        }
        return cambio;
    });
    res.status(201).json({ cambio: result });
}
