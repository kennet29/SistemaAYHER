import { Request, Response } from "express";
import { prisma } from "../../db/prisma";
import { z } from "zod";
import { generarNumeroRemision } from "../../services/numeroRemision.service";
import { crearMovimientoYAjustarStock } from "../services/stock.service";
import { generarRemisionPDFStreamV2 } from "./services/remision.pdf";

// ✅ Validación Zod
const remisionSchema = z.object({
  clienteId: z.preprocess((v) => (v !== "" && v != null ? Number(v) : undefined), z.number().optional()),
  usuario: z.string().optional(),
  observacion: z.string().optional(),
  pio: z.string().nullable().optional(),
  items: z.array(
    z.object({
      inventarioId: z.preprocess((v) => Number(v), z.number().int()),
      cantidad: z.preprocess((v) => Number(v), z.number().min(1)),
    })
  ).min(1, "Debe enviar al menos un producto"),
});

// ✅ Crear remisión
export const crearRemision = async (req: Request, res: Response) => {
  try {
    console.log("📥 Body recibido en /remisiones/crear:");
    console.log(JSON.stringify(req.body, null, 2));

    const parsed = remisionSchema.safeParse(req.body);
    if (!parsed.success) {
      console.error("❌ Error validación ZOD:", parsed.error.errors);
      return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
    }

    const { clienteId, usuario, observacion, items, pio } = parsed.data;
    const numero = await generarNumeroRemision();

    const remision = await prisma.$transaction(async (tx) => {
      const dataCreate: any = {
        numero,
        usuario,
        observacion,
        facturada: false,
        pio: pio && typeof pio === "string" && pio.trim().length > 0 ? pio.trim() : null,
      };
      if (typeof clienteId === 'number') dataCreate.clienteId = clienteId;
      const nuevaRemision = await tx.remision.create({ data: dataCreate });

      console.log("✅ Transacción iniciada para remisión:", nuevaRemision.id);

      for (const item of items) {
        const producto = await tx.inventario.findUnique({
          where: { id: item.inventarioId },
          select: { stockActual: true, nombre: true },
        });

        if (!producto) {
          throw new Error(`Producto ID ${item.inventarioId} no existe`);
        }

        if (producto.stockActual < item.cantidad) {
          throw new Error(
            `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stockActual}, Solicitado: ${item.cantidad}`
          );
        }

        // ✅ Llamando servicio con `tx`
        const movimiento = await crearMovimientoYAjustarStock({
          inventarioId: item.inventarioId,
          tipoMovimientoNombre: "Salida por Remisión",
          cantidad: item.cantidad,
          usuario,
          observacion: `Remisión ${numero}`,
          tx, // ✅ CLAVE
        });

        await tx.detalleRemision.create({
          data: {
            remisionId: nuevaRemision.id,
            inventarioId: item.inventarioId,
            cantidad: item.cantidad,
            movimientoId: movimiento.movimiento.id, // ✅ Correcto
          },
        });
      }

      return nuevaRemision;
    });

    return res.status(201).json({ message: "✅ Remisión creada correctamente", remision });

  } catch (error: any) {
    console.error("❌ Error crear remisión:", error);

    if (error.message?.includes("Stock insuficiente")) {
      return res.status(400).json({ message: error.message });
    }

    if (error.message?.includes("TipoMovimiento no encontrado")) {
      return res.status(400).json({ message: "Tipo de movimiento no existe en base de datos" });
    }

    return res.status(500).json({ message: "Error al crear remisión" });
  }
};

// ✅ Listar remisiones
export const listarRemisiones = async (_req: Request, res: Response) => {
  try {
    const remisiones = await prisma.remision.findMany({
      orderBy: { id: "desc" },
      include: { detalles: { include: { inventario: true } } },
    });
    res.json(remisiones);
  } catch (err) {
    console.error("❌ Error listarRemisiones:", err);
    
    res.status(500).json({ message: "Error al obtener remisiones" });
  }
};

// ✅ Obtener remisión
export const obtenerRemision = async (req: Request, res: Response) => {
  try {
    const remision = await prisma.remision.findUnique({
      where: { id: Number(req.params.id) },
      include: { detalles: { include: { inventario: true } } },
    });

    if (!remision) return res.status(404).json({ message: "No encontrada" });
    res.json(remision);
  } catch {
    res.status(500).json({ message: "Error al obtener remisión" });
  }
};

