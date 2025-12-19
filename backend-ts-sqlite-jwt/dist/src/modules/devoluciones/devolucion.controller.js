"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDevolucionVenta = createDevolucionVenta;
exports.createDevolucionCompra = createDevolucionCompra;
exports.listDevolucionesVenta = listDevolucionesVenta;
exports.cobrarDevolucionVenta = cobrarDevolucionVenta;
exports.imprimirNotaCreditoVenta = imprimirNotaCreditoVenta;
const prisma_1 = require("../../db/prisma");
const zod_1 = require("zod");
const stock_service_1 = require("../services/stock.service");
const devolucionPdf_1 = require("./services/devolucionPdf");
const DevVentaSchema = zod_1.z.object({
    ventaId: zod_1.z.number().int().positive(),
    cliente: zod_1.z.string().optional(),
    concepto: zod_1.z.string().optional(),
    observaciones: zod_1.z.string().optional(),
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
        const concepto = data.concepto || data.motivo || null;
        const observaciones = data.observaciones?.trim();
        const motivoFinal = observaciones ? `${concepto || ""}${concepto ? " | " : ""}Obs: ${observaciones}` : concepto;
        const dev = await tx.devolucionVenta.create({
            data: {
                ventaId: data.ventaId,
                cliente: data.cliente,
                motivo: motivoFinal || null,
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
async function listDevolucionesVenta(req, res) {
    const devoluciones = await prisma_1.prisma.devolucionVenta.findMany({
        include: {
            venta: {
                include: {
                    cliente: true,
                },
            },
            detalles: {
                include: {
                    inventario: {
                        include: {
                            marca: true,
                        },
                    },
                },
            },
        },
        orderBy: { id: 'desc' },
    });
    res.json({ devoluciones });
}
async function cobrarDevolucionVenta(req, res) {
    const id = Number(req.params.id);
    if (!id)
        return res.status(400).json({ message: 'ID invalido' });
    const { cobrada } = req.body;
    const nuevoEstado = Boolean(cobrada);
    const existente = await prisma_1.prisma.devolucionVenta.findUnique({ where: { id } });
    if (!existente)
        return res.status(404).json({ message: 'Devolucion no encontrada' });
    const dev = await prisma_1.prisma.devolucionVenta.update({
        where: { id },
        data: { cobrada: nuevoEstado },
    });
    res.json({ devolucionVenta: dev });
}
async function imprimirNotaCreditoVenta(req, res) {
    const id = Number(req.params.id);
    if (!id)
        return res.status(400).json({ message: 'ID inválido' });
    const devolucion = await prisma_1.prisma.devolucionVenta.findUnique({
        where: { id },
        include: {
            venta: {
                include: {
                    cliente: true,
                },
            },
            detalles: {
                include: {
                    inventario: {
                        include: { marca: true },
                    },
                },
            },
        },
    });
    if (!devolucion)
        return res.status(404).json({ message: 'Devolución no encontrada' });
    const config = await prisma_1.prisma.configuracion.findFirst().catch(() => null);
    (0, devolucionPdf_1.generarNotaCreditoVentaPDF)(res, {
        config,
        // Prisma devuelve Decimals en algunos campos; los convertimos a any para el generador de PDF.
        devolucion: devolucion,
        detalles: devolucion.detalles || [],
    });
}
