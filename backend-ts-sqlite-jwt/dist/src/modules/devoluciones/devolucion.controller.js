"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDevolucionVenta = createDevolucionVenta;
exports.createDevolucionCompra = createDevolucionCompra;
const prisma_1 = require("../../db/prisma");
const zod_1 = require("zod");
const stock_service_1 = require("../services/stock.service");
const DevVentaSchema = zod_1.z.object({
    ventaId: zod_1.z.number().int().positive(),
    cliente: zod_1.z.string().optional(),
    motivo: zod_1.z.string().optional(),
    usuario: zod_1.z.string().optional(),
    detalles: zod_1.z.array(zod_1.z.object({
        inventarioId: zod_1.z.number().int().positive(),
        cantidad: zod_1.z.number().int().positive(),
        precioUnitarioCordoba: zod_1.z.number().nonnegative()
    })).min(1)
});
const DevCompraSchema = zod_1.z.object({
    compraId: zod_1.z.number().int().positive(),
    proveedor: zod_1.z.string().optional(),
    motivo: zod_1.z.string().optional(),
    usuario: zod_1.z.string().optional(),
    detalles: zod_1.z.array(zod_1.z.object({
        inventarioId: zod_1.z.number().int().positive(),
        cantidad: zod_1.z.number().int().positive(),
        costoUnitarioCordoba: zod_1.z.number().nonnegative()
    })).min(1)
});
// Devolución de Venta => ENTRA al inventario
async function createDevolucionVenta(req, res) {
    const parsed = DevVentaSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json(parsed.error.format());
    const data = parsed.data;
    const result = await prisma_1.prisma.$transaction(async (tx) => {
        const tc = 36.5;
        const dev = await tx.devolucionVenta.create({
            data: {
                ventaId: data.ventaId,
                cliente: data.cliente,
                motivo: data.motivo,
                usuario: data.usuario
            }
        });
        for (const d of data.detalles) {
            await tx.detalleDevolucionVenta.create({
                data: {
                    devolucionVentaId: dev.id,
                    inventarioId: d.inventarioId,
                    cantidad: d.cantidad,
                    precioUnitarioCordoba: d.precioUnitarioCordoba,
                    precioUnitarioDolar: (Number(d.precioUnitarioCordoba) / tc),
                }
            });
            await (0, stock_service_1.crearMovimientoYAjustarStock)({
                tx,
                inventarioId: d.inventarioId,
                tipoMovimientoNombre: 'Devolución de Cliente',
                cantidad: d.cantidad,
                precioVentaUnitarioCordoba: d.precioUnitarioCordoba,
                usuario: data.usuario,
                observacion: 'Devolución cliente'
            });
        }
        return dev;
    });
    res.status(201).json({ devolucionVenta: result });
}
// Devolución de Compra => SALE del inventario
async function createDevolucionCompra(req, res) {
    const parsed = DevCompraSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json(parsed.error.format());
    const data = parsed.data;
    const result = await prisma_1.prisma.$transaction(async (tx) => {
        const tc = 36.5;
        const dev = await tx.devolucionCompra.create({
            data: {
                compraId: data.compraId,
                proveedor: data.proveedor,
                motivo: data.motivo,
                usuario: data.usuario
            }
        });
        for (const d of data.detalles) {
            await tx.detalleDevolucionCompra.create({
                data: {
                    devolucionCompraId: dev.id,
                    inventarioId: d.inventarioId,
                    cantidad: d.cantidad,
                    costoUnitarioCordoba: d.costoUnitarioCordoba,
                    costoUnitarioDolar: (Number(d.costoUnitarioCordoba) / tc),
                }
            });
            await (0, stock_service_1.crearMovimientoYAjustarStock)({
                tx,
                inventarioId: d.inventarioId,
                tipoMovimientoNombre: 'Devolución a Proveedor',
                cantidad: d.cantidad,
                precioVentaUnitarioCordoba: d.costoUnitarioCordoba,
                usuario: data.usuario,
                observacion: 'Devolución proveedor'
            });
        }
        return dev;
    });
    res.status(201).json({ devolucionCompra: result });
}
