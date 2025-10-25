import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';

/**
 * 📌 Obtener la configuración actual
 * Solo hay un registro en la tabla Configuracion
 */
export const getConfiguracion = async (req: Request, res: Response) => {
  try {
    const config = await prisma.configuracion.findFirst();

    if (!config) {
      return res.status(404).json({ message: 'No hay configuración registrada' });
    }

    res.json(config);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ message: 'Error al obtener configuración', error });
  }
};

/**
 * 📌 Crear o actualizar configuración
 * Si no existe, la crea; si ya existe, la actualiza.
 */
export const upsertConfiguracion = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    // 🔹 Verificar si ya existe una configuración
    const existente = await prisma.configuracion.findFirst();

    let config;
    if (existente) {
      config = await prisma.configuracion.update({
        where: { id: existente.id },
        data,
      });
    } else {
      config = await prisma.configuracion.create({ data });
    }

    res.json(config);
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    res.status(500).json({ message: 'Error al guardar configuración', error });
  }
};

/**
 * 📌 Eliminar configuración (opcional)
 * No siempre se usa, pero se deja disponible por si se requiere resetear.
 */
export const deleteConfiguracion = async (req: Request, res: Response) => {
  try {
    const existente = await prisma.configuracion.findFirst();

    if (!existente) {
      return res.status(404).json({ message: 'No hay configuración para eliminar' });
    }

    await prisma.configuracion.delete({ where: { id: existente.id } });

    res.json({ message: 'Configuración eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar configuración:', error);
    res.status(500).json({ message: 'Error al eliminar configuración', error });
  }
};
