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
    precioVentaSugeridoDolar?: number | null;
    precioVentaPromedioDolar?: number | null;
    precioDolar?: number | null;
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
const fmtMoney = (n: number, symbol: string) =>
  `${symbol} ${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pickPrecioCordoba = (inv?: { precioVentaSugeridoCordoba?: number | null; precioVentaPromedioCordoba?: number | null }) =>
  Number(inv?.precioVentaSugeridoCordoba ?? inv?.precioVentaPromedioCordoba ?? 0) || 0;

const pickPrecioDolar = (
  inv?: { precioVentaSugeridoDolar?: number | null; precioVentaPromedioDolar?: number | null; precioDolar?: number | null },
  tipoCambio?: number | null
) => {
  const directo = Number(
    inv?.precioVentaSugeridoDolar ??
    inv?.precioVentaPromedioDolar ??
    inv?.precioDolar ??
    0
  ) || 0;
  if (directo > 0) return directo;
  const cordoba = pickPrecioCordoba(inv as any);
  if (tipoCambio && tipoCambio > 0) return cordoba / tipoCambio;
  return 0;
};

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
    tipoCambio,
  }: {
    empresa: Empresa;
    cliente: Cliente;
    detalles: Detalle[];
    numero: string | number;
    fecha: Date | string;
    observacion?: string | null;
    pio?: string | null;
    entregadoA?: string | null;
    tipoCambio?: number | null;
  },
  res: Response
) {
  const doc = new PDFDocument({ size: "A4", margin: 28 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="remision_${numero}.pdf"`);
  doc.pipe(res);

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const left = doc.page.margins.left;
  const right = pageWidth - doc.page.margins.right;
  const contentWidth = right - left;
  const colorPrimary = "#0f172a";
  const colorAccent = "#0ea5e9";
  const colorMuted = "#475569";
  const colorBorder = "#1f2937";

  const drawHeader = () => {
    const logoPath = resolveLogoPath((empresa as any)?.logoUrl ?? null);
    if (logoPath) {
      try { doc.image(logoPath, left, 24, { width: 150 }); } catch {}
    }
    doc.fillColor(colorPrimary).font("Helvetica-Bold").fontSize(13);
    doc.text("NOTA DE REMISION", left, 28, { width: contentWidth, align: "center" });
    doc.fontSize(10).fillColor(colorMuted);
    doc.text(`Numero: ${numero}`, left, 44, { width: contentWidth, align: "center" });

    // Datos de empresa arriba (fuera de la tabla)
    const contacto = [
      empresa?.telefono1 || empresa?.telefono2 || "",
      empresa?.correo || "",
    ].filter(Boolean).join(" | ");
    const infoY = 64;
    const infoWidth = contentWidth * 0.6;
    const infoX = right - infoWidth;
    doc.font("Helvetica-Bold").fontSize(9).fillColor(colorPrimary);
    doc.text(empresa?.razonSocial || "Servicios Multiples e importaciones AYHER", infoX, infoY, { width: infoWidth, align: "right" });
    if (contacto) {
      doc.font("Helvetica").fontSize(9).fillColor(colorMuted);
      doc.text(contacto, infoX, infoY + 12, { width: infoWidth, align: "right" });
    }
  };

  const drawDatosGenerales = (startY: number) => {
    const rows: Array<{ label1: string; value1: string; label2: string; value2: string; height?: number }> = [
      { label1: "Entregado a", value1: entregadoA || cliente?.nombre || cliente?.empresa || "N/A", label2: "Fecha", value2: fmtDate(fecha) },
      { label1: "Empresa", value1: cliente?.empresa || cliente?.nombre || "N/A", label2: "RUC", value2: cliente?.ruc || empresa?.ruc || "" },
      { label1: "Direccion", value1: cliente?.direccion || empresa?.direccion || "", label2: "Pedido No.", value2: pio || "-", height: 48 },
    ];
    const colW = contentWidth / 2;
    const rowH = 22;

    doc.save().lineWidth(1).strokeColor(colorBorder);
    rows.forEach((r, idx) => {
      const h = r.height || rowH;
      const y = startY + rows.slice(0, idx).reduce((acc, x) => acc + (x.height || rowH), 0);
      if (idx % 2 === 0) doc.rect(left, y, contentWidth, h).fillOpacity(0.06).fill(colorAccent).fillOpacity(1);
      doc.rect(left, y, contentWidth, h).stroke();
      doc.moveTo(left + colW, y).lineTo(left + colW, y + h).stroke();
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(colorPrimary);
      doc.text(`${r.label1}:`, left + 6, y + 5, { width: 90 });
      doc.font("Helvetica").fillColor(colorMuted).text(r.value1, left + 96, y + 5, { width: colW - 110 });
      doc.font("Helvetica-Bold").fillColor(colorPrimary).text(`${r.label2}:`, left + colW + 6, y + 5, { width: 90 });
      doc.font("Helvetica").fillColor(colorMuted).text(r.value2, left + colW + 96, y + 5, { width: colW - 110 });
    });
    doc.restore();
    const totalHeight = rows.reduce((acc, x) => acc + (x.height || rowH), 0);
    return startY + totalHeight + 10;
  };

  const drawItemsTable = (startY: number) => {
    const codeW = 60;
    const qtyW = 50;
    const priceCW = 70;
    const totalCW = 80;
    const priceUW = 70;
    const totalUW = 80;
    const fixedWidth = codeW + qtyW + priceCW + totalCW + priceUW + totalUW;
    let descW = contentWidth - fixedWidth;
    if (descW < 110) descW = 110;
    if (descW + fixedWidth > contentWidth) descW = contentWidth - fixedWidth;
    const cols = [
      { title: "COD", w: codeW },
      { title: "DESCRIPCION", w: descW },
      { title: "CANT.", w: qtyW },
      { title: "PRECIO C$", w: priceCW },
      { title: "TOTAL C$", w: totalCW },
      { title: "PRECIO $", w: priceUW },
      { title: "TOTAL $", w: totalUW },
    ];
    const colX: number[] = [];
    cols.reduce((acc, c) => { colX.push(acc); return acc + c.w; }, left);

    const headerH = 20;
    doc.save().rect(left, startY, contentWidth, headerH).fill(colorPrimary).restore();
    doc.save().lineWidth(1).strokeColor(colorBorder);
    doc.rect(left, startY, contentWidth, headerH).stroke();
    for (let i = 1; i < cols.length; i++) doc.moveTo(colX[i], startY).lineTo(colX[i], startY + headerH).stroke();
    doc.restore();
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#e2e8f0");
    cols.forEach((c, idx) => doc.text(c.title, colX[idx] + 3, startY + 5, { width: c.w - 6, align: "center" }));

    let y = startY + headerH;
    const bottomLimit = pageHeight - doc.page.margins.bottom - 150;
    const filas = Array.isArray(detalles) ? detalles : [];
    doc.font("Helvetica").fontSize(9).fillColor(colorPrimary);

    let totalCordoba = 0;
    let totalDolar = 0;

    filas.forEach((d, idx) => {
      const codigo = d.inventario?.numeroParte || d.numeroParte || "-";
      const desc = d.inventario?.nombre || d.inventario?.descripcion || d.nombre || d.descripcion || "";
      const cant = Number(d.cantidad || 0);
      const precioC = pickPrecioCordoba(d.inventario as any);
      const precioU = pickPrecioDolar(d.inventario as any, tipoCambio);
      const subtotalC = cant * precioC;
      const subtotalU = cant * precioU;
      totalCordoba += subtotalC;
      totalDolar += subtotalU;
      const descH = doc.heightOfString(desc, { width: cols[1].w - 8 });
      const rowH = Math.max(26, descH + 10);

      if (y + rowH > bottomLimit) {
        doc.addPage();
        drawHeader();
        y = 118;
        doc.save().rect(left, y, contentWidth, headerH).fill(colorPrimary).restore();
        doc.save().lineWidth(1).strokeColor(colorBorder);
        doc.rect(left, y, contentWidth, headerH).stroke();
        for (let i = 1; i < cols.length; i++) doc.moveTo(colX[i], y).lineTo(colX[i], y + headerH).stroke();
        doc.restore();
        doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#e2e8f0");
        cols.forEach((c, idx2) => doc.text(c.title, colX[idx2] + 3, y + 5, { width: c.w - 6, align: "center" }));
        doc.font("Helvetica").fontSize(9).fillColor(colorPrimary);
        y += headerH;
      }

      if (idx % 2 === 0) {
        doc.save().rect(left, y, contentWidth, rowH).fill("#f8fafc").restore();
      }
      doc.save().lineWidth(1).strokeColor(colorBorder);
      doc.rect(left, y, contentWidth, rowH).stroke();
      for (let i = 1; i < cols.length; i++) doc.moveTo(colX[i], y).lineTo(colX[i], y + rowH).stroke();
      doc.restore();

      const centerY = y + 5;
      doc.text(String(codigo), colX[0] + 3, centerY, { width: cols[0].w - 6, align: "center" });
      doc.text(desc, colX[1] + 3, centerY, { width: cols[1].w - 6, align: "center" });
      doc.text(String(cant), colX[2] + 3, centerY, { width: cols[2].w - 6, align: "center" });
      doc.text(fmtMoney(precioC, "C$"), colX[3] + 3, centerY, { width: cols[3].w - 6, align: "right" });
      doc.text(fmtMoney(subtotalC, "C$"), colX[4] + 3, centerY, { width: cols[4].w - 6, align: "right" });
      doc.text(fmtMoney(precioU, "$"), colX[5] + 3, centerY, { width: cols[5].w - 6, align: "right" });
      doc.text(fmtMoney(subtotalU, "$"), colX[6] + 3, centerY, { width: cols[6].w - 6, align: "right" });

      y += rowH;
    });

    const totalRowH = 26;
    if (y + totalRowH > bottomLimit) {
      doc.addPage();
      drawHeader();
      y = 118;
    }

    doc.save().lineWidth(1.1).strokeColor(colorBorder);
    doc.rect(left, y, contentWidth, totalRowH).stroke();
    for (let i = 1; i < cols.length; i++) doc.moveTo(colX[i], y).lineTo(colX[i], y + totalRowH).stroke();
    doc.restore();

    doc.save().font("Helvetica-Bold").fontSize(10).fillColor(colorPrimary);
    doc.text("TOTAL C$", colX[2] + 3, y + 7, { width: cols[2].w + cols[3].w - 6, align: "right" });
    doc.text(fmtMoney(totalCordoba, "C$"), colX[4] + 3, y + 7, { width: cols[4].w - 6, align: "right" });
    doc.text("TOTAL $", colX[5] + 3, y + 7, { width: cols[5].w - 6, align: "right" });
    doc.fillColor(colorPrimary).text(fmtMoney(totalDolar, "$"), colX[6] + 3, y + 7, { width: cols[6].w - 6, align: "right" });
    doc.restore();

    return y + totalRowH + 8;
  };

  const drawFirmas = (startY: number) => {
    const rowH = 26;
    const labelW = 120;
    const fechaW = 110;
    const gridColor = colorBorder;

    doc.save().lineWidth(1).strokeColor(gridColor);
    doc.rect(left, startY, contentWidth, rowH * 2).stroke();
    doc.rect(left + contentWidth - fechaW, startY, fechaW, rowH * 2).stroke().fillOpacity(0.12).fill("#9ca3af").fillOpacity(1);
    doc.moveTo(left, startY + rowH).lineTo(right, startY + rowH).stroke(gridColor);
    doc.moveTo(left + labelW, startY).lineTo(left + labelW, startY + rowH * 2).stroke(gridColor);
    doc.moveTo(left + contentWidth - fechaW, startY).lineTo(left + contentWidth - fechaW, startY + rowH * 2).stroke(gridColor);
    doc.restore();

    doc.font("Helvetica").fontSize(9.5).fillColor(colorPrimary);
    doc.text("Recibi Conforme:", left + 6, startY + 6, { width: labelW - 12 });
    doc.text("Entregue Conforme:", left + 6, startY + rowH + 6, { width: labelW - 12 });

    const fechaLabelY = startY + 5;
    const fechaValorY = startY + rowH + 3;
    doc.font("Helvetica-Bold").fillColor(colorPrimary).text("Fecha:", left + contentWidth - fechaW + 6, fechaLabelY, { width: fechaW - 12, align: "left" });
    doc.font("Helvetica").fillColor(colorMuted).text(fmtDate(fecha), left + contentWidth - fechaW + 6, fechaValorY, { width: fechaW - 12, align: "right" });

    return startY + rowH * 2 + 8;
  };

  drawHeader();
  let cursorY = 104;
  cursorY = drawDatosGenerales(cursorY);
  cursorY = drawItemsTable(cursorY + 4);
  cursorY = drawFirmas(cursorY + 4);

  doc.font("Helvetica").fontSize(9.5).fillColor(colorPrimary);
  doc.text("Atentamente,", left, cursorY + 8);
  doc.font("Helvetica-Bold").text(empresa?.razonSocial || "SERVICIOS MULTIPLES E IMPORTADORA AyHer", left, cursorY + 20);

  doc.end();
}
