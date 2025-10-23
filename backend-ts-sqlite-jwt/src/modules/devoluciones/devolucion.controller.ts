import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';
import { z } from 'zod';
import { crearMovimientoYAjustarStock } from '../services/stock.service';

const DevVentaSchema = z.object({
  ventaId: z.number().int().positive(),
  cliente: z.string().optional(),
  motivo: z.string().optional(),
  usuario: z.string().optional(),
  detalles: z.array(z.object({
    inventarioId: z.number().int().positive(),
    cantidad: z.number().int().positive(),
    precioUnitarioCordoba: z.number().nonnegative()
  })).min(1)
});

const DevCompraSchema = z.object({
  compraId: z.number().int().positive(),
  proveedor: z.string().optional(),
  motivo: z.string().optional(),
  usuario: z.string().optional(),
  detalles: z.array(z.object({
    inventarioId: z.number().int().positive(),
    cantidad: z.number().int().positive(),
    costoUnitarioCordoba: z.number().nonnegative()
  })).min(1)
});

// Devolución de Venta => ENTRA al inventario
export async function createDevolucionVenta(req: Request, res: Response) {
  const parsed = DevVentaSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());
  const data = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
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
          precioUnitarioCordoba: d.precioUnitarioCordoba as any
        }
      });

      await crearMovimientoYAjustarStock({
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
export async function createDevolucionCompra(req: Request, res: Response) {
  const parsed = DevCompraSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());
  const data = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
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
          costoUnitarioCordoba: d.costoUnitarioCordoba as any
        }
      });

      await crearMovimientoYAjustarStock({
        inventarioId: d.inventarioId,
        tipoMovimientoNombre: 'Devolución a Proveedor',
        cantidad: d.cantidad,
        costoUnitarioCordoba: d.costoUnitarioCordoba,
        usuario: data.usuario,
        observacion: 'Devolución proveedor'
      });
    }

    return dev;
  });

  res.status(201).json({ devolucionCompra: result });
}
