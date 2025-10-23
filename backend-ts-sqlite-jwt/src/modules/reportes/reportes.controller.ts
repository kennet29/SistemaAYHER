import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';

export async function kardex(req: Request, res: Response) {
  const inventarioId = Number(req.params.inventarioId);
  if (isNaN(inventarioId)) return res.status(400).json({ message: 'ID inválido' });

  // Buscar producto
  const producto = await prisma.inventario.findUnique({
    where: { id: inventarioId },
    include: { marca: true }
  });
  if (!producto) return res.status(404).json({ message: 'Producto no encontrado' });

  // Obtener movimientos
  const movimientos = await prisma.movimientoInventario.findMany({
    where: { inventarioId },
    include: { tipoMovimiento: true },
    orderBy: { fecha: 'asc' }
  });

  // Calcular saldo acumulado
  let saldo = 0;
  const data = movimientos.map((m) => {
    saldo += m.tipoMovimiento.esEntrada ? m.cantidad : -m.cantidad;
    return {
      fecha: m.fecha,
      tipo: m.tipoMovimiento.nombre,
      cantidad: m.cantidad,
      afectaStock: m.tipoMovimiento.afectaStock,
      esEntrada: m.tipoMovimiento.esEntrada,
      costoUnitario: m.costoUnitarioCordoba,
      precioUnitario: m.precioVentaUnitarioCordoba,
      usuario: m.usuario,
      observacion: m.observacion,
      saldo
    };
  });

  res.json({
    producto: {
      id: producto.id,
      numeroParte: producto.numeroParte,
      nombre: producto.nombre,
      marca: producto.marca?.nombre,
      stockActual: producto.stockActual
    },
    movimientos: data
  });
}
