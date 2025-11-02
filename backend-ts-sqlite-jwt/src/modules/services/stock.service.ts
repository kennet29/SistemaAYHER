import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Crea movimiento y ajusta stock.
 * Si recibe "tx", usa la transacción existente.
 * Si no, crea una nueva transacción.
 */
export async function crearMovimientoYAjustarStock(args: {
  inventarioId: number;
  tipoMovimientoNombre: string;
  cantidad: number;
  costoUnitarioCordoba?: string | number;
  precioVentaUnitarioCordoba?: string | number;
  tipoCambioValor?: string | number;
  usuario?: string;
  observacion?: string;
  tx?: any; // ✅ tx permitido
}) {
  const {
    inventarioId,
    tipoMovimientoNombre,
    cantidad,
    costoUnitarioCordoba,
    precioVentaUnitarioCordoba,
    tipoCambioValor,
    usuario,
    observacion,
    tx,
  } = args;

  const db = tx ?? prisma; // ✅ Usa tx si viene, sino prisma normal

  const exec = async (trx: any) => {
    // ✅ Buscar tipo movimiento
    const tipo = await trx.tipoMovimiento.findUnique({
      where: { nombre: tipoMovimientoNombre },
    });

    if (!tipo) {
      throw new Error(`❌ TipoMovimiento no encontrado: ${tipoMovimientoNombre}`);
    }

    // ✅ Crear movimiento
    const movimiento = await trx.movimientoInventario.create({
      data: {
        inventarioId,
        tipoMovimientoId: tipo.id,
        cantidad,
        costoUnitarioCordoba: costoUnitarioCordoba as any,
        precioVentaUnitarioCordoba: precioVentaUnitarioCordoba as any,
        tipoCambioValor: tipoCambioValor as any,
        usuario,
        observacion,
      },
    });

    // ✅ Ajustar stock
    if (tipo.afectaStock) {
      const factor = tipo.esEntrada ? 1 : -1;
      await trx.inventario.update({
        where: { id: inventarioId },
        data: {
          stockActual: { increment: factor * cantidad },
        },
      });
    }

    const inventario = await trx.inventario.findUnique({
      where: { id: inventarioId },
      select: { id: true, numeroParte: true, marcaId: true, stockActual: true },
    });

    return { movimiento, inventario };
  };

  // ✅ Si ya hay transacción, usa esa
  if (tx) {
    return await exec(tx);
  }

  // ✅ Si no hay, crea una nueva transacción
  return await prisma.$transaction(exec);
}
