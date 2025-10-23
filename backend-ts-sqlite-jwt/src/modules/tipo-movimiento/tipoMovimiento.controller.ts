import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';

export async function list(_req: Request, res: Response) {
  const tipos = await prisma.tipoMovimiento.findMany({ orderBy: { id: 'asc' } });
  res.json({ tipos });
}
