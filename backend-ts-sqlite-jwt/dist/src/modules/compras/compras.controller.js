"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.getById = getById;
exports.create = create;
const prisma_1 = require("../../db/prisma");
const zod_1 = require("zod");
const stock_service_1 = require("../services/stock.service");
const DetalleSchema = zod_1.z.object({
    inventarioId: zod_1.z.number().int().positive(),
    cantidad: zod_1.z.number().int().positive(),
    costoUnitarioCordoba: zod_1.z.number().nonnegative()
});
const CompraSchema = zod_1.z.object({
    fecha: zod_1.z.string().optional(),
    proveedor: zod_1.z.string().min(1),
    numeroFactura: zod_1.z.string().optional(),
    tipoCambioValor: zod_1.z.number().optional(),
    usuario: zod_1.z.string().optional(),
    observacion: zod_1.z.string().optional(),
    detalles: zod_1.z.array(DetalleSchema).min(1)
});
async function list(_req, res) {
    const compras = await prisma_1.prisma.compra.findMany({
        include: { detalles: true },
        orderBy: { id: 'desc' }
    });
    res.json({ compras });
}
async function getById(req, res) {
    const id = Number(req.params.id);
    const compra = await prisma_1.prisma.compra.findUnique({
        where: { id },
        include: { detalles: true }
    });
    if (!compra)
        return res.status(404).json({ message: 'No encontrada' });
    res.json({ compra });
}
async function create(req, res) {
    const parsed = CompraSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json(parsed.error.format());
    const data = parsed.data;
    const result = await prisma_1.prisma.$transaction(async (tx) => {
        const tc = Number(data.tipoCambioValor ?? 36.5);
        const compra = await tx.compra.create({
            data: {
                proveedor: data.proveedor,
                numeroFactura: data.numeroFactura,
                tipoCambioValor: (data.tipoCambioValor ?? 36.5),
                usuario: data.usuario,
                observacion: data.observacion
            }
        });
        // Insertar detalles y movimientos
        let total = 0;
        for (const d of data.detalles) {
            await tx.detalleCompra.create({
                data: {
                    compraId: compra.id,
                    inventarioId: d.inventarioId,
                    cantidad: d.cantidad,
                    costoUnitarioCordoba: d.costoUnitarioCordoba,
                    costoUnitarioDolar: (Number(d.costoUnitarioCordoba) / tc),
                }
            });
            total += d.cantidad * d.costoUnitarioCordoba;
            // Movimiento: ENTRADA
            await (0, stock_service_1.crearMovimientoYAjustarStock)({
                tx,
                inventarioId: d.inventarioId,
                tipoMovimientoNombre: 'Entrada',
                cantidad: d.cantidad,
                precioVentaUnitarioCordoba: d.costoUnitarioCordoba,
                tipoCambioValor: tc,
                usuario: data.usuario,
                observacion: `Compra N° ${data.numeroFactura ?? ''}`
            });
        }
        const compraActualizada = await tx.compra.update({
            where: { id: compra.id },
            data: { totalCordoba: total }
        });
        return compraActualizada;
    });
    res.status(201).json({ compra: result });
}
