import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';

/**
 * 📌 Crear un nuevo tipo de movimiento
 */
export const create = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    const tipo = await prisma.tipoMovimiento.create({ data });
    res.json(tipo);
  } catch (error) {
    console.error('Error al crear tipo de movimiento:', error);
    res.status(500).json({ message: 'Error al crear tipo de movimiento', error });
  }
};

/**
 * 📌 Listar todos los tipos de movimiento
 */
export const list = async (req: Request, res: Response) => {
  try {
    const tipos = await prisma.tipoMovimiento.findMany({
      orderBy: { id: 'asc' },
    });
    res.json(tipos);
  } catch (error) {
    console.error('Error al listar tipos de movimiento:', error);
    res.status(500).json({ message: 'Error al listar tipos de movimiento', error });
  }
};

/**
 * 📌 Obtener un tipo de movimiento por ID
 */
export const get = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const tipo = await prisma.tipoMovimiento.findUnique({ where: { id } });
    if (!tipo) {
      return res.status(404).json({ message: 'Tipo de movimiento no encontrado' });
    }

    res.json(tipo);
  } catch (error) {
    console.error('Error al obtener tipo de movimiento:', error);
    res.status(500).json({ message: 'Error al obtener tipo de movimiento', error });
  }
};

/**
 * 📌 Actualizar tipo de movimiento
 */
export const update = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const data = req.body;

    const tipo = await prisma.tipoMovimiento.update({
      where: { id },
      data,
    });

    res.json(tipo);
  } catch (error) {
    console.error('Error al actualizar tipo de movimiento:', error);
    res.status(500).json({ message: 'Error al actualizar tipo de movimiento', error });
  }
};

/**
 * 📌 Eliminar tipo de movimiento
 */
export const remove = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    await prisma.tipoMovimiento.delete({ where: { id } });

    res.json({ message: 'Tipo de movimiento eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar tipo de movimiento:', error);
    res.status(500).json({ message: 'Error al eliminar tipo de movimiento', error });
  }
};
