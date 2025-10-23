import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';
import { z } from 'zod';

// Validación con Zod
const TipoCambioSchema = z.object({
  fecha: z.string().optional(),
  valor: z.number().positive()
});

// Listar todos
export async function list(_req: Request, res: Response) {
  const tipos = await prisma.tipoCambio.findMany({
    orderBy: { fecha: 'desc' },
    take: 50
  });
  res.json({ tipos });
}

// Último tipo de cambio registrado
export async function getLatest(_req: Request, res: Response) {
  const ultimo = await prisma.tipoCambio.findFirst({
    orderBy: { fecha: 'desc' }
  });
  if (!ultimo) return res.status(404).json({ message: 'No hay registros' });
  res.json({ tipoCambio: ultimo });
}

// Crear nuevo
export async function create(req: Request, res: Response) {
  const parsed = TipoCambioSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());

  const data = parsed.data;
  const nuevo = await prisma.tipoCambio.create({
    data: {
      fecha: data.fecha ? new Date(data.fecha) : new Date(),
      valor: data.valor as any
    }
  });

  res.status(201).json({ tipoCambio: nuevo });
}
