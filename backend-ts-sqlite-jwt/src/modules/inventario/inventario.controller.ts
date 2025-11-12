import { Request, Response } from "express";
import { prisma } from "../../db/prisma";
import { z } from "zod";
import fetch from "node-fetch"; // npm i node-fetch

function toStringJSON(value: any): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}

// ===============================
// 📦 Esquema de validación
// ===============================
const CompetidorPrecioSchema = z.object({
  proveedor: z.string().min(1),
  precioCordoba: z.number().optional(),
  precioDolar: z.number().optional(),
  fecha: z.string().optional(),
  referencia: z.string().optional(),
});

const InvCreateSchema = z.object({
  numeroParte: z.string().min(1),
  marcaId: z.number().int().positive(),
  categoriaId: z.number().int().positive(),
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  ubicacion: z
    .string()
    .regex(/^[A-Z](?:[1-9]|1[0-2])$/)
    .optional(),
  stockActual: z.number().int().optional().default(0),
  stockMinimo: z.number().int().nonnegative().optional(),
  costoPromedioCordoba: z.number().optional().default(0),
  precioVentaPromedioCordoba: z.number().optional().default(0),
  precioVentaSugeridoCordoba: z.number().optional().default(0),
  codigoSustituto: z.string().optional().nullable(),
  marcaSustitutoId: z.number().int().optional().nullable(),
  compatibilidadMaquinas: z.array(z.string()).optional(),
  preciosCompetencia: z.array(CompetidorPrecioSchema).optional(),
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
        maquinasCompatibles: true,
        preciosCompetenciaRows: true,
      },
      orderBy: [{ marcaId: "asc" }, { numeroParte: "asc" }],
    });

    // 🔹 Agregar valores convertidos y mapear relaciones a arrays esperados por el frontend
    const itemsConvertidos = items.map((i: any) => ({
      ...i,
      compatibilidadMaquinas: Array.isArray(i.maquinasCompatibles)
        ? i.maquinasCompatibles.map((m: any) => m.nombre)
        : [],
      preciosCompetencia: Array.isArray(i.preciosCompetenciaRows)
        ? i.preciosCompetenciaRows.map((p: any) => ({
            proveedor: p.proveedor,
            precioCordoba: p.precioCordoba != null ? Number(p.precioCordoba) : undefined,
            precioDolar: p.precioDolar != null ? Number(p.precioDolar) : undefined,
            fecha: p.fecha || undefined,
            referencia: p.referencia || undefined,
          }))
        : [],
      marcaSustituto: i.sustituto?.marca || null,
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
    console.log("[Inventario.create] raw body:", JSON.stringify(req.body));
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

    const createData: any = {
      ...data,
      costoPromedioDolar: data.costoPromedioCordoba / tipoCambio,
      precioVentaPromedioDolar: data.precioVentaPromedioCordoba / tipoCambio,
      precioVentaSugeridoDolar: data.precioVentaSugeridoCordoba / tipoCambio,
    };
    if (typeof (createData as any).ubicacion === 'string') {
      createData.ubicacion = (createData as any).ubicacion.toUpperCase();
    }
    // Relaciones obligatorias: usar connect en lugar de *_Id
    if (data.marcaId) {
      createData.marca = { connect: { id: data.marcaId } };
      delete createData.marcaId;
    }
    if (data.categoriaId) {
      createData.categoria = { connect: { id: data.categoriaId } };
      delete createData.categoriaId;
    }
    if (Object.prototype.hasOwnProperty.call(data, "compatibilidadMaquinas")) {
      const arr = Array.isArray((data as any).compatibilidadMaquinas)
        ? (data as any).compatibilidadMaquinas
        : [];
      createData.maquinasCompatibles = {
        create: arr.map((nombre: string) => ({ nombre })),
      };
      // Remove input-only key to avoid Prisma unknown argument
      delete createData.compatibilidadMaquinas;
    }
    if (Object.prototype.hasOwnProperty.call(data, "preciosCompetencia")) {
      const arr = Array.isArray((data as any).preciosCompetencia)
        ? (data as any).preciosCompetencia
        : [];
      createData.preciosCompetenciaRows = {
        create: arr.map((pc: any) => ({
          proveedor: pc.proveedor,
          precioCordoba: pc.precioCordoba != null ? pc.precioCordoba : undefined,
          precioDolar: pc.precioDolar != null ? pc.precioDolar : undefined,
          fecha: pc.fecha ? new Date(pc.fecha) : undefined,
          referencia: pc.referencia || undefined,
        })),
      };
      // Remove input-only key to avoid Prisma unknown argument
      delete createData.preciosCompetencia;
    }
    // Relación sustituto vía connect compuesto (si viene)
    if (data.codigoSustituto && data.marcaSustitutoId) {
      createData.sustituto = {
        connect: {
          UQ_NumeroParte_Marca: {
            numeroParte: data.codigoSustituto,
            marcaId: data.marcaSustitutoId,
          },
        },
      };
    }
    delete createData.codigoSustituto;
    delete createData.marcaSustitutoId;

    try {
    console.log("[Inventario.create] prisma data:", JSON.stringify(createData));
    const item = await prisma.inventario.create({
      data: createData,
      include: { marca: true, categoria: true },
    });
    console.log("[Inventario.create] created item id:", item.id);
    return res.status(201).json({ tipoCambio, item });
  } catch (err: any) {
    const msg = String(err?.message || "");
    const unknownArg =
      msg.includes("Unknown argument `maquinasCompatibles`") ||
      msg.includes("Unknown argument `preciosCompetenciaRows`") ||
      msg.includes("Unknown argument `compatibilidadMaquinas`") ||
      msg.includes("Unknown argument `preciosCompetencia`") ||
      msg.includes("Unknown argument `ubicacion`") ||
      msg.includes("Unknown argument `stockMinimo`");
    if (unknownArg) {
      const fallback: any = { ...createData };
      delete fallback.maquinasCompatibles;
      delete fallback.preciosCompetenciaRows;
      delete fallback.compatibilidadMaquinas;
      delete fallback.preciosCompetencia;
      delete fallback.ubicacion;
      delete fallback.stockMinimo;
      console.warn("[Inventario.create] fallback without fields due to:", msg);
      console.warn("[Inventario.create] fallback prisma data:", JSON.stringify(fallback));
      const item = await prisma.inventario.create({
        data: fallback,
        include: { marca: true, categoria: true },
      });
      console.log("[Inventario.create] created item id (fallback):", item.id);
      return res.status(201).json({ tipoCambio, item, warning: "Campos ubicacion/stockMinimo no guardados: ejecuta migración Prisma para habilitarlos." });
    }
    throw err;
  }
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
      include: {
        marca: true,
        categoria: true,
        sustituto: true,
        maquinasCompatibles: true,
        preciosCompetenciaRows: true,
      },
    });

    if (!item) return res.status(404).json({ message: "Producto no encontrado." });

    const convertido: any = {
      ...item,
      compatibilidadMaquinas: Array.isArray((item as any).maquinasCompatibles)
        ? (item as any).maquinasCompatibles.map((m: any) => m.nombre)
        : [],
      preciosCompetencia: Array.isArray((item as any).preciosCompetenciaRows)
        ? (item as any).preciosCompetenciaRows.map((p: any) => ({
            proveedor: p.proveedor,
            precioCordoba: p.precioCordoba != null ? Number(p.precioCordoba) : undefined,
            precioDolar: p.precioDolar != null ? Number(p.precioDolar) : undefined,
            fecha: p.fecha || undefined,
            referencia: p.referencia || undefined,
          }))
        : [],
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
    console.log("[Inventario.update] id:", id);
    console.log("[Inventario.update] raw body:", JSON.stringify(req.body));
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

    const updateData: any = {
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
    };
    if (typeof (updateData as any).ubicacion === 'string') {
      updateData.ubicacion = (updateData as any).ubicacion.toUpperCase();
    }
    // Relaciones: traducir *_Id a connect
    if (data.marcaId) {
      updateData.marca = { connect: { id: data.marcaId } };
      delete updateData.marcaId;
    }
    if (data.categoriaId) {
      updateData.categoria = { connect: { id: data.categoriaId } };
      delete updateData.categoriaId;
    }
    if (Object.prototype.hasOwnProperty.call(data, "compatibilidadMaquinas")) {
      const arr = Array.isArray((data as any).compatibilidadMaquinas)
        ? (data as any).compatibilidadMaquinas
        : [];
      updateData.maquinasCompatibles = {
        deleteMany: {},
        ...(arr.length > 0 ? { create: arr.map((nombre: string) => ({ nombre })) } : {}),
      };
      // Remove input-only key to avoid Prisma unknown argument
      delete updateData.compatibilidadMaquinas;
    }
    if (Object.prototype.hasOwnProperty.call(data, "preciosCompetencia")) {
      const arr = Array.isArray((data as any).preciosCompetencia)
        ? (data as any).preciosCompetencia
        : [];
      updateData.preciosCompetenciaRows = {
        deleteMany: {},
        ...(arr.length > 0
          ? {
              create: arr.map((pc: any) => ({
                proveedor: pc.proveedor,
                precioCordoba: pc.precioCordoba != null ? pc.precioCordoba : undefined,
                precioDolar: pc.precioDolar != null ? pc.precioDolar : undefined,
                fecha: pc.fecha ? new Date(pc.fecha) : undefined,
                referencia: pc.referencia || undefined,
              })),
            }
          : {}),
      };
      // Remove input-only key to avoid Prisma unknown argument
      delete updateData.preciosCompetencia;
    }
    // Relación sustituto: si se provee, conectar o desconectar
    if (
      Object.prototype.hasOwnProperty.call(data, "codigoSustituto") ||
      Object.prototype.hasOwnProperty.call(data, "marcaSustitutoId")
    ) {
      if (data.codigoSustituto && data.marcaSustitutoId) {
        updateData.sustituto = {
          connect: {
            UQ_NumeroParte_Marca: {
              numeroParte: data.codigoSustituto,
              marcaId: data.marcaSustitutoId,
            },
          },
        };
      } else {
        updateData.sustituto = { disconnect: true };
      }
    }
    delete updateData.codigoSustituto;
    delete updateData.marcaSustitutoId;

    try {
      console.log("[Inventario.update] prisma data:", JSON.stringify(updateData));
      const item = await prisma.inventario.update({
        where: { id },
        data: updateData,
        include: { marca: true, categoria: true },
      });
      console.log("[Inventario.update] updated item id:", item.id);
      return res.json({ tipoCambio, item });
    } catch (err: any) {
      const msg = String(err?.message || "");
      const unknownArg =
        msg.includes("Unknown argument `maquinasCompatibles`") ||
        msg.includes("Unknown argument `preciosCompetenciaRows`") ||
        msg.includes("Unknown argument `compatibilidadMaquinas`") ||
        msg.includes("Unknown argument `preciosCompetencia`") ||
        msg.includes("Unknown argument `ubicacion`") ||
        msg.includes("Unknown argument `stockMinimo`");
      if (unknownArg) {
        const fallback: any = { ...updateData };
        delete fallback.maquinasCompatibles;
        delete fallback.preciosCompetenciaRows;
        delete fallback.compatibilidadMaquinas;
        delete fallback.preciosCompetencia;
        delete fallback.ubicacion;
        delete fallback.stockMinimo;
        console.warn("[Inventario.update] fallback without fields due to:", msg);
        console.warn("[Inventario.update] fallback prisma data:", JSON.stringify(fallback));
        const item = await prisma.inventario.update({
          where: { id },
          data: fallback,
          include: { marca: true, categoria: true },
        });
        console.log("[Inventario.update] updated item id (fallback):", item.id);
        return res.json({ tipoCambio, item, warning: "Campos ubicacion/stockMinimo no guardados: ejecuta migración Prisma para habilitarlos." });
      }
      throw err;
    }
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
// 📉 LISTAR BAJO STOCK (stockActual <= stockMinimo)
// ===============================
export async function listLowStock(_req: Request, res: Response) {
  try {
    const tipoCambio = await getTipoCambioDesdeAPI();
    const items = await prisma.inventario.findMany({
      where: { stockMinimo: { not: null } },
      include: {
        marca: true,
        categoria: true,
      },
      orderBy: [{ marcaId: 'asc' }, { numeroParte: 'asc' }],
    });
    // Prisma no permite comparar dos columnas con lte directamente; fallback a filtro en memoria
    const filtered = items.filter((i: any) => typeof i.stockMinimo === 'number' && i.stockActual <= i.stockMinimo);
    res.json({ tipoCambio, items: filtered });
  } catch (err) {
    console.error('❌ Error al listar bajo stock:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
}

// ===============================
// 🗂️ ASIGNAR UBICACIONES EN LOTE
// ===============================
export async function asignarUbicaciones(_req: Request, res: Response) {
  try {
    const letras = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)); // A..Z
    const numeros = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
    const todas = letras.flatMap((l) => numeros.map((n) => `${l}${n}`));

    const usadosRows = await prisma.inventario.findMany({
      where: { ubicacion: { not: null } },
      select: { ubicacion: true },
    });
    const usados = new Set((usadosRows.map((r) => (r.ubicacion || '').toUpperCase())).filter(Boolean));
    const disponibles = todas.filter((u) => !usados.has(u));

    const porAsignar = await prisma.inventario.findMany({
      where: { ubicacion: null },
      orderBy: { id: 'asc' },
      select: { id: true },
    });

    const capacidad = disponibles.length;
    const cantidad = Math.min(capacidad, porAsignar.length);
    const asignaciones = porAsignar.slice(0, cantidad).map((row, idx) => ({ id: row.id, ubicacion: disponibles[idx] }));

    // Ejecutar en transacción
    await prisma.$transaction(
      asignaciones.map((a) =>
        prisma.inventario.update({ where: { id: a.id }, data: { ubicacion: a.ubicacion } })
      )
    );

    res.json({
      totalSlots: todas.length,
      usados: usados.size,
      libres: disponibles.length,
      actualizados: asignaciones.length,
      sinAsignar: Math.max(0, porAsignar.length - asignaciones.length),
      aviso:
        porAsignar.length > asignaciones.length
          ? 'No hay suficientes ubicaciones (A1..Z12) para todos los productos. Quedaron artículos sin asignar.'
          : undefined,
    });
  } catch (error) {
    console.error('❌ Error al asignar ubicaciones:', error);
    res.status(500).json({ message: 'Error interno al asignar ubicaciones.' });
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