export const remisionesPendientes = async (_req: Request, res: Response) => {
  try {
    console.log("🚀 Ejecutando remisionesPendientes"); // 👈 DEBUG

    const pendientes = await prisma.remision.findMany({
      where: { facturada: false },
      include: {
        detalles: {
          include: {
            inventario: true
          }
        }
      },
      orderBy: { id: "desc" },
    });

    console.log("✅ Pendientes encontrados:", pendientes.length); // 👈 DEBUG

    return res.json(pendientes);
  } catch (error: any) {
    console.error("❌ Error en remisionesPendientes:");
    console.error(error); // 👈 IMPRESCINDIBLE
    return res.status(500).json({
      message: "Error obteniendo remisiones pendientes",
      error: error.message,
    });
  }
};


// ✅ Marcar remisión como facturada
export const marcarRemisionFacturada = async (req: Request, res: Response) => {
  try {
    const remisionId = Number(req.params.id);

    await prisma.$transaction(async (tx) => {
      // 1) Marcar como facturada y obtener número
      const rem = await tx.remision.update({
        where: { id: remisionId },
        data: { facturada: true },
        select: { id: true, numero: true },
      });

      const numeroTexto = rem.numero ? String(rem.numero) : String(rem.id);

      // 2) Obtener movimientos vinculados a los detalles de la remisión
      const detalles = await tx.detalleRemision.findMany({
        where: { remisionId },
        select: { movimientoId: true },
      });
      const movIds = detalles.map((d) => d.movimientoId).filter(Boolean) as number[];
      if (movIds.length === 0) return;

      const movimientos = await tx.movimientoInventario.findMany({
        where: { id: { in: movIds } },
        select: { id: true, observacion: true },
      });

      // 3) Actualizar observación: anexar "Facturación de remisión #<numero>"
      const anotacion = `Facturación de remisión ${numeroTexto}`;
      for (const m of movimientos) {
        const nuevaObs = m.observacion && m.observacion.trim().length > 0
          ? `${m.observacion} | ${anotacion}`
          : anotacion;
        await tx.movimientoInventario.update({
          where: { id: m.id },
          data: { observacion: nuevaObs },
        });
      }
    });

    return res.json({ message: "✅ Remisión marcada como facturada y movimientos anotados" });
  } catch (e) {
    console.error("❌ Error al marcar remisión como facturada:", e);
    return res.status(500).json({ message: "Error al marcar remisión como facturada" });
  }
};




import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

