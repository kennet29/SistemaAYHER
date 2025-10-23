import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Crea un movimiento de inventario y ajusta el stock del ítem
 * en una única transacción. Reemplaza los triggers de DB.
 */
export async function crearMovimientoYAjustarStock(args: {
  inventarioId: number;
  tipoMovimientoNombre: string; // 'Entrada', 'Salida', ...
  cantidad: number;
  costoUnitarioCordoba?: string | number;  // Decimal compatible
  precioVentaUnitarioCordoba?: string | number;
  tipoCambioValor?: string | number;
  usuario?: string;
  observacion?: string;
}) {
  const {
    inventarioId,
    tipoMovimientoNombre,
    cantidad,
    costoUnitarioCordoba,
    precioVentaUnitarioCordoba,
    tipoCambioValor,
    usuario,
    observacion
  } = args;

  return await prisma.$transaction(async (tx) => {
    const tipo = await tx.tipoMovimiento.findUnique({
      where: { nombre: tipoMovimientoNombre }
    });
    if (!tipo) {
      throw new Error(`TipoMovimiento no encontrado: ${tipoMovimientoNombre}`);
    }

    // Crear movimiento
    const mov = await tx.movimientoInventario.create({
      data: {
        inventarioId,
        tipoMovimientoId: tipo.id,
        cantidad,
        costoUnitarioCordoba: costoUnitarioCordoba as any,
        precioVentaUnitarioCordoba: precioVentaUnitarioCordoba as any,
        tipoCambioValor: tipoCambioValor as any,
        usuario,
        observacion
      }
    });

    // Ajustar stock si corresponde
    if (tipo.afectaStock) {
      const delta = tipo.esEntrada ? cantidad : -cantidad;
      await tx.inventario.update({
        where: { id: inventarioId },
        data: { stockActual: { increment: delta } }
      });
    }

    return mov;
  });
}
