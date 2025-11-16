"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crearMovimientosYAjustarStockBatch = crearMovimientosYAjustarStockBatch;
exports.crearMovimientoYAjustarStock = crearMovimientoYAjustarStock;
/**
 * Inserta movimientos en batch y aplica los decrementos/ incrementos de stock agrupados.
 * Debe ejecutarse SIEMPRE dentro del mismo `tx` que la venta.
 */
async function crearMovimientosYAjustarStockBatch(args) {
    const { tx, movimientos, decrementarPorInventario } = args;
    // 1) createMany movimientos (si hay)
    if (movimientos.length) {
        await tx.movimientoInventario.createMany({
            data: movimientos.map((m) => ({
                inventarioId: m.inventarioId,
                tipoMovimientoId: m.tipoMovimientoId,
                cantidad: m.cantidad,
                precioVentaUnitarioCordoba: m.precioVentaUnitarioCordoba,
                tipoCambioValor: m.tipoCambioValor,
                usuario: m.usuario ?? null,
                observacion: m.observacion ?? null,
            })),
        });
    }
    // 2) Ajustes de stock agrupados
    for (const [inventarioId, cant] of decrementarPorInventario) {
        if (cant > 0) {
            // salida: decrement
            await tx.inventario.update({
                where: { id: inventarioId },
                data: { stockActual: { decrement: cant } },
            });
        }
        else if (cant < 0) {
            // entrada: increment (por completitud)
            await tx.inventario.update({
                where: { id: inventarioId },
                data: { stockActual: { increment: Math.abs(cant) } },
            });
        }
    }
}
/**
 * Crea un único movimiento y ajusta el stock del producto según el tipo de movimiento.
 * Debe ejecutarse dentro del mismo `tx` que la operación llamante.
 */
async function crearMovimientoYAjustarStock(args) {
    const { tx, inventarioId, tipoMovimientoNombre, cantidad, precioVentaUnitarioCordoba, tipoCambioValor, usuario, observacion, } = args;
    // 1) Obtener tipoMovimiento por nombre
    const tipo = await tx.tipoMovimiento.findUnique({
        where: { nombre: tipoMovimientoNombre },
        select: { id: true, esEntrada: true },
    });
    if (!tipo)
        throw new Error("TipoMovimiento no encontrado");
    // 2) Crear movimiento
    const movimiento = await tx.movimientoInventario.create({
        data: {
            inventarioId,
            tipoMovimientoId: tipo.id,
            cantidad,
            precioVentaUnitarioCordoba: precioVentaUnitarioCordoba,
            tipoCambioValor: tipoCambioValor,
            usuario: usuario ?? null,
            observacion: observacion ?? null,
        },
        include: { tipoMovimiento: true },
    });
    // 3) Ajustar stock
    if (tipo.esEntrada) {
        await tx.inventario.update({
            where: { id: inventarioId },
            data: { stockActual: { increment: cantidad } },
        });
    }
    else {
        await tx.inventario.update({
            where: { id: inventarioId },
            data: { stockActual: { decrement: cantidad } },
        });
    }
    return { movimiento };
}
