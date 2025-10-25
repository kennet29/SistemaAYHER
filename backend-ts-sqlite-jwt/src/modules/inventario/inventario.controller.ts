import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';
import { z } from 'zod';

// 📦 Esquema de validación con los nuevos campos
const InvCreateSchema = z.object({
  numeroParte: z.string().min(1),
  marcaId: z.number().int().positive(),
  categoriaId: z.number().int().positive(),
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  stockActual: z.number().int().optional().default(0),
  costoPromedioCordoba: z.number().optional().default(0),
  precioVentaPromedioCordoba: z.number().optional().default(0),
  precioVentaSugeridoCordoba: z.number().optional().default(0),
  codigoSustituto: z.string().optional().nullable(),
  marcaSustitutoId: z.number().int().optional().nullable()
});

// 🧮 Función auxiliar para obtener el tipo de cambio más reciente
async function getTipoCambioActual(): Promise<number> {
  const tipo = await prisma.tipoCambio.findFirst({
    orderBy: { fecha: 'desc' },
  });
  return Number(tipo?.valor ?? 36.5); // Valor por defecto si no hay registros
}

// 📋 LISTAR INVENTARIO
export async function list(_req: Request, res: Response) {
  const items = await prisma.inventario.findMany({
    include: { marca: true, categoria: true },
    orderBy: [{ marcaId: 'asc' }, { numeroParte: 'asc' }]
  });
  res.json({ items });
}

// ➕ CREAR PRODUCTO
export async function create(req: Request, res: Response) {
  const parsed = InvCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());

  const data = parsed.data as any;
  const tipoCambio = await getTipoCambioActual();

  const item = await prisma.inventario.create({
    data: {
      ...data,
      costoPromedioDolar: data.costoPromedioCordoba / tipoCambio,
      precioVentaPromedioDolar: data.precioVentaPromedioCordoba / tipoCambio,
      precioVentaSugeridoDolar: data.precioVentaSugeridoCordoba / tipoCambio,
    },
    include: { marca: true, categoria: true }
  });

  res.status(201).json({ item });
}

// 🔍 OBTENER POR ID
export async function getById(req: Request, res: Response) {
  const id = Number(req.params.id);
  const item = await prisma.inventario.findUnique({
    where: { id },
    include: { marca: true, categoria: true, sustituto: true }
  });
  if (!item) return res.status(404).json({ message: 'No encontrado' });
  res.json({ item });
}

// ✏️ ACTUALIZAR PRODUCTO
export async function update(req: Request, res: Response) {
  const id = Number(req.params.id);
  const parsed = InvCreateSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());

  const data = parsed.data as any;
  const tipoCambio = await getTipoCambioActual();

  const item = await prisma.inventario.update({
    where: { id },
    data: {
      ...data,
      costoPromedioDolar: data.costoPromedioCordoba
        ? data.costoPromedioCordoba / tipoCambio
        : undefined,
      precioVentaPromedioDolar: data.precioVentaPromedioCordoba
        ? data.precioVentaPromedioCordoba / tipoCambio
        : undefined,
      precioVentaSugeridoDolar: data.precioVentaSugeridoCordoba
        ? data.precioVentaSugeridoCordoba / tipoCambio
        : undefined,
    },
    include: { marca: true, categoria: true }
  });

  res.json({ item });
}

// ❌ ELIMINAR PRODUCTO
export async function remove(req: Request, res: Response) {
  const id = Number(req.params.id);
  await prisma.inventario.delete({ where: { id } });
  res.json({ ok: true });
}

// --------- REPORTES / CONSULTAS (equivalentes a VIEW y SP) ---------

// 🧾 Vista combinada con sustitutos
export async function viewConSustituto(_req: Request, res: Response) {
  const rows = await prisma.inventario.findMany({
    select: {
      id: true,
      numeroParte: true,
      stockActual: true,
      marca: { select: { nombre: true } },
      categoria: { select: { nombre: true } },
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
    categoria: r.categoria?.nombre ?? null,
    stockActual: r.stockActual,
    codigoSustituto: r.sustituto?.numeroParte ?? null,
    marcaSustituto: r.sustituto?.marca?.nombre ?? null,
    stockSustituto: r.sustituto?.stockActual ?? null
  }));

  res.json({ data: mapped });
}

// 🔍 Buscar producto o su sustituto disponible
export async function buscarProductoDisponible(req: Request, res: Response) {
  const numeroParte = String(req.query.numeroParte ?? '');
  const marcaId = Number(req.query.marcaId ?? 0);

  const i = await prisma.inventario.findFirst({
    where: { numeroParte, marcaId },
    include: {
      marca: true,
      categoria: true,
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
