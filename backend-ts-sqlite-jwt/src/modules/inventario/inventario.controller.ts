import { Request, Response } from "express";
import { prisma } from "../../db/prisma";
import { z } from "zod";
import fetch from "node-fetch"; // npm i node-fetch

// ===============================
// 📦 Esquema de validación
// ===============================
const InvCreateSchema = z.object({
  numeroParte: z.string().min(1),
  marcaId: z.number().int().positive(),
  categoriaId: z.number().int().positive(),
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  stockActual: z.number().int().optional().default(0),
  costoPromedioCordoba: z.number().optional().default(0),
  precioVentaPromedioCordoba: z.number().optional().default(0),
  precioVentaSugeridoCordoba: z.number().optional().default(0),
  codigoSustituto: z.string().optional().nullable(),
  marcaSustitutoId: z.number().int().optional().nullable(),
});

// ===============================
// 💰 Función auxiliar: tipo de cambio
// ===============================
async function getTipoCambioDesdeAPI(): Promise<number> {
  try {
    const res = await fetch("http://localhost:4000/api/tipo-cambio/latest");
    if (!res.ok) throw new Error("No se pudo obtener tipo de cambio");
    const data = await res.json();
    return Number(data.tipoCambio?.valor ?? 36.5);
  } catch (error) {
    console.error("⚠️ Error al consultar tipo de cambio:", error);
    return 36.5; // Valor de respaldo
  }
}

// ===============================
// 📋 LISTAR INVENTARIO
// ===============================
// 📋 LISTAR INVENTARIO con valores convertidos dinámicamente
export async function list(_req: Request, res: Response) {
  try {
    const tipoCambio = await getTipoCambioDesdeAPI();

    const items = await prisma.inventario.findMany({
      include: {
        marca: true,
        categoria: true,
        sustituto: {
          include: { marca: true }, // 👈 para obtener marca del sustituto
        },
      },
      orderBy: [{ marcaId: "asc" }, { numeroParte: "asc" }],
    });

    // 🔹 Agregar valores convertidos y marca del sustituto
    const itemsConvertidos = items.map((i) => ({
      ...i,
      marcaSustituto: i.sustituto?.marca || null, // 👈 aquí añadimos el campo esperado por el frontend
      costoPromedioDolar: Number(i.costoPromedioCordoba) / tipoCambio,
      precioVentaPromedioDolar: Number(i.precioVentaPromedioCordoba) / tipoCambio,
      precioVentaSugeridoDolar: Number(i.precioVentaSugeridoCordoba) / tipoCambio,
    }));

    res.json({ tipoCambio, items: itemsConvertidos });
  } catch (err: any) {
    console.error("Error al listar inventario:", err);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}

// ===============================
// ➕ CREAR PRODUCTO
// ===============================
export async function create(req: Request, res: Response) {
  try {
    const parsed = InvCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.format());
    const data = parsed.data;

    // 🔍 Validar relaciones
    const marcaExiste = await prisma.marca.findUnique({ where: { id: data.marcaId } });
    if (!marcaExiste) return res.status(400).json({ message: "La marca especificada no existe." });

    const categoriaExiste = await prisma.categoria.findUnique({ where: { id: data.categoriaId } });
    if (!categoriaExiste)
      return res.status(400).json({ message: "La categoría especificada no existe." });

    if (data.marcaSustitutoId) {
      const marcaSust = await prisma.marca.findUnique({ where: { id: data.marcaSustitutoId } });
      if (!marcaSust)
        return res.status(400).json({ message: "La marca del sustituto no existe." });
    }

    const tipoCambio = await getTipoCambioDesdeAPI();

    const item = await prisma.inventario.create({
      data: {
        ...data,
        costoPromedioDolar: data.costoPromedioCordoba / tipoCambio,
        precioVentaPromedioDolar: data.precioVentaPromedioCordoba / tipoCambio,
        precioVentaSugeridoDolar: data.precioVentaSugeridoCordoba / tipoCambio,
      },
      include: { marca: true, categoria: true },
    });

    res.status(201).json({ tipoCambio, item });
  } catch (error: any) {
    console.error("❌ Error al crear producto:", error);
    res.status(500).json({ message: "Error interno al crear producto." });
  }
}

// ===============================
// 🔍 OBTENER POR ID
// ===============================
export async function getById(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const tipoCambio = await getTipoCambioDesdeAPI();

    const item = await prisma.inventario.findUnique({
      where: { id },
      include: { marca: true, categoria: true, sustituto: true },
    });

    if (!item) return res.status(404).json({ message: "Producto no encontrado." });

    const convertido = {
      ...item,
      costoPromedioDolar: Number(item.costoPromedioCordoba) / tipoCambio,
      precioVentaPromedioDolar: Number(item.precioVentaPromedioCordoba) / tipoCambio,
      precioVentaSugeridoDolar: Number(item.precioVentaSugeridoCordoba) / tipoCambio,
    };

    res.json({ tipoCambio, item: convertido });
  } catch (err) {
    console.error("❌ Error al obtener producto:", err);
    res.status(500).json({ message: "Error interno del servidor." });
  }
}