export const imprimirRemisionExcel = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const remision = await prisma.remision.findUnique({
      where: { id },
      include: {
        cliente: true,
        detalles: { include: { inventario: true } },
      },
    });
    if (!remision) return res.status(404).json({ message: "Remisión no encontrada" });
    const config = await prisma.configuracion.findFirst();

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Remisión", {
      pageSetup: { paperSize: 9, orientation: "portrait", margins: { left: 0.35, right: 0.35, top: 0.35, bottom: 0.35 } as any },
    });

    // Encabezado
    ws.mergeCells("A1:F1");
    ws.getCell("A1").value = config?.razonSocial || "SERVICIOS MULTIPLES E IMPORTACIONES AYHER";
    ws.getCell("A1").font = { size: 16, bold: true };
    ws.getCell("A1").alignment = { horizontal: "left" };
    ws.mergeCells("A2:F2");
    ws.getCell("A2").value = `RUC: ${config?.ruc ?? ""}    Tel: ${[config?.telefono1, config?.telefono2].filter(Boolean).join(" / ")}`;
    ws.getCell("A3").value = `Dirección: ${config?.direccion ?? ""}`;
    ws.getCell("A4").value = `Correo: ${config?.correo ?? ""}    Sitio: ${config?.sitioWeb ?? ""}`;
    ws.getCell("F2").value = "NOTA DE REMISION";
    ws.getCell("F2").font = { bold: true };
    ws.getCell("F3").value = `Fecha: ${remision.fecha.toLocaleDateString()}`;
    ws.getCell("F4").value = `Oferta N°: ${remision.pio ?? "-"}`;

    const startMeta = 6;
    const meta = [
      ["Entregado a:", remision.cliente?.nombre || remision.cliente?.empresa || "N/A", "Fecha:", remision.fecha.toLocaleDateString()],
      ["Empresa (cliente):", remision.cliente?.empresa || remision.cliente?.nombre || "N/A", "Ruc:", remision.cliente?.ruc || config?.ruc || ""],
      ["Dirección:", remision.cliente?.direccion || config?.direccion || "", "Pedido N°:", remision.pio || "-"],
    ];
    meta.forEach((r, idx) => {
      const row = ws.getRow(startMeta + idx);
      row.height = 18;
      row.getCell(1).value = r[0];
      row.getCell(2).value = r[1];
      row.getCell(4).value = r[2];
      row.getCell(5).value = r[3];
      row.font = { size: 10 };
      [1, 2, 4, 5].forEach((c) => {
        row.getCell(c).alignment = { vertical: "middle", horizontal: c === 2 || c === 5 ? "left" : "right" };
        row.getCell(c).border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
      });
      ws.mergeCells(row.number, 2, row.number, 3);
      ws.mergeCells(row.number, 5, row.number, 6);
    });

    // Tabla de items
    const headerRow = startMeta + meta.length + 2;
    const cols = ["P.", "No. De Parte", "Descripcion", "Cant", "Precio C$", "Total C$"];
    ws.getRow(headerRow).values = cols;
    ws.getRow(headerRow).font = { bold: true, size: 10 };
    ws.getRow(headerRow).alignment = { horizontal: "center" };
    ws.columns = [
      { width: 6 },
      { width: 22 },
      { width: 50 },
      { width: 10 },
      { width: 16 },
      { width: 16 },
    ];
    let total = 0;
    remision.detalles.forEach((d, idx) => {
      const precio = Number(d.inventario?.precioVentaSugeridoCordoba ?? d.inventario?.precioVentaPromedioCordoba ?? 0) || 0;
      const cant = Number(d.cantidad || 0);
      const sub = cant * precio;
      total += sub;
      ws.addRow([
        idx + 1,
        d.inventario?.numeroParte || "",
        d.inventario?.nombre || d.inventario?.descripcion || "",
        cant,
        precio,
        sub,
      ]);
    });
    ws.addRow(["", "", "", "", "TOTAL", total]).font = { bold: true };

    // Bordes a la tabla
    const firstDataRow = headerRow;
    const lastDataRow = ws.lastRow?.number ?? headerRow;
    for (let r = firstDataRow; r <= lastDataRow; r++) {
      const row = ws.getRow(r);
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      });
      if (r > firstDataRow && r < lastDataRow) {
        row.getCell(5).numFmt = '"C$"#,##0.00';
        row.getCell(6).numFmt = '"C$"#,##0.00';
      }
    }

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=remision_${remision.numero}.xlsx`);
    await wb.xlsx.write(res);
    res.status(200).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error exportando remisión" });
  }
};



export const imprimirRemision = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const remision = await prisma.remision.findUnique({
      where: { id },
      include: {
        cliente: true,
        detalles: {
          include: { inventario: true }
        }
      }
    });

    if (!remision) {
      return res.status(404).send("Remisión no encontrada");
    }

    let html = `
      <html>
      <head>
        <title>Remisión ${remision.numero}</title>
        <style>
          body { font-family: Arial; padding:20px; }
          h2 { color: #003399 }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top:20px;
          }
          table, th, td {
            border: 1px solid black;
          }
          th, td {
            padding: 8px;
            text-align: left;
          }
          .info { margin-bottom:10px; }
          .print-btn {
            padding:8px 15px;
            background:#0052cc;
            color:white;
            border:none;
            border-radius:5px;
            cursor:pointer;
            margin-bottom:10px;
          }
        </style>
      </head>
      <body>
        <button class="print-btn" onclick="window.print()">🖨️ Imprimir</button>

        <h2>Remisión ${remision.numero}</h2>

        <div class="info"><b>Cliente:</b> ${remision.cliente?.nombre || remision.cliente?.empresa}</div>
        <div class="info"><b>Fecha:</b> ${remision.fecha.toISOString().split("T")[0]}</div>
        <div class="info"><b>Observación:</b> ${remision.observacion || "N/A"}</div>

        <table>
          <tr>
            <th>Producto</th>
            <th>Cantidad</th>
          </tr>
    `;

    remision.detalles.forEach((d) => {
      html += `
        <tr>
          <td>${d.inventario.nombre}</td>
          <td>${d.cantidad}</td>
        </tr>
      `;
    });

    html += `
        </table>
      </body>
      </html>
    `;

    res.send(html);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error generando impresión");
  }
};

// Generar PDF de una remisión específica y enviarlo al cliente
export const imprimirRemisionPDF = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const remision = await prisma.remision.findUnique({
      where: { id },
      include: {
        cliente: true,
        detalles: {
          include: { inventario: true }
        }
      }
    });

    if (!remision) return res.status(404).json({ message: "Remisión no encontrada" });

    const empresa = await prisma.configuracion.findFirst();
    const rem = remision; // alias no nulo para tipado posterior
    // ultimo tipo de cambio (si existe)
    let tipoCambioValor: number | null = null;
    try {
      const ultimoTC = await prisma.tipoCambio.findFirst({ orderBy: { createdAt: 'desc' } as any });
      if (ultimoTC && (ultimoTC as any).valor != null) tipoCambioValor = Number((ultimoTC as any).valor);
    } catch {}

    await generarRemisionPDFStreamV2(
      {
        empresa: empresa || {},
        cliente: remision.cliente,
        detalles: remision.detalles as any,
        numero: remision.numero || remision.id,
        fecha: remision.fecha,
        observacion: remision.observacion || null,
        pio: remision.pio || null,
      },
      res
    );
    return;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="remision_${rem.numero || rem.id}.pdf"`);

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    doc.pipe(res);

    const pageWidth = doc.page.width;
    const left = doc.page.margins.left; // 40
    const right = pageWidth - doc.page.margins.right;
    const contentWidth = right - left;

    // Encabezado Empresa
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text(empresa?.razonSocial || "EMPRESA", left, 40, { width: contentWidth, align: "left" })
      .moveDown(0.2)
      .fontSize(10)
      .font("Helvetica")
      .text(`RUC: ${empresa?.ruc || "-"}`)
      .text(`Dirección: ${empresa?.direccion || "-"}`)
      .text(`Tel: ${[empresa?.telefono1, empresa?.telefono2].filter(Boolean).join(" / ")}`)
      .text(`Correo: ${empresa?.correo || "-"}`)
      .text(`Sitio Web: ${empresa?.sitioWeb || "-"}`)
      .moveDown(1);

    // Título Remisión
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("REMISIÓN", left, doc.y, { align: "center", width: contentWidth })
      .moveDown(0.8);

    // Datos principales
    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`No.: ${rem.numero || rem.id}`)
      .text(`Cliente: ${rem.cliente?.nombre || rem.cliente?.empresa || "N/A"}`)
      .text(`Fecha: ${new Date(rem.fecha).toLocaleDateString()}`)
      .text(`Observación: ${rem.observacion || "N/A"}`)
      .moveDown(0.8);

    // Tabla de ítems (Parte | Producto | Cantidad)
    const headerY = doc.y + 6;
    const wParte = 100;
    const wNombre = Math.max(160, contentWidth - (wParte + 90));
    const wCant = contentWidth - (wParte + wNombre);
    const colX = [left, left + wParte, left + wParte + wNombre];

    // Encabezados
    doc.save();
    doc.rect(left, headerY - 6, contentWidth, 20).fill('#e5edff');
    doc.restore();
    doc.font("Helvetica-Bold").fontSize(10);
    doc.text("Parte", colX[0] + 3, headerY, { width: wParte - 6 });
    doc.text("Producto", colX[1] + 3, headerY, { width: wNombre - 6 });
    doc.text("Cant", colX[2], headerY, { width: wCant - 6, align: 'right' });
    doc.moveTo(left, headerY + 14).lineTo(right, headerY + 14).stroke('#cbd5e1');
    doc.font("Helvetica").fontSize(10);

    let y = headerY + 22;
    const rowHeight = 18;
    for (const d of rem.detalles) {
      const inv: any = d.inventario || {};
      const parteTxt = String(inv.numeroParte ?? "");
      const nombreTxt = String(inv.nombre ?? inv.descripcion ?? "");
      const cantidadTxt = String(d.cantidad ?? 0);

      // salto de página simple si no hay espacio
      if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        // volver a dibujar encabezado de tabla
        const yHeader = doc.page.margins.top + 10;
        doc.save();
        doc.rect(left, yHeader - 6, contentWidth, 20).fill('#e5edff');
        doc.restore();
        doc.font("Helvetica-Bold").fontSize(10);
        doc.text("Parte", colX[0] + 3, yHeader, { width: wParte - 6 });
        doc.text("Producto", colX[1] + 3, yHeader, { width: wNombre - 6 });
        doc.text("Cant", colX[2], yHeader, { width: wCant - 6, align: 'right' });
        doc.moveTo(left, yHeader + 14).lineTo(right, yHeader + 14).stroke('#cbd5e1');
        doc.font("Helvetica").fontSize(10);
        y = yHeader + 22;
      }

      doc.text(parteTxt, colX[0] + 3, y - (rowHeight - 6), { width: wParte - 6 });
      doc.text(nombreTxt, colX[1] + 3, y - (rowHeight - 6), { width: wNombre - 6 });
      doc.text(cantidadTxt, colX[2], y - (rowHeight - 6), { width: wCant - 6, align: 'right' });
      y += rowHeight;
    }

    const mensaje = empresa?.mensajeFactura ?? '';
    if (mensaje) {
      doc.moveDown(2);
      doc.fontSize(10).font("Helvetica-Oblique").text(mensaje, { align: "center" });
    }

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error generando PDF de remisión" });
  }
};
