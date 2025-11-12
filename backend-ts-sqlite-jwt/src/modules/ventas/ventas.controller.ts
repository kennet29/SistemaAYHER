// src/modules/ventas/ventas.controller.ts
import { Request, Response } from "express";
import { prisma } from "../../db/prisma";
import { z } from "zod";
import { crearMovimientosYAjustarStockBatch } from "../services/stock.service";
import { generarProformaPDF, generarProformaPDFStreamV2 as generarProformaPDFStream } from "./services/proforma.services";
import fs from "fs";

const round4 = (n: number) => Number((n ?? 0).toFixed(4));

/* ===== Zod ===== */
const DetalleSchema = z.object({
  inventarioId: z.number().int().positive(),
  cantidad: z.number().int().positive(),
  precioUnitarioCordoba: z.number().nonnegative(),
  remisionDetalleId: z.number().int().nullable().optional(),
});
const VentaSchema = z.object({
  fecha: z.coerce.date().optional(),
  clienteId: z.number().nullable().optional(),
  numeroFactura: z.string().optional(),
  tipoPago: z.enum(["CONTADO", "CREDITO"]).default("CONTADO"),
  plazoDias: z.number().nullable().optional(),
  usuario: z.string().nullable().optional(),
  observacion: z.string().nullable().optional(),
  tipoCambioValor: z.number().nullable().optional(),
  detalles: z.array(DetalleSchema).min(1),
});

/* ===== Listar ===== */
export async function list(_req: Request, res: Response) {
  const ventas = await prisma.venta.findMany({
    include: { detalles: { include: { inventario: true, remisionDetalle: true } }, cliente: true },
    orderBy: { id: "desc" },
  });
  res.json({ ventas });
}

/* ===== Obtener ===== */
export async function getById(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inválido" });
  const venta = await prisma.venta.findUnique({
    where: { id },
    include: { detalles: { include: { inventario: true, remisionDetalle: true } }, cliente: true },
  });
  if (!venta) return res.status(404).json({ message: "No encontrada" });
  res.json({ venta });
}

