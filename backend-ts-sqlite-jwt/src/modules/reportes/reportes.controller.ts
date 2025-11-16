import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
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

// ===============================
// 📊 Cartera de Clientes (totales por cliente: Crédito vs Contado)
// ===============================
export async function carteraClientes(_req: Request, res: Response) {
  try {
    const rows = await prisma.venta.groupBy({
      by: ['clienteId', 'tipoPago'],
      where: { clienteId: { not: null } },
      _sum: { totalCordoba: true, totalDolar: true },
    });

    const clienteIds = Array.from(new Set(rows.map((r) => r.clienteId as number))).filter(Boolean) as number[];
    type ClienteCredito = {
      id: number;
      nombre: string | null;
      empresa: string | null;
      creditoHabilitado: boolean;
      creditoMaximoCordoba: Prisma.Decimal | number | null;
      creditoMaximoDolar: Prisma.Decimal | number | null;
    };

    const clientes = await prisma.cliente.findMany({
      where: { id: { in: clienteIds } },
      select: {
        id: true,
        nombre: true,
        empresa: true,
        creditoHabilitado: true,
        creditoMaximoCordoba: true,
        creditoMaximoDolar: true,
      },
    });
    const mapCliente = new Map<number, ClienteCredito>();
    for (const c of clientes) mapCliente.set(c.id, c as any);

    const acc = new Map<number, any>();
    for (const r of rows) {
      const id = r.clienteId as number;
      if (!acc.has(id)) {
        const c = mapCliente.get(id);
        acc.set(id, {
          clienteId: id,
          clienteNombre: (c?.nombre || c?.empresa || `Cliente ${id}`) as string,
          totalContadoCordoba: 0,
          totalCreditoCordoba: 0,
          totalContadoDolar: 0,
          totalCreditoDolar: 0,
          creditoHabilitado: c?.creditoHabilitado ?? false,
          creditoMaximoCordoba: Number(c?.creditoMaximoCordoba ?? 0),
          creditoMaximoDolar: Number(c?.creditoMaximoDolar ?? 0),
        });
      }
      const item = acc.get(id);
      const sumC$ = Number(r._sum.totalCordoba || 0);
      const sumUS$ = Number(r._sum.totalDolar || 0);
      if (r.tipoPago === 'CONTADO') {
        item.totalContadoCordoba += sumC$;
        item.totalContadoDolar += sumUS$;
      } else if (r.tipoPago === 'CREDITO') {
        item.totalCreditoCordoba += sumC$;
        item.totalCreditoDolar += sumUS$;
      }
    }

    const data = Array.from(acc.values()).sort((a, b) => (b.totalContadoCordoba + b.totalCreditoCordoba) - (a.totalContadoCordoba + a.totalCreditoCordoba));
    res.json({ data });
  } catch (err) {
    console.error('❌ Error en carteraClientes:', err);
    res.status(500).json({ message: 'Error interno al calcular cartera de clientes' });
  }
}
