import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';
import { z } from 'zod';

const InvCreateSchema = z.object({
  numeroParte: z.string().min(1),
  marcaId: z.number().int().positive(),
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  stockActual: z.number().int().optional(),
  costoPromedioCordoba: z.number().optional(),
  precioVentaPromedioCordoba: z.number().optional(),
  precioVentaSugeridoCordoba: z.number().optional(),
  codigoSustituto: z.string().optional().nullable(),
  marcaSustitutoId: z.number().int().optional().nullable()
});

export async function list(_req: Request, res: Response) {
  const items = await prisma.inventario.findMany({
    include: { marca: true },
    orderBy: [{ marcaId: 'asc' }, { numeroParte: 'asc' }]
  });
  res.json({ items });
}

export async function create(req: Request, res: Response) {
  const parsed = InvCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());

  const data = parsed.data as any;
  const item = await prisma.inventario.create({ data });
  res.status(201).json({ item });
}

export async function getById(req: Request, res: Response) {
  const id = Number(req.params.id);
  const item = await prisma.inventario.findUnique({
    where: { id },
    include: { marca: true, sustituto: true }
  });
  if (!item) return res.status(404).json({ message: 'No encontrado' });
  res.json({ item });
}

export async function update(req: Request, res: Response) {
  const id = Number(req.params.id);
  const parsed = InvCreateSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());

  const item = await prisma.inventario.update({ where: { id }, data: parsed.data as any });
  res.json({ item });
}

export async function remove(req: Request, res: Response) {
  const id = Number(req.params.id);
  await prisma.inventario.delete({ where: { id } });
  res.json({ ok: true });
}

// --------- REPORTES / CONSULTAS (equivalentes a VIEW y SP) ---------

export async function viewConSustituto(_req: Request, res: Response) {
  const rows = await prisma.inventario.findMany({
    select: {
      id: true,
      numeroParte: true,
      stockActual: true,
      marca: { select: { nombre: true } },
      sustituto: {
        select: {
          numeroParte: true,
          stockActual: true,
          marca: { select: { nombre: true } }
        }
      }
    }
  });

  const mapped = rows.map(r => ({
    idProducto: r.id,
    numeroParte: r.numeroParte,
    marca: r.marca?.nombre ?? null,
    stockActual: r.stockActual,
    codigoSustituto: r.sustituto?.numeroParte ?? null,
    marcaSustituto: r.sustituto?.marca?.nombre ?? null,
    stockSustituto: r.sustituto?.stockActual ?? null
  }));

  res.json({ data: mapped });
}

export async function buscarProductoDisponible(req: Request, res: Response) {
  const numeroParte = String(req.query.numeroParte ?? '');
  const marcaId = Number(req.query.marcaId ?? 0);

  const i = await prisma.inventario.findFirst({
    where: { numeroParte, marcaId },
    include: {
      marca: true,
      sustituto: { include: { marca: true } }
    }
  });

  if (!i) return res.status(404).json({ message: 'Producto no encontrado' });

  const disponible = i.stockActual > 0 ? i : i.sustituto;
  if (!disponible) {
    return res.status(404).json({ message: 'Sin stock ni sustituto disponible' });
  }

  res.json({
    numeroParteDisponible: disponible.numeroParte,
    marcaDisponible: disponible.marca?.nombre ?? null,
    stockDisponible: disponible.stockActual
  });
}