/* ===== Crear Venta ===== */
export async function create(req: Request, res: Response) {
  const parsed = VentaSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());
  const data = parsed.data;

  const tipoCambio = Number(data.tipoCambioValor ?? 36.5);
  const baseFecha: Date = data.fecha ? new Date(data.fecha) : new Date();
  if (!(tipoCambio > 0)) return res.status(400).json({ message: "tipoCambioValor inválido" });

  try {
    const result = await prisma.$transaction(async (tx) => {
      let fechaVencimiento: Date | null = null;
      if (data.tipoPago === "CREDITO" && data.plazoDias) {
        fechaVencimiento = new Date(baseFecha);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + data.plazoDias);
      }
      // Generar consecutivo de factura si no viene especificado
      const genNextNumero = (prev?: string | null) => {
        const digits = String(prev || "").replace(/\D+/g, "");
        const n = Number(digits || 0) + 1;
        return `F${String(n).padStart(6, "0")}`;
      };
      let numeroFacturaFinal: string | null = (data.numeroFactura || "").trim() || null;
      if (!numeroFacturaFinal) {
        const last = await tx.venta.findFirst({ orderBy: { id: "desc" }, select: { numeroFactura: true } });
        numeroFacturaFinal = genNextNumero(last?.numeroFactura || null);
      }

      const ventaData: any = {
        fecha: baseFecha,
        clienteId: data.clienteId ?? null,
        numeroFactura: numeroFacturaFinal,
        tipoPago: data.tipoPago,
        plazoDias: data.plazoDias ?? null,
        fechaVencimiento,
        estadoPago: data.tipoPago === "CONTADO" ? "PAGADO" : "PENDIENTE",
        cancelada: data.tipoPago === "CONTADO" ? true : false,
        tipoCambioValor: tipoCambio as any,
        usuario: data.usuario ?? null,
        observacion: (() => {
          const base = (data.observacion || "").trim();
          const nota = `Consecutivo: ${numeroFacturaFinal}`;
          return base ? `${base} | ${nota}` : nota;
        })(),
      };

      let venta = null as any;
      try {
        venta = await tx.venta.create({ data: ventaData });
      } catch (e: any) {
        const msg = String(e?.message || "");
        if (msg.includes("Unknown argument `cancelada`")) {
          const fallback = { ...ventaData };
          delete (fallback as any).cancelada;
          venta = await tx.venta.create({ data: fallback });
        } else {
          throw e;
        }
      }

      const tipoSalida = await tx.tipoMovimiento.findUnique({
        where: { nombre: "Salida" },
        select: { id: true },
      });
      if (!tipoSalida) throw new Error("TipoMovimiento 'Salida' no configurado");

      let totalCordoba = 0;
      const detalleVentaRows: any[] = [];
      const movimientos: any[] = [];
      const decrementarPorInventario = new Map<number, number>();
      const remisionDetalleIdsTocados: number[] = [];

      // Agrupar extras por (inventarioId, precio) para "sumar" en una sola línea
      const extrasMap = new Map<string, { inventarioId: number; cantidad: number; precioC$: number }>();
      const remisionDetalleRows: any[] = [];

      for (const d of data.detalles) {
        const cantidad = Number(d.cantidad || 0);
        const precioC$ = Number(d.precioUnitarioCordoba || 0);
        if (!(cantidad > 0)) continue;

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
        } else {
          // Extra: agrupar por (inventarioId|precio)
          const key = `${d.inventarioId}|${round4(precioC$)}`;
          const prev = extrasMap.get(key);
          if (prev) {
            prev.cantidad += cantidad;
          } else {
            extrasMap.set(key, { inventarioId: d.inventarioId, cantidad, precioC$ });
          }
          // Preparar decremento agrupado por inventario
          decrementarPorInventario.set(
            d.inventarioId,
            (decrementarPorInventario.get(d.inventarioId) || 0) + cantidad
          );
        }
      }

      // Construir filas finales COMBINADAS por (inventarioId|precio)
      const remisionMap = new Map<string, { inventarioId: number; cantidad: number; precioC$: number }>();
      for (const r of remisionDetalleRows) {
        const key = `${r.inventarioId}|${round4(Number(r.precioUnitarioCordoba || 0))}`;
        const prev = remisionMap.get(key);
        if (prev) {
          prev.cantidad += Number(r.cantidad || 0);
        } else {
          remisionMap.set(key, { inventarioId: r.inventarioId, cantidad: Number(r.cantidad || 0), precioC$: round4(Number(r.precioUnitarioCordoba || 0)) });
        }
      }

      // Union de claves y armado de detalle combinado
      const keys = new Set<string>([...remisionMap.keys(), ...extrasMap.keys()]);
      for (const key of keys) {
        const rem = remisionMap.get(key);
        const ex = extrasMap.get(key);
        const inventarioId = (rem?.inventarioId ?? ex?.inventarioId)!;
        const precioC$ = round4(rem?.precioC$ ?? ex?.precioC$ ?? 0);
        const cantRem = rem?.cantidad ?? 0;
        const cantEx = ex?.cantidad ?? 0;
        const cantidadTotal = cantRem + cantEx;
        if (!(cantidadTotal > 0)) continue;

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
        await crearMovimientosYAjustarStockBatch({ tx, movimientos, decrementarPorInventario });
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
            const movIds = r.detalles.map((d: any) => d.movimientoId).filter(Boolean) as number[];
            if (movIds.length === 0) continue;
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
  } catch (error) {
    console.error("❌ Error al crear venta:", error);
    res.status(500).json({ message: "Error interno al crear venta" });
  }
}

