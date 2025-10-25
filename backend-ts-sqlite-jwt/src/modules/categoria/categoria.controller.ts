import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';
import { z } from 'zod';

// 🧩 Validación con Zod
const CategoriaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  descripcion: z.string().optional().nullable(),
});

// 📋 Listar todas las categorías
export async function list(_req: Request, res: Response) {
  const categorias = await prisma.categoria.findMany({
    orderBy: { nombre: 'asc' },
    include: {
      _count: {
        select: { inventarios: true }, // cuántos productos tiene cada categoría
      },
    },
  });

  res.json({ categorias });
}

// 🔍 Obtener categoría por ID
export async function getById(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: 'ID inválido' });

  const categoria = await prisma.categoria.findUnique({
    where: { id },
    include: { inventarios: true },
  });

  if (!categoria) return res.status(404).json({ message: 'Categoría no encontrada' });
  res.json({ categoria });
}

// ➕ Crear nueva categoría
export async function create(req: Request, res: Response) {
  const parsed = CategoriaSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());

  const data = parsed.data;

  // Evitar duplicados por nombre
  const existente = await prisma.categoria.findUnique({
    where: { nombre: data.nombre },
  });
  if (existente) return res.status(409).json({ message: 'Ya existe una categoría con ese nombre' });

  const nueva = await prisma.categoria.create({ data });
  res.status(201).json({ categoria: nueva });
}

// ✏️ Actualizar categoría existente
export async function update(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: 'ID inválido' });

  const parsed = CategoriaSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());

  const data = parsed.data;

  const categoria = await prisma.categoria.update({
    where: { id },
    data,
  });

  res.json({ categoria });
}

// ❌ Eliminar categoría (solo si no tiene productos)
export async function remove(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: 'ID inválido' });

  const categoria = await prisma.categoria.findUnique({
    where: { id },
    include: { inventarios: true },
  });

  if (!categoria) return res.status(404).json({ message: 'Categoría no encontrada' });
  if (categoria.inventarios.length > 0) {
    return res.status(400).json({ message: 'No se puede eliminar una categoría con productos asociados' });
  }

  await prisma.categoria.delete({ where: { id } });
  res.json({ ok: true, message: 'Categoría eliminada correctamente' });
}
