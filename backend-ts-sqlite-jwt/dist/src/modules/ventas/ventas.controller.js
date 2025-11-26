"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.getById = getById;
exports.create = create;
exports.proforma = proforma;
exports.listPendientes = listPendientes;
exports.listProformas = listProformas;
exports.getProformaById = getProformaById;
exports.updateCancelada = updateCancelada;
exports.generarProformaExcel = generarProformaExcel;
const prisma_1 = require("../../db/prisma");
const zod_1 = require("zod");
const stock_service_1 = require("../services/stock.service");
const proforma_services_1 = require("./services/proforma.services");
const exceljs_1 = __importDefault(require("exceljs"));
const fs_1 = __importDefault(require("fs"));
const logo_1 = require("../../utils/logo");
const round4 = (n) => Number((n ?? 0).toFixed(4));
/* ===== Zod ===== */
const DetalleSchema = zod_1.z.object({
    inventarioId: zod_1.z.number().int().positive(),
    cantidad: zod_1.z.number().int().positive(),
    precioUnitarioCordoba: zod_1.z.number().nonnegative(),
    remisionDetalleId: zod_1.z.number().int().nullable().optional(),
});
const VentaSchema = zod_1.z.object({
    fecha: zod_1.z.coerce.date().optional(),
    clienteId: zod_1.z.number().nullable().optional(),
    numeroFactura: zod_1.z.string().optional(),
    tipoPago: zod_1.z.enum(["CONTADO", "CREDITO"]).default("CONTADO"),
    plazoDias: zod_1.z.number().nullable().optional(),
    usuario: zod_1.z.string().nullable().optional(),
    observacion: zod_1.z.string().nullable().optional(),
    pio: zod_1.z.string().nullable().optional(),
    tipoCambioValor: zod_1.z.number().nullable().optional(),
    detalles: zod_1.z.array(DetalleSchema).min(1),
});
/* ===== Listar ===== */
async function list(_req, res) {
    const ventas = await prisma_1.prisma.venta.findMany({
        include: { detalles: { include: { inventario: true, remisionDetalle: true } }, cliente: true },
        orderBy: { id: "desc" },
    });
    res.json({ ventas });
}
/* ===== Obtener ===== */
async function getById(req, res) {
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
        return res.status(400).json({ message: "ID inválido" });
    const venta = await prisma_1.prisma.venta.findUnique({
        where: { id },
        include: { detalles: { include: { inventario: true, remisionDetalle: true } }, cliente: true },
    });
    if (!venta)
        return res.status(404).json({ message: "No encontrada" });
    res.json({ venta });
}
/* ===== Crear Venta ===== */
async function create(req, res) {
    const parsed = VentaSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json(parsed.error.format());
    const data = parsed.data;
    const pioValue = data.pio && typeof data.pio === "string" && data.pio.trim().length > 0 ? data.pio.trim() : null;
    const tipoCambio = Number(data.tipoCambioValor ?? 36.5);
    const baseFecha = data.fecha ? new Date(data.fecha) : new Date();
    if (!(tipoCambio > 0))
        return res.status(400).json({ message: "tipoCambioValor inválido" });
    try {
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            let fechaVencimiento = null;
            if (data.tipoPago === "CREDITO" && data.plazoDias) {
                fechaVencimiento = new Date(baseFecha);
                fechaVencimiento.setDate(fechaVencimiento.getDate() + data.plazoDias);
            }
            // Generar consecutivo de factura si no viene especificado
            const genNextNumero = (prev) => {
                const digits = String(prev || "").replace(/\D+/g, "");
                const n = Number(digits || 0) + 1;
                return `F${String(n).padStart(6, "0")}`;
            };
            let numeroFacturaFinal = (data.numeroFactura || "").trim() || null;
            if (!numeroFacturaFinal) {
                const last = await tx.venta.findFirst({ orderBy: { id: "desc" }, select: { numeroFactura: true } });
                numeroFacturaFinal = genNextNumero(last?.numeroFactura || null);
            }
            const ventaData = {
                fecha: baseFecha,
                clienteId: data.clienteId ?? null,
                numeroFactura: numeroFacturaFinal,
                tipoPago: data.tipoPago,
                plazoDias: data.plazoDias ?? null,
                fechaVencimiento,
                estadoPago: data.tipoPago === "CONTADO" ? "PAGADO" : "PENDIENTE",
                cancelada: data.tipoPago === "CONTADO" ? true : false,
                tipoCambioValor: tipoCambio,
                usuario: data.usuario ?? null,
                observacion: (() => {
                    const base = (data.observacion || "").trim();
                    const nota = `Consecutivo: ${numeroFacturaFinal}`;
                    return base ? `${base} | ${nota}` : nota;
                })(),
                pio: pioValue,
            };
            let venta = null;
            try {
                venta = await tx.venta.create({ data: ventaData });
            }
            catch (e) {
                const msg = String(e?.message || "");
                if (msg.includes("Unknown argument `cancelada`")) {
                    const fallback = { ...ventaData };
                    delete fallback.cancelada;
                    venta = await tx.venta.create({ data: fallback });
                }
                else {
                    throw e;
                }
            }
            const tipoSalida = await tx.tipoMovimiento.findUnique({
                where: { nombre: "Salida" },
                select: { id: true },
            });
            if (!tipoSalida)
                throw new Error("TipoMovimiento 'Salida' no configurado");
            let totalCordoba = 0;
            const detalleVentaRows = [];
            const movimientos = [];
            const decrementarPorInventario = new Map();
            const remisionDetalleIdsTocados = [];
            // Agrupar extras por (inventarioId, precio) para "sumar" en una sola línea
            const extrasMap = new Map();
            const remisionDetalleRows = [];
            for (const d of data.detalles) {
                const cantidad = Number(d.cantidad || 0);
                const precioC$ = Number(d.precioUnitarioCordoba || 0);
                if (!(cantidad > 0))
                    continue;
                if (d.remisionDetalleId) {
                    // Mantener trazabilidad a nivel de remisión para marcar facturado, pero combinaremos en detalle final
                    const precioUS$ = round4(precioC$ / tipoCambio);
                    remisionDetalleRows.push({
                        ventaId: venta.id,
                        inventarioId: d.inventarioId,
                        cantidad,
                        precioUnitarioCordoba: round4(precioC$),
                        precioUnitarioDolar: precioUS$,
                        remisionDetalleId: d.remisionDetalleId,
                    });
                    remisionDetalleIdsTocados.push(d.remisionDetalleId);
                    // No crear movimiento ni decrementar stock: ya salió en la remisión
                }
                else {
                    // Extra: agrupar por (inventarioId|precio)
                    const key = `${d.inventarioId}|${round4(precioC$)}`;
                    const prev = extrasMap.get(key);
                    if (prev) {
                        prev.cantidad += cantidad;
                    }
                    else {
                        extrasMap.set(key, { inventarioId: d.inventarioId, cantidad, precioC$ });
                    }
                    // Preparar decremento agrupado por inventario
                    decrementarPorInventario.set(d.inventarioId, (decrementarPorInventario.get(d.inventarioId) || 0) + cantidad);
                }
            }
            // Construir filas finales COMBINADAS por (inventarioId|precio)
            const remisionMap = new Map();
            for (const r of remisionDetalleRows) {
                const key = `${r.inventarioId}|${round4(Number(r.precioUnitarioCordoba || 0))}`;
                const prev = remisionMap.get(key);
                if (prev) {
                    prev.cantidad += Number(r.cantidad || 0);
                }
                else {
                    remisionMap.set(key, { inventarioId: r.inventarioId, cantidad: Number(r.cantidad || 0), precioC$: round4(Number(r.precioUnitarioCordoba || 0)) });
                }
            }
            // Union de claves y armado de detalle combinado
            const keys = new Set([...remisionMap.keys(), ...extrasMap.keys()]);
            for (const key of keys) {
                const rem = remisionMap.get(key);
                const ex = extrasMap.get(key);
                const inventarioId = (rem?.inventarioId ?? ex?.inventarioId);
                const precioC$ = round4(rem?.precioC$ ?? ex?.precioC$ ?? 0);
                const cantRem = rem?.cantidad ?? 0;
                const cantEx = ex?.cantidad ?? 0;
                const cantidadTotal = cantRem + cantEx;
                if (!(cantidadTotal > 0))
                    continue;
                const precioUS$ = round4(precioC$ / tipoCambio);
                detalleVentaRows.push({
                    ventaId: venta.id,
                    inventarioId,
                    cantidad: cantidadTotal,
                    precioUnitarioCordoba: precioC$,
                    precioUnitarioDolar: precioUS$,
                    remisionDetalleId: null, // combinado
                });
                totalCordoba += round4(cantidadTotal * precioC$);
                // Movimiento SOLO por extras
                if (cantEx > 0) {
                    movimientos.push({
                        inventarioId,
                        tipoMovimientoId: tipoSalida.id,
                        cantidad: cantEx,
                        precioVentaUnitarioCordoba: precioC$,
                        tipoCambioValor: tipoCambio,
                        usuario: data.usuario ?? null,
                        observacion: `Venta Factura ${numeroFacturaFinal}`.trim(),
                    });
                }
            }
            if (detalleVentaRows.length) {
                await tx.detalleVenta.createMany({ data: detalleVentaRows });
            }
            if (remisionDetalleIdsTocados.length) {
                await tx.detalleRemision.updateMany({
                    where: { id: { in: remisionDetalleIdsTocados } },
                    data: { facturado: true },
                });
            }
            if (movimientos.length || decrementarPorInventario.size) {
                await (0, stock_service_1.crearMovimientosYAjustarStockBatch)({ tx, movimientos, decrementarPorInventario });
            }
            if (remisionDetalleIdsTocados.length) {
                const rems = await tx.detalleRemision.findMany({
                    where: { id: { in: remisionDetalleIdsTocados } },
                    select: { remisionId: true },
                });
                const remisionIds = Array.from(new Set(rems.map((r) => r.remisionId)));
                if (remisionIds.length) {
                    // Marcar facturada cuando todos sus detalles estén facturados
                    await tx.remision.updateMany({
                        where: { id: { in: remisionIds }, detalles: { every: { facturado: true } } },
                        data: { facturada: true },
                    });
                    // Añadir anotación a movimientos originales de esas remisiones
                    const remsFull = await tx.remision.findMany({
                        where: { id: { in: remisionIds }, facturada: true },
                        select: {
                            id: true,
                            numero: true,
                            detalles: { select: { movimientoId: true } },
                        },
                    });
                    for (const r of remsFull) {
                        const anotacion = `Facturación de remisión ${r.numero ?? r.id}`;
                        const movIds = r.detalles.map((d) => d.movimientoId).filter(Boolean);
                        if (movIds.length === 0)
                            continue;
                        const movs = await tx.movimientoInventario.findMany({
                            where: { id: { in: movIds } },
                            select: { id: true, observacion: true },
                        });
                        for (const m of movs) {
                            const nuevaObs = m.observacion && m.observacion.trim().length > 0
                                ? `${m.observacion} | ${anotacion}`
                                : anotacion;
                            await tx.movimientoInventario.update({ where: { id: m.id }, data: { observacion: nuevaObs } });
                        }
                    }
                }
            }
            const ventaActualizada = await tx.venta.update({
                where: { id: venta.id },
                data: {
                    totalCordoba: round4(totalCordoba),
                    totalDolar: round4(totalCordoba / tipoCambio),
                },
            });
            return ventaActualizada;
        });
        res.status(201).json({ venta: result });
    }
    catch (error) {
        console.error("❌ Error al crear venta:", error);
        res.status(500).json({ message: "Error interno al crear venta" });
    }
}
/* ===== Generar Proforma ===== */
async function proforma(req, res) {
    try {
        console.info('[ventas] proforma start', {
            ua: req.headers['user-agent'],
            ip: req.headers['x-forwarded-for'] || req.ip,
        });
        const { cliente, clienteId, detalles, tipoCambioValor, pio, incoterm, plazoEntrega, condicionPago, guardarHistorial, soloGuardar } = req.body;
        console.info('[ventas] proforma body', {
            cliente: cliente?.nombre ?? null,
            detallesCount: Array.isArray(detalles) ? detalles.length : 0,
            tipoCambioValor,
            pio: typeof pio === "string" ? pio : null,
            incoterm,
            plazoEntrega,
            condicionPago,
            guardarHistorial,
            soloGuardar,
        });
        if (!cliente || !detalles?.length) {
            return res.status(400).json({ message: "Datos incompletos para proforma" });
        }
        // Obtener datos empresa
        const configRes = await fetch("http://localhost:4000/api/configuracion", {
            headers: { Authorization: req.headers.authorization || "" }
        });
        const empresaData = await configRes.json();
        if (!empresaData) {
            return res.status(500).json({ message: "No se pudo obtener configuración de empresa" });
        }
        // Obtener datos completos del cliente
        let clienteData = cliente || null;
        const clienteIdParsed = Number.isFinite(Number(clienteId)) ? Number(clienteId) : null;
        const clienteIdFromObject = cliente && Number.isFinite(Number(cliente.id)) ? Number(cliente.id) : null;
        const resolveClienteById = async (id) => {
            const r = await fetch(`http://localhost:4000/api/clientes/${id}`, { headers: { Authorization: req.headers.authorization || "" } });
            if (!r.ok)
                return null;
            const c = await r.json();
            return c ? { ...c, correo: c.correo1 || c.correo2 || c.correo || c.email || null } : null;
        };
        const resolveClienteByNombre = async (nombre) => {
            const headers = { Authorization: req.headers.authorization || "" };
            try {
                // 1) Intento de búsqueda por endpoint dedicado
                const r = await fetch(`http://localhost:4000/api/clientes/buscar?q=${encodeURIComponent(nombre)}`, { headers });
                if (r.ok) {
                    const arr = await r.json();
                    const found = Array.isArray(arr) ? arr.find((c) => (c?.nombre || c?.empresa)?.toLowerCase() === String(nombre).toLowerCase()) || arr[0] : null;
                    return found ? { ...found, correo: found.correo1 || found.correo2 || found.correo || found.email || null } : null;
                }
            }
            catch (e) {
                console.warn('[ventas] clientes/buscar fallo; intentando /clientes', e);
            }
            try {
                // 2) Fallback: traer listado completo y buscar localmente
                const rAll = await fetch(`http://localhost:4000/api/clientes`, { headers });
                if (rAll.ok) {
                    const all = await rAll.json();
                    const lower = String(nombre).toLowerCase();
                    const found = Array.isArray(all)
                        ? all.find((c) => (c?.nombre || c?.empresa || '').toLowerCase() === lower)
                            || all.find((c) => (c?.nombre || c?.empresa || '').toLowerCase().includes(lower))
                        : null;
                    return found ? { ...found, correo: found.correo1 || found.correo2 || found.correo || found.email || null } : null;
                }
            }
            catch { }
            return null;
        };
        if (clienteIdParsed !== null) {
            clienteData = await resolveClienteById(clienteIdParsed);
        }
        else if (clienteIdFromObject !== null) {
            clienteData = await resolveClienteById(clienteIdFromObject);
        }
        else if (cliente?.nombre) {
            clienteData = (await resolveClienteByNombre(String(cliente.nombre))) || cliente;
        }
        const clienteIdParaRegistro = clienteIdParsed ?? clienteIdFromObject;
        // Marcar si se desea guardar en historial de productos (por defecto true)
        const shouldGuardarHistorial = guardarHistorial !== false;
        const detallesNorm = Array.isArray(detalles) ? detalles : [];
        const tipoCambio = Number(tipoCambioValor ?? 36.5);
        const totalCordoba = detallesNorm.reduce((acc, d) => acc + Number(d.cantidad || 0) * Number(d.precio || 0), 0);
        const totalDolar = tipoCambio > 0 ? totalCordoba / tipoCambio : 0;
        // Buscar si los productos fueron cotizados en los ultimos 14 dias
        const inventarioIds = detallesNorm
            .map((item) => Number(item?.inventarioId))
            .filter((id) => Number.isFinite(id));
        let recientesResumen = [];
        const recientesMap = new Map();
        if (inventarioIds.length) {
            const desde = new Date();
            desde.setDate(desde.getDate() - 14);
            const recientes = await prisma_1.prisma.productoCotizado.findMany({
                where: {
                    inventarioId: { in: inventarioIds },
                    fecha: { gte: desde },
                },
                orderBy: { fecha: "desc" },
                select: { inventarioId: true, fecha: true, precioCordoba: true, clienteId: true },
            });
            recientes.forEach((r) => {
                const prev = recientesMap.get(r.inventarioId);
                const coincide = Boolean(clienteIdParaRegistro && r.clienteId === clienteIdParaRegistro);
                if (prev) {
                    prev.conteo += 1;
                    prev.clienteCoincide = prev.clienteCoincide || coincide;
                    if (r.fecha > prev.ultimaFecha) {
                        prev.ultimaFecha = r.fecha;
                        prev.precioCordoba = Number(r.precioCordoba || prev.precioCordoba || 0);
                    }
                }
                else {
                    recientesMap.set(r.inventarioId, {
                        ultimaFecha: r.fecha,
                        precioCordoba: Number(r.precioCordoba || 0),
                        conteo: 1,
                        clienteCoincide: coincide,
                    });
                }
            });
            recientesResumen = Array.from(recientesMap.entries()).map(([inventarioId, info]) => ({
                inventarioId,
                ultimaFecha: info.ultimaFecha.toISOString(),
                precioCordoba: info.precioCordoba,
                conteo14d: info.conteo,
                clienteCoincide: info.clienteCoincide,
            }));
            if (recientesResumen.length) {
                // Hasta 10 entradas para no inflar encabezados
                res.setHeader("X-Proforma-Recientes", JSON.stringify(recientesResumen.slice(0, 10)));
            }
        }
        // Propagar bandera de cotizacion reciente a detalles para el PDF
        const detallesMarcados = detallesNorm.map((item) => ({
            ...item,
            cotizadoReciente: recientesMap.has(Number(item?.inventarioId)),
        }));
        const quoteEntries = detallesNorm
            .map((item) => {
            const inventarioId = Number(item?.inventarioId);
            if (!Number.isFinite(inventarioId))
                return null;
            const cantidad = Math.max(0, Number(item.cantidad) || 0);
            if (cantidad <= 0)
                return null;
            const precioCordoba = Number(item.precio ?? 0);
            const precioDolar = tipoCambio > 0 ? Number((precioCordoba / tipoCambio).toFixed(4)) : 0;
            return {
                inventarioId,
                clienteId: clienteIdParaRegistro,
                cantidad,
                precioCordoba,
                precioDolar,
                moneda: "NIO",
            };
        })
            .filter((entry) => Boolean(entry));
        if (shouldGuardarHistorial && quoteEntries.length) {
            try {
                await prisma_1.prisma.productoCotizado.createMany({ data: quoteEntries });
            }
            catch (logError) {
                console.warn("[ventas] No se pudo registrar cotizaciones recientes:", logError);
            }
        }
        // Guardar registro de Proforma (encabezado + detalles) - SIEMPRE se guarda para tener un ID
        let proformaRecord = null;
        try {
            const detallesForJson = detallesNorm.map((item) => ({
                inventarioId: Number(item?.inventarioId) || null,
                numeroParte: item?.numeroParte ?? null,
                nombre: item?.nombre ?? null,
                cantidad: Number(item?.cantidad || 0),
                precioCordoba: Number(item?.precio || 0),
            }));
            proformaRecord = await prisma_1.prisma.proforma.create({
                data: {
                    clienteId: clienteIdParaRegistro ?? null,
                    fecha: new Date(),
                    totalCordoba: totalCordoba,
                    totalDolar: totalDolar,
                    tipoCambioValor: tipoCambio || null,
                    pio: typeof pio === "string" && pio.trim().length > 0 ? pio.trim() : null,
                    incoterm: typeof incoterm === "string" && incoterm.trim().length > 0 ? incoterm.trim() : null,
                    plazoEntrega: typeof plazoEntrega === "string" && plazoEntrega.trim().length > 0 ? plazoEntrega.trim() : null,
                    condicionPago: typeof condicionPago === "string" && condicionPago.trim().length > 0 ? condicionPago.trim() : null,
                    detallesJson: JSON.stringify(detallesForJson),
                },
            });
        }
        catch (err) {
            console.warn("[ventas] No se pudo registrar proforma en historial:", err);
        }
        console.info('[ventas] proforma totals', {
            totalCordoba: Number(totalCordoba || 0).toFixed(2),
            totalDolar: Number(totalDolar || 0).toFixed(2),
            tipoCambio: Number(tipoCambio || 0).toFixed(4),
        });
        // Si solo se desea guardar en historial (sin PDF) responder JSON
        if (soloGuardar) {
            return res.status(201).json({
                message: "Proforma guardada en historial",
                guardada: true,
                recientes: recientesResumen,
                proforma: proformaRecord,
            });
        }
        await (0, proforma_services_1.generarProformaPDFStreamV3)({
            empresa: empresaData,
            cliente: clienteData || cliente,
            detalles: detallesMarcados,
            totalCordoba,
            totalDolar,
            tipoCambio,
            pio: typeof pio === "string" && pio.trim().length > 0 ? pio.trim() : null,
            incoterm: typeof incoterm === "string" && incoterm.trim().length > 0 ? incoterm.trim() : null,
            plazoEntrega: typeof plazoEntrega === "string" && plazoEntrega.trim().length > 0 ? plazoEntrega.trim() : null,
            condicionPago: typeof condicionPago === "string" && condicionPago.trim().length > 0 ? condicionPago.trim() : null,
            proformaId: proformaRecord?.id ?? null,
        }, res);
    }
    catch (error) {
        console.error("❌ Error al generar proforma:", error);
        res.status(500).json({ message: "Error generando proforma" });
    }
}
/* ===== Listar facturas de crédito no canceladas ===== */
async function listPendientes(_req, res) {
    try {
        let ventas = [];
        try {
            ventas = await prisma_1.prisma.venta.findMany({
                where: {
                    tipoPago: 'CREDITO',
                    OR: [
                        { cancelada: false },
                        { cancelada: null },
                    ],
                },
                include: { cliente: true },
                orderBy: [{ fechaVencimiento: 'asc' }, { fecha: 'asc' }],
            });
        }
        catch (e) {
            const msg = String(e?.message || '');
            const compatIssue = msg.includes('Unknown argument `cancelada`') || msg.includes('Argument `cancelada` is missing');
            if (!compatIssue)
                throw e;
            // Fallback cuando el Prisma Client aún no tiene el campo `cancelada`
            ventas = await prisma_1.prisma.venta.findMany({
                where: {
                    tipoPago: 'CREDITO',
                    estadoPago: { not: 'PAGADO' },
                },
                include: { cliente: true },
                orderBy: [{ fechaVencimiento: 'asc' }, { fecha: 'asc' }],
            });
        }
        res.json({ ventas });
    }
    catch (error) {
        console.error('❌ Error al listar pendientes:', error);
        res.status(500).json({ message: 'Error interno al listar pendientes' });
    }
}
// ===== Historial de Proformas (encabezados) =====
async function listProformas(_req, res) {
    try {
        const proformas = await prisma_1.prisma.proforma.findMany({
            include: { cliente: true },
            orderBy: { fecha: "desc" },
        });
        res.json({ proformas });
    }
    catch (error) {
        console.error("❌ Error al listar proformas:", error);
        res.status(500).json({ message: "Error interno al listar proformas" });
    }
}
async function getProformaById(req, res) {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return res.status(400).json({ message: "ID inválido" });
    }
    try {
        const proforma = await prisma_1.prisma.proforma.findUnique({
            where: { id },
            include: { cliente: true },
        });
        if (!proforma) {
            return res.status(404).json({ message: "Proforma no encontrada" });
        }
        res.json({ proforma });
    }
    catch (error) {
        console.error("❌ Error al obtener proforma:", error);
        res.status(500).json({ message: "Error interno al obtener proforma" });
    }
}
// ===============================
// ✅ Marcar/Actualizar cancelada (crédito pagado)
// ===============================
async function updateCancelada(req, res) {
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
        return res.status(400).json({ message: 'ID inválido' });
    const body = req.body;
    const value = Boolean(body?.cancelada);
    try {
        const venta = await prisma_1.prisma.venta.findUnique({ where: { id } });
        if (!venta)
            return res.status(404).json({ message: 'Venta no encontrada' });
        // Solo tiene sentido para crédito; para contado ya viene pagada/cancelada
        const updated = await prisma_1.prisma.venta.update({
            where: { id },
            data: {
                cancelada: value,
                // Opcionalmente sincronizar estadoPago si se marca cancelada
                ...(venta.tipoPago === 'CREDITO' && value ? { estadoPago: 'PAGADO' } : {}),
            },
        });
        res.json({ venta: updated });
    }
    catch (err) {
        console.error('❌ Error al actualizar cancelada:', err);
        res.status(500).json({ message: 'Error interno al actualizar cancelada' });
    }
}
// ===============================
// ✅ Generar Excel de Proforma
// ===============================
async function generarProformaExcel(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
            return res.status(400).json({ message: "ID inválido" });
        }
        const moneda = req.query.moneda || "NIO";
        const esUSD = moneda === "USD";
        const proforma = await prisma_1.prisma.proforma.findUnique({
            where: { id },
            include: { cliente: true },
        });
        if (!proforma) {
            return res.status(404).json({ message: "Proforma no encontrada" });
        }
        const empresa = await prisma_1.prisma.configuracion.findFirst();
        let detalles = [];
        try {
            const parsed = JSON.parse(proforma.detallesJson || "[]");
            if (Array.isArray(parsed))
                detalles = parsed;
        }
        catch {
            detalles = [];
        }
        const wb = new exceljs_1.default.Workbook();
        const ws = wb.addWorksheet("Proforma", {
            pageSetup: {
                paperSize: 9, // A4
                orientation: "portrait",
                margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5 }
            },
        });
        // Configurar anchos de columnas
        ws.columns = [
            { width: 6 }, // A - Pos
            { width: 18 }, // B - No. De Parte
            { width: 40 }, // C - Descripción
            { width: 10 }, // D - Cantidad
            { width: 18 }, // E - Precio Unitario
            { width: 18 }, // F - Precio Total
        ];
        let currentRow = 1;
        // Logo (si existe)
        const logoPath = (0, logo_1.resolveLogoPath)(empresa?.logoUrl);
        if (logoPath && fs_1.default.existsSync(logoPath)) {
            try {
                const logoId = wb.addImage({
                    filename: logoPath,
                    extension: logoPath.endsWith('.png') ? 'png' : 'jpeg',
                });
                ws.addImage(logoId, {
                    tl: { col: 0, row: 0 },
                    ext: { width: 140, height: 60 },
                });
            }
            catch (err) {
                console.warn("No se pudo agregar logo al Excel:", err);
            }
        }
        // Encabezado empresa (lado derecho)
        ws.mergeCells(`D${currentRow}:F${currentRow}`);
        ws.getCell(`D${currentRow}`).value = empresa?.razonSocial || "EMPRESA";
        ws.getCell(`D${currentRow}`).font = { size: 14, bold: true, color: { argb: "FF0b3a9b" } };
        ws.getCell(`D${currentRow}`).alignment = { horizontal: "right", vertical: "middle" };
        currentRow++;
        ws.mergeCells(`D${currentRow}:F${currentRow}`);
        ws.getCell(`D${currentRow}`).value = `RUC: ${empresa?.ruc ?? ""}`;
        ws.getCell(`D${currentRow}`).font = { size: 9 };
        ws.getCell(`D${currentRow}`).alignment = { horizontal: "right" };
        currentRow++;
        ws.mergeCells(`D${currentRow}:F${currentRow}`);
        ws.getCell(`D${currentRow}`).value = `Tel: ${[empresa?.telefono1, empresa?.telefono2].filter(Boolean).join(" / ")}`;
        ws.getCell(`D${currentRow}`).font = { size: 9 };
        ws.getCell(`D${currentRow}`).alignment = { horizontal: "right" };
        currentRow++;
        ws.mergeCells(`D${currentRow}:F${currentRow}`);
        ws.getCell(`D${currentRow}`).value = `Correo: ${empresa?.correo ?? ""}`;
        ws.getCell(`D${currentRow}`).font = { size: 9 };
        ws.getCell(`D${currentRow}`).alignment = { horizontal: "right" };
        currentRow++;
        currentRow++; // Espacio
        // Título PROFORMA
        ws.mergeCells(`A${currentRow}:F${currentRow}`);
        ws.getCell(`A${currentRow}`).value = "PROFORMA";
        ws.getCell(`A${currentRow}`).font = { size: 16, bold: true, color: { argb: "FF0b3a9b" } };
        ws.getCell(`A${currentRow}`).alignment = { horizontal: "center", vertical: "middle" };
        ws.getRow(currentRow).height = 25;
        currentRow++;
        currentRow++; // Espacio
        // Información de la proforma
        ws.getCell(`A${currentRow}`).value = "Fecha:";
        ws.getCell(`A${currentRow}`).font = { bold: true };
        ws.getCell(`B${currentRow}`).value = new Date(proforma.fecha).toLocaleDateString();
        ws.getCell(`D${currentRow}`).value = "Oferta N°:";
        ws.getCell(`D${currentRow}`).font = { bold: true };
        ws.getCell(`D${currentRow}`).alignment = { horizontal: "right" };
        ws.getCell(`E${currentRow}`).value = String(proforma.id).padStart(6, '0');
        ws.getCell(`E${currentRow}`).alignment = { horizontal: "right" };
        currentRow++;
        currentRow++; // Espacio
        // Cliente
        ws.getCell(`A${currentRow}`).value = "ATENCIÓN A:";
        ws.getCell(`A${currentRow}`).font = { bold: true, color: { argb: "FF0b2d64" } };
        currentRow++;
        ws.mergeCells(`A${currentRow}:F${currentRow}`);
        ws.getCell(`A${currentRow}`).value = proforma.cliente?.empresa || proforma.cliente?.nombre || "Cliente";
        ws.getCell(`A${currentRow}`).font = { bold: true };
        currentRow++;
        if (proforma.cliente?.direccion) {
            ws.mergeCells(`A${currentRow}:F${currentRow}`);
            ws.getCell(`A${currentRow}`).value = proforma.cliente.direccion;
            ws.getCell(`A${currentRow}`).font = { size: 10 };
            currentRow++;
        }
        currentRow++; // Espacio
        // Condiciones
        ws.getCell(`A${currentRow}`).value = "CONDICIONES:";
        ws.getCell(`A${currentRow}`).font = { bold: true, size: 10 };
        currentRow++;
        const incoterm = proforma.incoterm || "DDP NICARAGUA";
        ws.mergeCells(`A${currentRow}:F${currentRow}`);
        ws.getCell(`A${currentRow}`).value = `INCOTERM: ${incoterm}`;
        ws.getCell(`A${currentRow}`).font = { bold: true, size: 9 };
        currentRow++;
        const plazoEntrega = proforma.plazoEntrega || "Inmediato";
        ws.mergeCells(`A${currentRow}:F${currentRow}`);
        ws.getCell(`A${currentRow}`).value = `PLAZO DE ENTREGA: ${plazoEntrega}`;
        ws.getCell(`A${currentRow}`).font = { bold: true, size: 9 };
        currentRow++;
        const condicionPago = proforma.condicionPago || "30 dias credito";
        ws.mergeCells(`A${currentRow}:F${currentRow}`);
        ws.getCell(`A${currentRow}`).value = `CONDICION DE PAGO: ${condicionPago}`;
        ws.getCell(`A${currentRow}`).font = { bold: true, size: 9 };
        currentRow++;
        currentRow++; // Espacio
        // Encabezado de tabla
        const headerRow = currentRow;
        const headers = ["Pos", "No. De Parte", "Descripcion", "Cant.", "Precio Unitario", "Precio Tot."];
        headers.forEach((header, idx) => {
            const cell = ws.getRow(headerRow).getCell(idx + 1);
            cell.value = header;
            cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FF0b2d64" }, // Azul oscuro
            };
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.border = {
                top: { style: "thin", color: { argb: "FFFFFFFF" } },
                bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
                left: { style: "thin", color: { argb: "FFFFFFFF" } },
                right: { style: "thin", color: { argb: "FFFFFFFF" } },
            };
        });
        ws.getRow(headerRow).height = 20;
        currentRow++;
        // Datos de la tabla
        const tipoCambio = Number(proforma.tipoCambioValor || 36.5);
        let total = 0;
        detalles.forEach((item, idx) => {
            const cantidad = Number(item.cantidad || 0);
            const precioCordoba = Number(item.precioCordoba || 0);
            const precio = esUSD ? (precioCordoba / tipoCambio) : precioCordoba;
            const subtotal = cantidad * precio;
            total += subtotal;
            const row = ws.getRow(currentRow);
            row.getCell(1).value = idx + 1; // Posición
            row.getCell(2).value = item.numeroParte || "";
            row.getCell(3).value = item.nombre || "";
            row.getCell(4).value = cantidad;
            row.getCell(5).value = precio;
            row.getCell(5).numFmt = esUSD ? '"$"#,##0.00' : '"C$"#,##0.00';
            row.getCell(6).value = subtotal;
            row.getCell(6).numFmt = esUSD ? '"$"#,##0.00' : '"C$"#,##0.00';
            // Fondo alternado
            if (idx % 2 === 0) {
                [1, 2, 3, 4, 5, 6].forEach((colIdx) => {
                    row.getCell(colIdx).fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: "FFF8FAFC" },
                    };
                });
            }
            // Bordes y alineación
            [1, 2, 3, 4, 5, 6].forEach((colIdx) => {
                row.getCell(colIdx).border = {
                    top: { style: "thin", color: { argb: "FFCCCCCC" } },
                    bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
                    left: { style: "thin", color: { argb: "FFCCCCCC" } },
                    right: { style: "thin", color: { argb: "FFCCCCCC" } },
                };
                row.getCell(colIdx).alignment = {
                    horizontal: "center",
                    vertical: "middle"
                };
            });
            currentRow++;
        });
        currentRow++; // Espacio
        // Total
        ws.getCell(`E${currentRow}`).value = "TOTAL:";
        ws.getCell(`E${currentRow}`).font = { bold: true, size: 11 };
        ws.getCell(`E${currentRow}`).alignment = { horizontal: "right" };
        ws.getCell(`F${currentRow}`).value = total;
        ws.getCell(`F${currentRow}`).numFmt = esUSD ? '"$"#,##0.00' : '"C$"#,##0.00';
        ws.getCell(`F${currentRow}`).font = { bold: true, size: 11 };
        ws.getCell(`F${currentRow}`).alignment = { horizontal: "center" };
        currentRow++;
        currentRow += 2; // Espacio
        // Despedida
        ws.mergeCells(`A${currentRow}:F${currentRow}`);
        ws.getCell(`A${currentRow}`).value = "Atentamente";
        ws.getCell(`A${currentRow}`).font = { size: 11, bold: true };
        ws.getCell(`A${currentRow}`).alignment = { horizontal: "center" };
        currentRow++;
        ws.mergeCells(`A${currentRow}:F${currentRow}`);
        ws.getCell(`A${currentRow}`).value = "SERVICIOS MULTIPLES E IMPORTACIONES AYHER";
        ws.getCell(`A${currentRow}`).font = { size: 11, bold: true };
        ws.getCell(`A${currentRow}`).alignment = { horizontal: "center" };
        // Enviar el archivo
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=proforma_${proforma.id}.xlsx`);
        await wb.xlsx.write(res);
        res.status(200).end();
    }
    catch (error) {
        console.error("Error generando Excel de proforma:", error);
        res.status(500).json({ message: "Error generando Excel de proforma" });
    }
}
