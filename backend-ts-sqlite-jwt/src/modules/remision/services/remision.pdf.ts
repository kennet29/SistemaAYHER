import PDFDocument from "pdfkit";
import type { Response } from "express";
import { resolveLogoPath } from "../../../utils/logo";

type Empresa = {
  razonSocial?: string | null;
  ruc?: string | null;
  direccion?: string | null;
  telefono1?: string | null;
  telefono2?: string | null;
  correo?: string | null;
  sitioWeb?: string | null;
  logoUrl?: string | null;
};

type Cliente = {
  nombre?: string | null;
  empresa?: string | null;
  direccion?: string | null;
  ruc?: string | null;
  ciudad?: string | null;
  pais?: string | null;
} | null;

type Detalle = {
  inventario?: {
    numeroParte?: string | null;
    nombre?: string | null;
    descripcion?: string | null;
    precioVentaSugeridoCordoba?: number | null;
    precioVentaPromedioCordoba?: number | null;
  } | null;
  numeroParte?: string | null;
  nombre?: string | null;
  descripcion?: string | null;
  cantidad?: number | null;
};

const fmtDate = (val: Date | string) => {
  try {
    return new Date(val).toLocaleDateString("es-NI", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return String(val);
  }
};
const fmtNIO = (n: number) => `C$ ${Number(n || 0).toFixed(2)}`;
const pickPrecioCordoba = (inv?: { precioVentaSugeridoCordoba?: number | null; precioVentaPromedioCordoba?: number | null }) =>
  Number(inv?.precioVentaSugeridoCordoba ?? inv?.precioVentaPromedioCordoba ?? 0) || 0;

export async function generarRemisionPDFStreamV2(
  {
    empresa,
    cliente,
    detalles,
    numero,
    fecha,
    observacion,
    pio,
    entregadoA,
  }: {
    empresa: Empresa;
    cliente: Cliente;
    detalles: Detalle[];
    numero: string | number;
    fecha: Date | string;
    observacion?: string | null;
    pio?: string | null;
    entregadoA?: string | null;
  },
  res: Response
) {
  const doc = new PDFDocument({ size: "A4", margin: 36 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="remision_${numero}.pdf"`);
  doc.pipe(res);

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const left = doc.page.margins.left;
  const right = pageWidth - doc.page.margins.right;
  const contentWidth = right - left;

  const drawHeader = () => {
    const logoPath = resolveLogoPath((empresa as any)?.logoUrl ?? null);
    if (logoPath) {
      try { doc.image(logoPath, right - 150, 24, { width: 140 }); } catch {}
    }
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827");
    doc.text("NOTA DE REMISION", left, 38, { width: contentWidth, align: "center" });
    doc.fillColor("#b91c1c").fontSize(11).text(`N° ${numero}`, left, 54, { width: contentWidth, align: "center" });
  };

  const drawDatosGenerales = (startY: number) => {
    const rows = [
      ["Entregado a:", entregadoA || cliente?.nombre || cliente?.empresa || "N/A", "Fecha:", fmtDate(fecha)],
      ["Empresa:", cliente?.empresa || cliente?.nombre || "N/A", "Ruc:", cliente?.ruc || empresa?.ruc || ""],
      ["Dirección:", cliente?.direccion || empresa?.direccion || "", "Pedido N°:", pio || "-"],
    ];
    const colW = contentWidth / 2;
    const rowH = 22;
    doc.save().lineWidth(1).strokeColor("#111827");
    rows.forEach((r, idx) => {
      const y = startY + idx * rowH;
      doc.rect(left, y, contentWidth, rowH).stroke();
      doc.moveTo(left + colW, y).lineTo(left + colW, y + rowH).stroke();
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827");
      doc.text(r[0], left + 4, y + 6, { width: 90 });
      doc.font("Helvetica").text(r[1], left + 96, y + 6, { width: colW - 100 });
      doc.font("Helvetica-Bold").text(r[2], left + colW + 4, y + 6, { width: 90 });
      doc.font("Helvetica").text(r[3], left + colW + 96, y + 6, { width: colW - 100 });
    });
    doc.restore();
    return startY + rows.length * rowH + 10;
  };

  const drawItemsTable = (startY: number) => {
    const codeW = 100;
    const qtyW = 80;
    const priceW = 90;
    const totalW = 100;
    const descW = Math.max(140, contentWidth - (codeW + qtyW + priceW + totalW));
    const cols = [
      { title: "CODIGO", w: codeW },
      { title: "DESCRIPCION PRODUCTO", w: descW },
      { title: "CANTIDAD", w: qtyW },
      { title: "PRECIO", w: priceW },
      { title: "TOTAL", w: totalW },
    ];
    const colX: number[] = [];
    cols.reduce((acc, c) => { colX.push(acc); return acc + c.w; }, left);

    const headerH = 22;
    doc.save().rect(left, startY, contentWidth, headerH).fill("#cbd5e1").restore();
    doc.save().lineWidth(1).strokeColor("#111827");
    doc.rect(left, startY, contentWidth, headerH).stroke();
    doc.moveTo(colX[1], startY).lineTo(colX[1], startY + headerH).stroke();
    doc.moveTo(colX[2], startY).lineTo(colX[2], startY + headerH).stroke();
    doc.moveTo(colX[3], startY).lineTo(colX[3], startY + headerH).stroke();
    doc.moveTo(colX[4], startY).lineTo(colX[4], startY + headerH).stroke();
    doc.restore();
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827");
    cols.forEach((c, idx) => doc.text(c.title, colX[idx] + 4, startY + 6, { width: c.w - 8, align: "center" }));

    let y = startY + headerH;
    const bottomLimit = pageHeight - doc.page.margins.bottom - 140;
    const filas = Array.isArray(detalles) ? detalles : [];
    doc.font("Helvetica").fontSize(10).fillColor("#111827");

    let totalGeneral = 0;
    filas.forEach((d, idx) => {
      const codigo = d.inventario?.numeroParte || d.numeroParte || "-";
      const desc = d.inventario?.nombre || d.inventario?.descripcion || d.nombre || d.descripcion || "";
      const cant = Number(d.cantidad || 0);
      const precio = pickPrecioCordoba(d.inventario as any);
      const subtotal = cant * precio;
      totalGeneral += subtotal;
      const descH = doc.heightOfString(desc, { width: cols[1].w - 10 });
      const rowH = Math.max(32, descH + 12);

      if (y + rowH > bottomLimit) {
        doc.addPage();
        drawHeader();
        y = 120;
        doc.save().rect(left, y, contentWidth, headerH).fill("#cbd5e1").restore();
        doc.save().lineWidth(1).strokeColor("#111827");
        doc.rect(left, y, contentWidth, headerH).stroke();
        doc.moveTo(colX[1], y).lineTo(colX[1], y + headerH).stroke();
        doc.moveTo(colX[2], y).lineTo(colX[2], y + headerH).stroke();
        doc.moveTo(colX[3], y).lineTo(colX[3], y + headerH).stroke();
        doc.moveTo(colX[4], y).lineTo(colX[4], y + headerH).stroke();
        doc.restore();
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827");
        cols.forEach((c, idx2) => doc.text(c.title, colX[idx2] + 4, y + 6, { width: c.w - 8, align: "center" }));
        doc.font("Helvetica").fontSize(10).fillColor("#111827");
        y += headerH;
      }

      if (idx % 2 === 0) {
        doc.save().rect(left, y, contentWidth, rowH).fill("#f8fafc").restore();
      }
      doc.save().lineWidth(1).strokeColor("#111827");
      doc.rect(left, y, contentWidth, rowH).stroke();
      doc.moveTo(colX[1], y).lineTo(colX[1], y + rowH).stroke();
      doc.moveTo(colX[2], y).lineTo(colX[2], y + rowH).stroke();
      doc.moveTo(colX[3], y).lineTo(colX[3], y + rowH).stroke();
      doc.moveTo(colX[4], y).lineTo(colX[4], y + rowH).stroke();
      doc.restore();

      doc.text(String(codigo), colX[0] + 4, y + 6, { width: cols[0].w - 8, align: "center" });
      doc.text(desc, colX[1] + 4, y + 6, { width: cols[1].w - 8, align: "center" });
      doc.text(String(cant), colX[2] + 4, y + 6, { width: cols[2].w - 8, align: "center" });
      doc.text(fmtNIO(precio), colX[3] + 4, y + 6, { width: cols[3].w - 8, align: "right" });
      doc.text(fmtNIO(subtotal), colX[4] + 4, y + 6, { width: cols[4].w - 8, align: "right" });

      y += rowH;
    });

    // Total general
    const totalRowH = 28;
    // Verificar si hay espacio para el total, si no, crear nueva página
    if (y + totalRowH > bottomLimit) {
      doc.addPage();
      drawHeader();
      y = 120;
    }
    
    // Dibujar fila de TOTAL con bordes
    doc.save().lineWidth(1).strokeColor("#111827");
    doc.rect(left, y, contentWidth, totalRowH).stroke();
    doc.moveTo(colX[1], y).lineTo(colX[1], y + totalRowH).stroke();
    doc.moveTo(colX[2], y).lineTo(colX[2], y + totalRowH).stroke();
    doc.moveTo(colX[3], y).lineTo(colX[3], y + totalRowH).stroke();
    doc.moveTo(colX[4], y).lineTo(colX[4], y + totalRowH).stroke();
    doc.restore();
    
    doc.save().font("Helvetica-Bold").fontSize(11).fillColor("#111827");
    doc.text("TOTAL", colX[2] + 4, y + 8, { width: cols[2].w + cols[3].w - 8, align: "right" });
    doc.text(fmtNIO(totalGeneral), colX[4] + 4, y + 8, { width: cols[4].w - 8, align: "right" });
    doc.restore();

    return y + totalRowH + 10;
  };

  const drawFirmas = (startY: number) => {
    const rowH = 28; // más alto para facilitar firma
    const labelW = 120;
    const fechaW = 110;
    const gridColor = "#111827";

    // Marco exterior
    doc.save().lineWidth(1).strokeColor(gridColor);
    doc.rect(left, startY, contentWidth, rowH * 2).stroke();
    // Columna fecha (gris)
    doc.rect(left + contentWidth - fechaW, startY, fechaW, rowH * 2).stroke().fillOpacity(0.12).fill("#9ca3af").fillOpacity(1);
    // Divide filas
    doc.moveTo(left, startY + rowH).lineTo(right, startY + rowH).stroke(gridColor);
    // Divide columnas principales
    doc.moveTo(left + labelW, startY).lineTo(left + labelW, startY + rowH * 2).stroke(gridColor);
    doc.moveTo(left + contentWidth - fechaW, startY).lineTo(left + contentWidth - fechaW, startY + rowH * 2).stroke(gridColor);
    doc.restore();

    doc.font("Helvetica").fontSize(10).fillColor("#111827");
    doc.text("Recibi Conforme:", left + 6, startY + 8, { width: labelW - 12 });
    doc.text("Entregue Conforme:", left + 6, startY + rowH + 8, { width: labelW - 12 });

    // Fecha en su propio cuadro gris
    const fechaLabelY = startY + 6;
    const fechaValorY = startY + rowH + 4;
    doc.font("Helvetica-Bold").text("Fecha:", left + contentWidth - fechaW + 6, fechaLabelY, { width: fechaW - 12, align: "left" });
    doc.font("Helvetica").text(fmtDate(fecha), left + contentWidth - fechaW + 6, fechaValorY, { width: fechaW - 12, align: "right" });

    return startY + rowH * 2 + 10;
  };

  drawHeader();
  let cursorY = 110;
  cursorY = drawDatosGenerales(cursorY);
  cursorY = drawItemsTable(cursorY + 6);
  cursorY = drawFirmas(cursorY + 6);

  doc.font("Helvetica").fontSize(10).fillColor("#111827");
  doc.text("Atentamente,", left, cursorY + 8);
  doc.text("SERVICIOS MÚLTIPLES E IMPORTADORA AyHer", left, cursorY + 22);

  doc.end();
}