// ===============================
// ✏️ ACTUALIZAR PRODUCTO
// ===============================
export async function update(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const parsed = InvCreateSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.format());
    const data = parsed.data;

    // 🔍 Validar existencia del producto
    const productoExiste = await prisma.inventario.findUnique({ where: { id } });
    if (!productoExiste) return res.status(404).json({ message: "Producto no encontrado." });

    // 🔍 Validar relaciones
    if (data.marcaId) {
      const marca = await prisma.marca.findUnique({ where: { id: data.marcaId } });
      if (!marca) return res.status(400).json({ message: "La marca especificada no existe." });
    }

    if (data.categoriaId) {
      const cat = await prisma.categoria.findUnique({ where: { id: data.categoriaId } });
      if (!cat) return res.status(400).json({ message: "La categoría especificada no existe." });
    }

    if (data.marcaSustitutoId) {
      const marcaSust = await prisma.marca.findUnique({ where: { id: data.marcaSustitutoId } });
      if (!marcaSust)
        return res.status(400).json({ message: "La marca del sustituto no existe." });
    }

    const tipoCambio = await getTipoCambioDesdeAPI();

    const item = await prisma.inventario.update({
      where: { id },
      data: {
        ...data,
        costoPromedioDolar: data.costoPromedioCordoba
          ? data.costoPromedioCordoba / tipoCambio
          : undefined,
        precioVentaPromedioDolar: data.precioVentaPromedioCordoba
          ? data.precioVentaPromedioCordoba / tipoCambio
          : undefined,
        precioVentaSugeridoDolar: data.precioVentaSugeridoCordoba
          ? data.precioVentaSugeridoCordoba / tipoCambio
          : undefined,
      },
      include: { marca: true, categoria: true },
    });

    res.json({ tipoCambio, item });
  } catch (error: any) {
    console.error("❌ Error al actualizar producto:", error);

    if (error.code === "P2003") {
      return res.status(400).json({
        message: "Violación de clave foránea. Verifica que la marca o categoría existan.",
      });
    }

    res.status(500).json({ message: "Error interno al actualizar producto." });
  }
}

// ===============================
// ❌ ELIMINAR PRODUCTO
// ===============================
export async function remove(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    await prisma.inventario.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err: any) {
    console.error("❌ Error al eliminar producto:", err);
    res.status(500).json({ message: "Error interno al eliminar producto." });
  }
}

// ===============================
// 🧾 LISTAR CON SUSTITUTOS
// ===============================
export async function viewConSustituto(_req: Request, res: Response) {
  try {
    const rows = await prisma.inventario.findMany({
      select: {
        id: true,
        numeroParte: true,
        stockActual: true,
        marca: { select: { nombre: true } },
        categoria: { select: { nombre: true } },
        sustituto: {
          select: {
            numeroParte: true,
            stockActual: true,
            marca: { select: { nombre: true } },
          },
        },
      },
    });

    const mapped = rows.map((r) => ({
      idProducto: r.id,
      numeroParte: r.numeroParte,
      marca: r.marca?.nombre ?? null,
      categoria: r.categoria?.nombre ?? null,
      stockActual: r.stockActual,
      codigoSustituto: r.sustituto?.numeroParte ?? null,
      marcaSustituto: r.sustituto?.marca?.nombre ?? null,
      stockSustituto: r.sustituto?.stockActual ?? null,
    }));

    res.json({ data: mapped });
  } catch (err: any) {
    console.error("❌ Error al listar sustitutos:", err);
    res.status(500).json({ message: "Error interno del servidor." });
  }
}

// ===============================
// 🔍 BUSCAR DISPONIBILIDAD
// ===============================
export async function buscarProductoDisponible(req: Request, res: Response) {
  try {
    const numeroParte = String(req.query.numeroParte ?? "");
    const marcaId = Number(req.query.marcaId ?? 0);

    const i = await prisma.inventario.findFirst({
      where: { numeroParte, marcaId },
      include: {
        marca: true,
        categoria: true,
        sustituto: { include: { marca: true } },
      },
    });

    if (!i) return res.status(404).json({ message: "Producto no encontrado" });

    const disponible = i.stockActual > 0 ? i : i.sustituto;
    if (!disponible)
      return res.status(404).json({ message: "Sin stock ni sustituto disponible" });

    res.json({
      numeroParteDisponible: disponible.numeroParte,
      marcaDisponible: disponible.marca?.nombre ?? null,
      stockDisponible: disponible.stockActual,
    });
  } catch (err: any) {
    console.error("❌ Error en búsqueda de producto:", err);
    res.status(500).json({ message: "Error interno al buscar producto." });
  }
}
