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