/* ===== Generar Proforma ===== */
export async function proforma(req: Request, res: Response) {
  try {
    console.info('[ventas] proforma start', {
      ua: req.headers['user-agent'],
      ip: (req.headers['x-forwarded-for'] as string) || req.ip,
    });
    const { cliente, clienteId, detalles, tipoCambioValor } = req.body;
    console.info('[ventas] proforma body', {
      cliente: cliente?.nombre ?? null,
      detallesCount: Array.isArray(detalles) ? detalles.length : 0,
      tipoCambioValor,
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
    let clienteData: any = cliente || null;
    const resolveClienteById = async (id: number) => {
      const r = await fetch(`http://localhost:4000/api/clientes/${id}`, { headers: { Authorization: req.headers.authorization || "" } });
      if (!r.ok) return null;
      const c = await r.json();
      return c ? { ...c, correo: c.correo1 || c.correo2 || c.correo || c.email || null } : null;
    };
    const resolveClienteByNombre = async (nombre: string) => {
      const headers = { Authorization: req.headers.authorization || "" } as any;
      try {
        // 1) Intento de búsqueda por endpoint dedicado
        const r = await fetch(`http://localhost:4000/api/clientes/buscar?q=${encodeURIComponent(nombre)}`, { headers });
        if (r.ok) {
          const arr = await r.json();
          const found = Array.isArray(arr) ? arr.find((c: any) => (c?.nombre || c?.empresa)?.toLowerCase() === String(nombre).toLowerCase()) || arr[0] : null;
          return found ? { ...found, correo: found.correo1 || found.correo2 || found.correo || found.email || null } : null;
        }
      } catch (e) {
        console.warn('[ventas] clientes/buscar fallo; intentando /clientes', e);
      }
      try {
        // 2) Fallback: traer listado completo y buscar localmente
        const rAll = await fetch(`http://localhost:4000/api/clientes`, { headers });
        if (rAll.ok) {
          const all = await rAll.json();
          const lower = String(nombre).toLowerCase();
          const found = Array.isArray(all)
            ? all.find((c: any) => ((c?.nombre || c?.empresa || '') as string).toLowerCase() === lower)
              || all.find((c: any) => ((c?.nombre || c?.empresa || '') as string).toLowerCase().includes(lower))
            : null;
          return found ? { ...found, correo: found.correo1 || found.correo2 || found.correo || found.email || null } : null;
        }
      } catch {}
      return null;
    };

    if (Number.isFinite(Number(clienteId))) {
      clienteData = await resolveClienteById(Number(clienteId));
    } else if (cliente?.id && Number.isFinite(Number(cliente.id))) {
      clienteData = await resolveClienteById(Number(cliente.id));
    } else if (cliente?.nombre) {
      clienteData = (await resolveClienteByNombre(String(cliente.nombre))) || cliente;
    }

    const tipoCambio = Number(tipoCambioValor ?? 36.5);

    const totalCordoba = (detalles as any[]).reduce(
      (acc: number, d: any) => acc + Number(d.cantidad || 0) * Number(d.precio || 0),
      0
    );
    const totalDolar = tipoCambio > 0 ? totalCordoba / tipoCambio : 0;

    console.info('[ventas] proforma totals', {
      totalCordoba: Number(totalCordoba || 0).toFixed(2),
      totalDolar: Number(totalDolar || 0).toFixed(2),
      tipoCambio: Number(tipoCambio || 0).toFixed(4),
    });

    await generarProformaPDFStream({
      empresa: empresaData,
      cliente: clienteData || cliente,
      detalles,
      totalCordoba,
      totalDolar,
      tipoCambio,
    }, res);

  } catch (error) {
    console.error("❌ Error al generar proforma:", error);
    res.status(500).json({ message: "Error generando proforma" });
  }
}

/* ===== Listar facturas de crédito no canceladas ===== */
export async function listPendientes(_req: Request, res: Response) {
  try {
    let ventas: any[] = [];
    try {
      ventas = await prisma.venta.findMany({
        where: {
          tipoPago: 'CREDITO',
          OR: [
            { cancelada: false },
            { cancelada: null as any },
          ],
        },
        include: { cliente: true },
        orderBy: [{ fechaVencimiento: 'asc' }, { fecha: 'asc' }],
      });
    } catch (e: any) {
      const msg = String(e?.message || '');
      const compatIssue = msg.includes('Unknown argument `cancelada`') || msg.includes('Argument `cancelada` is missing');
      if (!compatIssue) throw e;
      // Fallback cuando el Prisma Client aún no tiene el campo `cancelada`
      ventas = await prisma.venta.findMany({
        where: {
          tipoPago: 'CREDITO',
          estadoPago: { not: 'PAGADO' },
        },
        include: { cliente: true },
        orderBy: [{ fechaVencimiento: 'asc' }, { fecha: 'asc' }],
      });
    }
    res.json({ ventas });
  } catch (error) {
    console.error('❌ Error al listar pendientes:', error);
    res.status(500).json({ message: 'Error interno al listar pendientes' });
  }
}

// ===============================
// ✅ Marcar/Actualizar cancelada (crédito pagado)
// ===============================
export async function updateCancelada(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: 'ID inválido' });
  const body = req.body as { cancelada?: boolean };
  const value = Boolean(body?.cancelada);

  try {
    const venta = await prisma.venta.findUnique({ where: { id } });
    if (!venta) return res.status(404).json({ message: 'Venta no encontrada' });

    // Solo tiene sentido para crédito; para contado ya viene pagada/cancelada
    const updated = await prisma.venta.update({
      where: { id },
      data: {
        cancelada: value,
        // Opcionalmente sincronizar estadoPago si se marca cancelada
        ...(venta.tipoPago === 'CREDITO' && value ? { estadoPago: 'PAGADO' } : {}),
      },
    });
    res.json({ venta: updated });
  } catch (err) {
    console.error('❌ Error al actualizar cancelada:', err);
    res.status(500).json({ message: 'Error interno al actualizar cancelada' });
  }
}




