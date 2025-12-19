import { Request, Response } from "express";
import { prisma } from "../../db/prisma";
import fetch from "node-fetch";

async function getTipoCambio(): Promise<number> {
  try {
    const res = await fetch("http://localhost:4000/api/tipo-cambio/latest");
    if (!res.ok) throw new Error();
    const data: any = await res.json();
    return Number(data.tipoCambio?.valor ?? 36.62);
  } catch {
    console.warn("Tipo de cambio no disponible, usando 36.62");
    return 36.62;
  }
}

export const list = async (_req: Request, res: Response) => {
  try {
    const movimientos = await prisma.movimientoInventario.findMany({
      include: { inventario: true, tipoMovimiento: true },
      orderBy: { id: "desc" },
    });
    res.json(movimientos);
  } catch (error) {
    console.error("Error al listar movimientos:", error);
    res.status(500).json({ message: "Error al listar movimientos", error });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const { tipoMovimientoId, observacion, usuario, detalles, tipoCambioValor: tcBody } = req.body;

    if (!tipoMovimientoId || !Array.isArray(detalles) || detalles.length === 0) {
      return res.status(400).json({ message: "Datos incompletos" });
    }

    const tipoCambioValor = tcBody ? Number(tcBody) : await getTipoCambio();

    const tipo = await prisma.tipoMovimiento.findUnique({ where: { id: tipoMovimientoId } });
    if (!tipo) return res.status(404).json({ message: "Tipo de movimiento no encontrado" });

    const movimientosCreados = [] as any[];

    for (const d of detalles) {
      const costoD = d.costoUnitarioDolar != null
        ? Number(d.costoUnitarioDolar)
        : d.costoUnitarioCordoba != null && tipoCambioValor
          ? Number(d.costoUnitarioCordoba) / tipoCambioValor
          : null;
      const costoC = d.costoUnitarioCordoba != null
        ? Number(d.costoUnitarioCordoba)
        : costoD != null && tipoCambioValor
          ? Number(costoD) * tipoCambioValor
          : null;

      const mov = await prisma.movimientoInventario.create({
        data: {
          inventarioId: d.inventarioId,
          tipoMovimientoId,
          cantidad: d.cantidad,
          observacion,
          usuario,
          tipoCambioValor,
          costoUnitarioDolar: costoD,
          costoUnitarioCordoba: costoC,
        },
        include: { inventario: true, tipoMovimiento: true },
      });
      movimientosCreados.push(mov);

      if (tipo.afectaStock) {
        await prisma.inventario.update({
          where: { id: d.inventarioId },
          data: {
            stockActual: {
              [tipo.esEntrada ? "increment" : "decrement"]: d.cantidad,
            },
          },
        });
      }
    }

    res.status(201).json({ message: "Movimiento registrado", movimientosCreados });
  } catch (error) {
    console.error("Error al crear movimiento:", error);
    res.status(500).json({ message: "Error al crear movimiento", error });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inv\u00e1lido" });

    const body = req.body || {};
    const current = await prisma.movimientoInventario.findUnique({
      where: { id },
      include: { tipoMovimiento: true },
    });
    if (!current) return res.status(404).json({ message: "Movimiento no encontrado" });

    const nuevoTipoId = body.tipoMovimientoId ?? current.tipoMovimientoId;
    const nuevoTipo =
      nuevoTipoId === current.tipoMovimientoId
        ? current.tipoMovimiento
        : await prisma.tipoMovimiento.findUnique({ where: { id: nuevoTipoId } });
    if (!nuevoTipo) return res.status(404).json({ message: "Tipo de movimiento no encontrado" });

    const cantidad = body.cantidad != null ? Number(body.cantidad) : current.cantidad;
    if (!(cantidad > 0)) return res.status(400).json({ message: "Cantidad debe ser mayor a 0" });

    const tipoCambioValor =
      body.tipoCambioValor != null
        ? Number(body.tipoCambioValor)
        : current.tipoCambioValor != null
          ? Number(current.tipoCambioValor)
          : await getTipoCambio();
    if (!(tipoCambioValor > 0)) return res.status(400).json({ message: "tipoCambioValor inv\u00e1lido" });

    const costoUsd = body.costoUnitarioDolar != null
      ? Number(body.costoUnitarioDolar)
      : body.costoUnitarioCordoba != null
        ? Number(body.costoUnitarioCordoba) / tipoCambioValor
        : current.costoUnitarioDolar != null
          ? Number(current.costoUnitarioDolar)
          : current.costoUnitarioCordoba != null
            ? Number(current.costoUnitarioCordoba) / tipoCambioValor
            : 0;

    const costoCordoba = body.costoUnitarioCordoba != null
      ? Number(body.costoUnitarioCordoba)
      : Number((costoUsd || 0) * tipoCambioValor);

    const stockPrevio = current.tipoMovimiento?.afectaStock
      ? (current.tipoMovimiento.esEntrada ? current.cantidad : -current.cantidad)
      : 0;
    const stockNuevo = nuevoTipo.afectaStock ? (nuevoTipo.esEntrada ? cantidad : -cantidad) : 0;
    const deltaStock = stockNuevo - stockPrevio;

    const movimientoActualizado = await prisma.$transaction(async (tx) => {
      if (deltaStock !== 0) {
        await tx.inventario.update({
          where: { id: current.inventarioId },
          data: { stockActual: { increment: deltaStock } },
        });
      }

      return tx.movimientoInventario.update({
        where: { id },
        data: {
          tipoMovimientoId: nuevoTipoId,
          cantidad,
          observacion: body.observacion ?? current.observacion,
          usuario: body.usuario ?? current.usuario,
          tipoCambioValor,
          costoUnitarioDolar: costoUsd,
          costoUnitarioCordoba: costoCordoba,
        },
        include: { inventario: true, tipoMovimiento: true },
      });
    });

    res.json({ movimiento: movimientoActualizado, deltaStock });
  } catch (error) {
    console.error("Error al actualizar movimiento:", error);
    res.status(500).json({ message: "Error al actualizar movimiento", error });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "ID inv\u00e1lido" });

    const current = await prisma.movimientoInventario.findUnique({
      where: { id },
      include: { tipoMovimiento: true },
    });
    if (!current) return res.status(404).json({ message: "Movimiento no encontrado" });

    const deltaStock = current.tipoMovimiento?.afectaStock
      ? (current.tipoMovimiento.esEntrada ? -current.cantidad : current.cantidad)
      : 0;

    await prisma.$transaction(async (tx) => {
      if (deltaStock !== 0) {
        await tx.inventario.update({
          where: { id: current.inventarioId },
          data: { stockActual: { increment: deltaStock } },
        });
      }
      await tx.movimientoInventario.delete({ where: { id } });
    });

    res.json({ message: "Movimiento eliminado", deltaStock });
  } catch (error) {
    console.error("Error al eliminar movimiento:", error);
    res.status(500).json({ message: "Error al eliminar movimiento", error });
  }
};
