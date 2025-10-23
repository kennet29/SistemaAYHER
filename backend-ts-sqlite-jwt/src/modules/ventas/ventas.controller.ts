import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';
import { z } from 'zod';
import { crearMovimientoYAjustarStock } from '../services/stock.service';

const DetalleSchema = z.object({
  inventarioId: z.number().int().positive(),
  cantidad: z.number().int().positive(),
  precioUnitarioCordoba: z.number().nonnegative()
});

const VentaSchema = z.object({
  fecha: z.string().optional(),
  cliente: z.string().optional(),
  numeroFactura: z.string().optional(),
  tipoCambioValor: z.number().optional(),
  usuario: z.string().optional(),
  observacion: z.string().optional(),
  detalles: z.array(DetalleSchema).min(1)
});

export async function list(_req: Request, res: Response) {
  const ventas = await prisma.venta.findMany({
    include: { detalles: true },
    orderBy: { id: 'desc' }
  });
  res.json({ ventas });
}

export async function getById(req: Request, res: Response) {
  const id = Number(req.params.id);
  const venta = await prisma.venta.findUnique({
    where: { id },
    include: { detalles: true }
  });
  if (!venta) return res.status(404).json({ message: 'No encontrada' });
  res.json({ venta });
}

export async function create(req: Request, res: Response) {
  const parsed = VentaSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());

  const data = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    const venta = await tx.venta.create({
      data: {
        cliente: data.cliente,
        numeroFactura: data.numeroFactura,
        tipoCambioValor: (data.tipoCambioValor ?? 36.5) as any,
        usuario: data.usuario,
        observacion: data.observacion
      }
    });

    let total = 0;
    for (const d of data.detalles) {
      await tx.detalleVenta.create({
        data: {
          ventaId: venta.id,
          inventarioId: d.inventarioId,
          cantidad: d.cantidad,
          precioUnitarioCordoba: d.precioUnitarioCordoba as any
        }
      });

      total += d.cantidad * d.precioUnitarioCordoba;

      // Movimiento: SALIDA
      await crearMovimientoYAjustarStock({
        inventarioId: d.inventarioId,
        tipoMovimientoNombre: 'Salida',
        cantidad: d.cantidad,
        precioVentaUnitarioCordoba: d.precioUnitarioCordoba,
        tipoCambioValor: data.tipoCambioValor,
        usuario: data.usuario,
        observacion: `Venta N° ${data.numeroFactura ?? ''}`
      });
    }

    const ventaActualizada = await tx.venta.update({
      where: { id: venta.id },
      data: { totalCordoba: total as any }
    });

    return ventaActualizada;
  });

  res.status(201).json({ venta: result });
}
