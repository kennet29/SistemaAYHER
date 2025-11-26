import { Request, Response } from "express";
import { prisma } from "../../db/prisma";

// Listar todos los métodos de pago
export async function list(_req: Request, res: Response) {
  try {
    const metodos = await prisma.metodoPago.findMany({
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    });
    res.json({ metodos });
  } catch (error: any) {
    console.error("Error al listar métodos de pago:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}

// Crear método de pago
export async function create(req: Request, res: Response) {
  try {
    const { nombre, tipoCuenta, banco, numeroCuenta, titular, moneda, activo, observaciones } = req.body;

    if (!nombre || !tipoCuenta) {
      return res.status(400).json({ message: "Nombre y tipo de cuenta son requeridos" });
    }

    const metodo = await prisma.metodoPago.create({
      data: {
        nombre,
        tipoCuenta,
        banco,
        numeroCuenta,
        titular,
        moneda: moneda || "NIO",
        activo: activo !== undefined ? activo : true,
        observaciones,
      },
    });

    res.status(201).json({ metodo });
  } catch (error: any) {
    console.error("Error al crear método de pago:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}

// Actualizar método de pago
export async function update(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const { nombre, tipoCuenta, banco, numeroCuenta, titular, moneda, activo, observaciones } = req.body;

    const metodo = await prisma.metodoPago.update({
      where: { id },
      data: {
        nombre,
        tipoCuenta,
        banco,
        numeroCuenta,
        titular,
        moneda,
        activo,
        observaciones,
      },
    });

    res.json({ metodo });
  } catch (error: any) {
    console.error("Error al actualizar método de pago:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}

// Eliminar método de pago
export async function remove(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    await prisma.metodoPago.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error: any) {
    console.error("Error al eliminar método de pago:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}
