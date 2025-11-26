"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listarRecientes = void 0;
const prisma_1 = require("../../db/prisma");
const parseIds = (value) => {
    if (!value)
        return [];
    const items = Array.isArray(value) ? value : String(value).split(",");
    return items
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n) && n > 0);
};
const listarRecientes = async (req, res) => {
    try {
        const inventarioIds = parseIds(req.query.inventarioIds);
        const clienteId = Number.isFinite(Number(req.query.clienteId)) ? Number(req.query.clienteId) : null;
        const desde = new Date();
        desde.setDate(desde.getDate() - 14);
        const where = {
            fecha: { gte: desde },
        };
        if (inventarioIds.length) {
            where.inventarioId = { in: inventarioIds };
        }
        if (clienteId) {
            where.clienteId = clienteId;
        }
        const recientes = await prisma_1.prisma.productoCotizado.findMany({
            where,
            orderBy: { fecha: "desc" },
            include: {
                inventario: {
                    select: {
                        id: true,
                        nombre: true,
                        numeroParte: true,
                    },
                },
                cliente: {
                    select: {
                        id: true,
                        nombre: true,
                        empresa: true,
                        razonSocial: true,
                    },
                },
            },
        });
        res.json({ recientes });
    }
    catch (error) {
        console.error("Error consultando cotizaciones recientes:", error);
        res.status(500).json({ message: "Error al consultar cotizaciones recientes" });
    }
};
exports.listarRecientes = listarRecientes;
