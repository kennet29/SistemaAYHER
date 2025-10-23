import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';
import { z } from 'zod';

const MarcaSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional()
});

export async function list(_req: Request, res: Response) {
  const marcas = await prisma.marca.findMany({ orderBy: { nombre: 'asc' } });
  res.json({ marcas });
}

export async function create(req: Request, res: Response) {
  const parsed = MarcaSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());

  const marca = await prisma.marca.create({ data: parsed.data });
  res.status(201).json({ marca });
}

export async function getById(req: Request, res: Response) {
  const id = Number(req.params.id);
  const marca = await prisma.marca.findUnique({ where: { id } });
  if (!marca) return res.status(404).json({ message: 'No encontrada' });
  res.json({ marca });
}

export async function update(req: Request, res: Response) {
  const id = Number(req.params.id);
  const parsed = MarcaSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());

  const marca = await prisma.marca.update({ where: { id }, data: parsed.data });
  res.json({ marca });
}

export async function remove(req: Request, res: Response) {
  const id = Number(req.params.id);
  await prisma.marca.delete({ where: { id } });
  res.json({ ok: true });
}
