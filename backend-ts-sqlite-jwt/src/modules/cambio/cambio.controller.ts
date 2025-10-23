import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';
import { z } from 'zod';
import { crearMovimientoYAjustarStock } from '../services/stock.service';

const DetalleSchema = z.object({
  inventarioSalidaId: z.number().int().positive(),
  inventarioEntradaId: z.number().int().positive(),
  cantidadSalida: z.number().int().positive(),
  cantidadEntrada: z.number().int().positive(),
  precioUnitarioCordoba: z.number().nonnegative()
});

const CambioSchema = z.object({
  cliente: z.string().optional(),
  motivo: z.string().optional(),
  usuario: z.string().optional(),
  observacion: z.string().optional(),
  detalles: z.array(DetalleSchema).min(1)
});

export async function list(_req: Request, res: Response) {
  const cambios = await prisma.cambio.findMany({
    include: { detalles: true },
    orderBy: { id: 'desc' }
  });
  res.json({ cambios });
}

export async function getById(req: Request, res: Response) {
  const id = Number(req.params.id);
  const cambio = await prisma.cambio.findUnique({
    where: { id },
    include: { detalles: true }
  });
  if (!cambio) return res.status(404).json({ message: 'No encontrado' });
  res.json({ cambio });
}

export async function create(req: Request, res: Response) {
  const parsed = CambioSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());
  const data = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    const cambio = await tx.cambio.create({
      data: {
        cliente: data.cliente,
        motivo: data.motivo,
        usuario: data.usuario,
        observacion: data.observacion
      }
    });

    for (const d of data.detalles) {
      await tx.detalleCambio.create({
        data: {
          cambioId: cambio.id,
          inventarioSalidaId: d.inventarioSalidaId,
          inventarioEntradaId: d.inventarioEntradaId,
          cantidadSalida: d.cantidadSalida,
          cantidadEntrada: d.cantidadEntrada,
          precioUnitarioCordoba: d.precioUnitarioCordoba as any
        }
      });

      // Salida
      await crearMovimientoYAjustarStock({
        inventarioId: d.inventarioSalidaId,
        tipoMovimientoNombre: 'Cambio Salida',
        cantidad: d.cantidadSalida,
        precioVentaUnitarioCordoba: d.precioUnitarioCordoba,
        usuario: data.usuario,
        observacion: 'Cambio salida'
      });

      // Entrada
      await crearMovimientoYAjustarStock({
        inventarioId: d.inventarioEntradaId,
        tipoMovimientoNombre: 'Cambio Entrada',
        cantidad: d.cantidadEntrada,
        precioVentaUnitarioCordoba: d.precioUnitarioCordoba,
        usuario: data.usuario,
        observacion: 'Cambio entrada'
      });
    }

    return cambio;
  });

  res.status(201).json({ cambio: result });
}
