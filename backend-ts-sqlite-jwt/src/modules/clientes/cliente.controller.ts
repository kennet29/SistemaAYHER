import { Request, Response } from "express";
import { prisma } from "../../db/prisma";
import { z } from "zod";

//// =============================
// ✅ Validación Zod para Cliente
//// =============================

const optionalEmail = z
  .string()
  .email("Correo inválido")
  .or(z.literal(""))
  .optional();

const clienteSchema = z.object({
  tipoCliente: z.string().default("PERSONA"),
  nombre: z.string().min(2, "El nombre es obligatorio"),
  empresa: z.string().optional(),
  nombreContacto: z.string().optional(),
  ruc: z.string().optional(),
  razonSocial: z.string().optional(),
  telefono1: z.string().optional(),
  telefono2: z.string().optional(),
  correo1: optionalEmail,
  correo2: optionalEmail,
  direccion: z.string().optional(),
  observacion: z.string().optional(),
  estado: z.string().default("ACTIVO"),
});


//// =============================
// ✅ Crear nuevo cliente
//// =============================

export const createCliente = async (req: Request, res: Response) => {
  try {
    const parsed = clienteSchema.safeParse(req.body);
    if (!parsed.success) {
      console.log("BODY CLIENTE:", req.body);
      console.log("ZOD ERROR:", parsed.error?.errors);
      return res.status(400).json({
        message: "Error de validación",
        errors: parsed.error.errors,
      });
      
    }

    const cliente = await prisma.cliente.create({
      data: parsed.data,
    });

    return res.status(201).json(cliente);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al crear cliente" });
  }
};

//// =============================
// ✅ Obtener todos los clientes
//// =============================

export const getClientes = async (req: Request, res: Response) => {
  try {
    const clientes = await prisma.cliente.findMany({
      orderBy: { id: "desc" },
    });

    return res.json(clientes);
  } catch (err) {
    return res.status(500).json({ message: "Error al obtener clientes" });
  }
};

//// =============================
// ✅ Obtener cliente por ID
//// =============================

export const getClienteById = async (req: Request, res: Response) => {
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    return res.json(cliente);
  } catch (err) {
    return res.status(500).json({ message: "Error al obtener cliente" });
  }
};

//// =============================
// ✅ Buscar clientes (autocomplete)
//// =============================

export const searchClientes = async (req: Request, res: Response) => {
  try {
    const q = req.query.q?.toString() || "";

    if (!q) return res.json([]);

    const clientes = await prisma.cliente.findMany({
      where: {
        OR: [
          { nombre: { contains: q, mode: "insensitive" } },
          { empresa: { contains: q, mode: "insensitive" } },
          { ruc: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 20,
    });

    return res.json(clientes);
  } catch (err) {
    return res.status(500).json({ message: "Error al buscar clientes" });
  }
};

//// =============================
// ✅ Actualizar cliente
//// =============================

export const updateCliente = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const parsed = clienteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Error de validación",
        errors: parsed.error.errors,
      });
    }

    const cliente = await prisma.cliente.update({
      where: { id: Number(id) },
      data: parsed.data,
    });

    return res.json(cliente);
  } catch (err) {
    return res.status(500).json({ message: "Error al actualizar cliente" });
  }
};

//// =============================
// ✅ Eliminar cliente
//// =============================

export const deleteCliente = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const exists = await prisma.cliente.findUnique({
      where: { id: Number(id) },
    });

    if (!exists) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    await prisma.cliente.delete({
      where: { id: Number(id) },
    });

    return res.json({ message: "Cliente eliminado correctamente" });
  } catch (err) {
    return res.status(500).json({ message: "Error al eliminar cliente" });
  }
};
