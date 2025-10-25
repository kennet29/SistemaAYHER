import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';
import { z } from 'zod';

// Validación con Zod
const TipoCambioSchema = z.object({
  fecha: z.string().optional(),
  valor: z.number().positive(),
});

// 📋 Listar últimos 50 registros
export async function list(_req: Request, res: Response) {
  const tipos = await prisma.tipoCambio.findMany({
    orderBy: { fecha: 'desc' },
    take: 50,
  });
  res.json({ tipos });
}

// 🔍 Obtener el último tipo de cambio registrado
export async function getLatest(_req: Request, res: Response) {
  const ultimo = await prisma.tipoCambio.findFirst({
    orderBy: { fecha: 'desc' },
  });
  if (!ultimo) return res.status(404).json({ message: 'No hay registros de tipo de cambio' });
  res.json({ tipoCambio: ultimo });
}

// ➕ Crear un nuevo registro de tipo de cambio
export async function create(req: Request, res: Response) {
  const parsed = TipoCambioSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());

  const data = parsed.data;
  const fecha = data.fecha ? new Date(data.fecha) : new Date();

  // Verificar si ya existe uno registrado en el mismo día
  const inicioDia = new Date(fecha);
  inicioDia.setHours(0, 0, 0, 0);
  const finDia = new Date(fecha);
  finDia.setHours(23, 59, 59, 999);

  const existe = await prisma.tipoCambio.findFirst({
    where: {
      fecha: {
        gte: inicioDia,
        lte: finDia,
      },
    },
  });

  if (existe) {
    return res.status(409).json({
      message: 'Ya existe un tipo de cambio registrado para hoy.',
      tipoCambio: existe,
    });
  }

  const nuevo = await prisma.tipoCambio.create({
    data: {
      fecha,
      valor: data.valor as any,
    },
  });

  res.status(201).json({ tipoCambio: nuevo });
}
