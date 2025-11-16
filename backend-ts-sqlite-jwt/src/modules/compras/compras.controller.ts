import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';
import { z } from 'zod';
import { crearMovimientoYAjustarStock } from '../services/stock.service';

const DetalleSchema = z.object({
  inventarioId: z.number().int().positive(),
  cantidad: z.number().int().positive(),
  costoUnitarioCordoba: z.number().nonnegative()
});

const CompraSchema = z.object({
  fecha: z.string().optional(),
  proveedor: z.string().min(1),
  numeroFactura: z.string().optional(),
  tipoCambioValor: z.number().optional(),
  usuario: z.string().optional(),
  observacion: z.string().optional(),
  detalles: z.array(DetalleSchema).min(1)
});

export async function list(_req: Request, res: Response) {
  const compras = await prisma.compra.findMany({
    include: { detalles: true },
    orderBy: { id: 'desc' }
  });
  res.json({ compras });
}

export async function getById(req: Request, res: Response) {
  const id = Number(req.params.id);
  const compra = await prisma.compra.findUnique({
    where: { id },
    include: { detalles: true }
  });
  if (!compra) return res.status(404).json({ message: 'No encontrada' });
  res.json({ compra });
}

export async function create(req: Request, res: Response) {
  const parsed = CompraSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());

  const data = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    const tc = Number(data.tipoCambioValor ?? 36.5);
    const compra = await tx.compra.create({
      data: {
        proveedor: data.proveedor,
        numeroFactura: data.numeroFactura,
        tipoCambioValor: (data.tipoCambioValor ?? 36.5) as any,
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
          costoUnitarioCordoba: d.costoUnitarioCordoba as any,
          costoUnitarioDolar: (Number(d.costoUnitarioCordoba) / tc) as any,
        }
      });

      total += d.cantidad * d.costoUnitarioCordoba;

      // Movimiento: ENTRADA
      await crearMovimientoYAjustarStock({
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
      data: { totalCordoba: total as any }
    });

    return compraActualizada;
  });

  res.status(201).json({ compra: result });
}
