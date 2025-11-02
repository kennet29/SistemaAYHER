import { Request, Response } from "express";
import { prisma } from "../../db/prisma";
import { z } from "zod";
import { crearMovimientoYAjustarStock } from "../services/stock.service";

// =============================
// ✅ Validación Zod CORREGIDA
// =============================

const DetalleSchema = z.object({
  inventarioId: z.number().int().positive(),
  cantidad: z.number().int().positive(),
  precioUnitarioCordoba: z.number().nonnegative(),
  remisionDetalleId: z.number().int().nullable().optional(), // ✅ aceptar null
});

const VentaSchema = z.object({
  clienteId: z.number().nullable().optional(), // ✅ aceptar null
  numeroFactura: z.string().optional(),
  tipoPago: z.enum(["CONTADO", "CREDITO"]).default("CONTADO"),
  plazoDias: z.number().nullable().optional(),
  usuario: z.string().nullable().optional(),
  observacion: z.string().nullable().optional(),
  tipoCambioValor: z.number().nullable().optional(),
  detalles: z.array(DetalleSchema).min(1),
});

// =============================
// 📋 Listar ventas
// =============================
export async function list(_req: Request, res: Response) {
  const ventas = await prisma.venta.findMany({
    include: {
      detalles: {
        include: {
          inventario: true,
          remisionDetalle: true,
        },
      },
      cliente: true,
    },
    orderBy: { id: "desc" },
  });
  res.json({ ventas });
}

// =============================
// 🔍 Obtener venta
// =============================
export async function getById(req: Request, res: Response) {
  const id = Number(req.params.id);
  const venta = await prisma.venta.findUnique({
    where: { id },
    include: {
      detalles: { include: { inventario: true } },
      cliente: true,
    },
  });
  if (!venta) return res.status(404).json({ message: "No encontrada" });
  res.json({ venta });
}

// =============================
// ➕ Crear venta
// =============================
export async function create(req: Request, res: Response) {
  const parsed = VentaSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());
  const data = parsed.data;

  const tipoCambio = data.tipoCambioValor ?? 36.5;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // ✅ fecha de vencimiento si es crédito
      let fechaVencimiento: Date | null = null;
      if (data.tipoPago === "CREDITO" && data.plazoDias) {
        fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + data.plazoDias);
      }

      // ✅ crear venta
      const venta = await tx.venta.create({
        data: {
          clienteId: data.clienteId ?? null,
          numeroFactura: data.numeroFactura ?? null,
          tipoPago: data.tipoPago,
          plazoDias: data.plazoDias ?? null,
          fechaVencimiento,
          estadoPago: data.tipoPago === "CONTADO" ? "PAGADO" : "PENDIENTE",
          tipoCambioValor: tipoCambio as any,
          usuario: data.usuario ?? null,
          observacion: data.observacion ?? null,
        },
      });

      let total = 0;

      for (const d of data.detalles) {
        // ✅ crear detalle venta
        await tx.detalleVenta.create({
          data: {
            ventaId: venta.id,
            inventarioId: d.inventarioId,
            cantidad: d.cantidad,
            precioUnitarioCordoba: d.precioUnitarioCordoba as any,
            remisionDetalleId: d.remisionDetalleId ?? null,
          },
        });

        total += d.cantidad * d.precioUnitarioCordoba;

        // ✅ Si NO es remisión => descontar stock
        if (!d.remisionDetalleId) {
          await crearMovimientoYAjustarStock({
            inventarioId: d.inventarioId,
            tipoMovimientoNombre: "Salida",
            cantidad: d.cantidad,
            precioVentaUnitarioCordoba: d.precioUnitarioCordoba,
            tipoCambioValor: tipoCambio,
            usuario: data.usuario,
            observacion: `Venta Factura ${data.numeroFactura ?? ""}`,
          });
        } else {
          // ✅ viene de remisión => marcar como facturado
          await tx.detalleRemision.update({
            where: { id: d.remisionDetalleId },
            data: { facturado: true },
          });
        }
      }

      // ✅ marcar remisión completa si todos los detalles facturados
      await tx.remision.updateMany({
        where: {
          detalles: {
            every: { facturado: true },
          },
        },
        data: { facturada: true },
      });

      // ✅ actualizar totales
      const ventaActualizada = await tx.venta.update({
        where: { id: venta.id },
        data: {
          totalCordoba: total as any,
          totalDolar: total / tipoCambio,
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
