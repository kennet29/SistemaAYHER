"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = exports.list = void 0;
const prisma_1 = require("../../db/prisma");
const node_fetch_1 = __importDefault(require("node-fetch"));
async function getTipoCambio() {
    try {
        const res = await (0, node_fetch_1.default)("http://localhost:4000/api/tipo-cambio/latest");
        if (!res.ok)
            throw new Error();
        const data = await res.json();
        return Number(data.tipoCambio?.valor ?? 36.62);
    }
    catch {
        console.warn("Tipo de cambio no disponible, usando 36.62");
        return 36.62;
    }
}
const list = async (_req, res) => {
    try {
        const movimientos = await prisma_1.prisma.movimientoInventario.findMany({
            include: { inventario: true, tipoMovimiento: true },
            orderBy: { id: "desc" },
        });
        res.json(movimientos);
    }
    catch (error) {
        console.error("Error al listar movimientos:", error);
        res.status(500).json({ message: "Error al listar movimientos", error });
    }
};
exports.list = list;
const create = async (req, res) => {
    try {
        const { tipoMovimientoId, observacion, usuario, detalles, tipoCambioValor: tcBody } = req.body;
        if (!tipoMovimientoId || !Array.isArray(detalles) || detalles.length === 0) {
            return res.status(400).json({ message: "Datos incompletos" });
        }
        const tipoCambioValor = tcBody ? Number(tcBody) : await getTipoCambio();
        const tipo = await prisma_1.prisma.tipoMovimiento.findUnique({ where: { id: tipoMovimientoId } });
        if (!tipo)
            return res.status(404).json({ message: "Tipo de movimiento no encontrado" });
        const movimientosCreados = [];
        for (const d of detalles) {
            const costoD = d.costoUnitarioDolar != null
                ? Number(d.costoUnitarioDolar)
                : d.costoUnitarioCordoba != null && tipoCambioValor
                    ? Number(d.costoUnitarioCordoba) / tipoCambioValor
                    : null;
            const costoC = d.costoUnitarioCordoba != null
                ? Number(d.costoUnitarioCordoba)
                : costoD != null && tipoCambioValor
                    ? Number(costoD) * tipoCambioValor
                    : null;
            const mov = await prisma_1.prisma.movimientoInventario.create({
                data: {
                    inventarioId: d.inventarioId,
                    tipoMovimientoId,
                    cantidad: d.cantidad,
                    observacion,
                    usuario,
                    tipoCambioValor,
                    costoUnitarioDolar: costoD,
                    costoUnitarioCordoba: costoC,
                },
                include: { inventario: true, tipoMovimiento: true },
            });
            movimientosCreados.push(mov);
            if (tipo.afectaStock) {
                await prisma_1.prisma.inventario.update({
                    where: { id: d.inventarioId },
                    data: {
                        stockActual: {
                            [tipo.esEntrada ? "increment" : "decrement"]: d.cantidad,
                        },
                    },
                });
            }
        }
        res.status(201).json({ message: "Movimiento registrado", movimientosCreados });
    }
    catch (error) {
        console.error("Error al crear movimiento:", error);
        res.status(500).json({ message: "Error al crear movimiento", error });
    }
};
exports.create = create;
