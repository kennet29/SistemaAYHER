import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';
import { z } from 'zod';
import { crearMovimientoYAjustarStock } from '../services/stock.service';
import { generarNotaCreditoVentaPDF } from './services/devolucionPdf';

const DevVentaSchema = z.object({
  ventaId: z.number().int().positive(),
  cliente: z.string().optional(),
  concepto: z.string().optional(),
  observaciones: z.string().optional(),
  motivo: z.string().optional(),
  usuario: z.string().optional(),
  detalles: z.array(z.object({
    inventarioId: z.number().int().positive(),
    cantidad: z.number().int().positive(),
    precioUnitarioCordoba: z.number().nonnegative()
  })).min(1)
});

const DevCompraSchema = z.object({
  compraId: z.number().int().positive(),
  proveedor: z.string().optional(),
  motivo: z.string().optional(),
  usuario: z.string().optional(),
  detalles: z.array(z.object({
    inventarioId: z.number().int().positive(),
    cantidad: z.number().int().positive(),
    costoUnitarioCordoba: z.number().nonnegative()
  })).min(1)
});

// Devolución de Venta => ENTRA al inventario
export async function createDevolucionVenta(req: Request, res: Response) {
  const parsed = DevVentaSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());
  const data = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    const tc = 36.5;
    const concepto = data.concepto || data.motivo || null;
    const observaciones = data.observaciones?.trim();
    const motivoFinal = observaciones ? `${concepto || ""}${concepto ? " | " : ""}Obs: ${observaciones}` : concepto;

    const dev = await tx.devolucionVenta.create({
      data: {
        ventaId: data.ventaId,
        cliente: data.cliente,
        motivo: motivoFinal || null,
        usuario: data.usuario
      }
    });

    for (const d of data.detalles) {
      await tx.detalleDevolucionVenta.create({
        data: {
          devolucionVentaId: dev.id,
          inventarioId: d.inventarioId,
          cantidad: d.cantidad,
          precioUnitarioCordoba: d.precioUnitarioCordoba as any,
          precioUnitarioDolar: (Number(d.precioUnitarioCordoba) / tc) as any,
        }
      });

      await crearMovimientoYAjustarStock({
        tx,
        inventarioId: d.inventarioId,
        tipoMovimientoNombre: 'Devolución de Cliente',
        cantidad: d.cantidad,
        precioVentaUnitarioCordoba: d.precioUnitarioCordoba,
        usuario: data.usuario,
        observacion: 'Devolución cliente'
      });
    }

    return dev;
  });

  res.status(201).json({ devolucionVenta: result });
}

// Devolución de Compra => SALE del inventario
export async function createDevolucionCompra(req: Request, res: Response) {
  const parsed = DevCompraSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());
  const data = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    const tc = 36.5;
    const dev = await tx.devolucionCompra.create({
      data: {
        compraId: data.compraId,
        proveedor: data.proveedor,
        motivo: data.motivo,
        usuario: data.usuario
      }
    });

    for (const d of data.detalles) {
      await tx.detalleDevolucionCompra.create({
        data: {
          devolucionCompraId: dev.id,
          inventarioId: d.inventarioId,
          cantidad: d.cantidad,
          costoUnitarioCordoba: d.costoUnitarioCordoba as any,
          costoUnitarioDolar: (Number(d.costoUnitarioCordoba) / tc) as any,
        }
      });

      await crearMovimientoYAjustarStock({
        tx,
        inventarioId: d.inventarioId,
        tipoMovimientoNombre: 'Devolución a Proveedor',
        cantidad: d.cantidad,
        precioVentaUnitarioCordoba: d.costoUnitarioCordoba,
        usuario: data.usuario,
        observacion: 'Devolución proveedor'
      });
    }

    return dev;
  });

  res.status(201).json({ devolucionCompra: result });
}

export async function listDevolucionesVenta(req: Request, res: Response) {
  const devoluciones = await prisma.devolucionVenta.findMany({
    include: {
      venta: {
        include: {
          cliente: true,
        },
      },
      detalles: {
        include: {
          inventario: {
            include: {
              marca: true,
            },
          },
        },
      },
    },
    orderBy: { id: 'desc' },
  });

  res.json({ devoluciones });
}

export async function cobrarDevolucionVenta(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'ID invalido' });

  const { cobrada } = req.body as { cobrada?: boolean };
  const nuevoEstado = Boolean(cobrada);

  const existente = await prisma.devolucionVenta.findUnique({ where: { id } });
  if (!existente) return res.status(404).json({ message: 'Devolucion no encontrada' });

  const dev = await prisma.devolucionVenta.update({
    where: { id },
    data: { cobrada: nuevoEstado },
  });

  res.json({ devolucionVenta: dev });
}

export async function imprimirNotaCreditoVenta(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'ID inválido' });

  const devolucion = await prisma.devolucionVenta.findUnique({
    where: { id },
    include: {
      venta: {
        include: {
          cliente: true,
        },
      },
      detalles: {
        include: {
          inventario: {
            include: { marca: true },
          },
        },
      },
    },
  });

  if (!devolucion) return res.status(404).json({ message: 'Devolución no encontrada' });

  const config = await prisma.configuracion.findFirst().catch(() => null);

  generarNotaCreditoVentaPDF(res, {
    config,
    // Prisma devuelve Decimals en algunos campos; los convertimos a any para el generador de PDF.
    devolucion: devolucion as any,
    detalles: (devolucion.detalles as any) || [],
  });
}
