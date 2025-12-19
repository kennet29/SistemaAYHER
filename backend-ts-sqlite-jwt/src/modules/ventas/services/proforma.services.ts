import PDFDocument from "pdfkit";
import fs from "fs";
import type { Response } from "express";
import { resolveLogoPath } from "../../../utils/logo";

const normalizePio = (pio?: string | null) => {
  return typeof pio === "string" && pio.trim().length > 0 ? pio.trim() : "N/A";
};

const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export async function generarProformaPDF({ empresa, cliente, detalles, totalCordoba, totalDolar, pio }: any) {
  const fileName = `proforma_${Date.now()}.pdf`;
  const filePath = `./tmp/${fileName}`;

  if (!fs.existsSync("./tmp")) fs.mkdirSync("./tmp");

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // ===== Logo =====
  const logoPath = resolveLogoPath(empresa?.logoUrl);
  if (logoPath) {
    try {
      doc.image(logoPath, 40, 40, { width: 120 });
    } catch {
      doc.fontSize(12).text("(Logo no disponible)", 40, 40);
    }
  }

  // ===== Encabezado Empresa =====
  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .text(empresa.razonSocial || "EMPRESA", 200, 40)
    .moveDown(0.2)
    .fontSize(10)
    .font("Helvetica")
    .text(`RUC: ${empresa.ruc}`)
    .text(`Dirección: ${empresa.direccion}`)
    .text(`Tel: ${empresa.telefono1}${empresa.telefono2 ? " / " + empresa.telefono2 : ""}`)
    .text(`Correo: ${empresa.correo}`)
    .text(`Sitio Web: ${empresa.sitioWeb}`)
    .moveDown();

  doc.moveDown(1.5).fontSize(16).font("Helvetica-Bold").text("PROFORMA", { align: "center" });
  doc.moveDown(0.5);

  // ===== Cliente =====
  const displayPio = normalizePio(pio);
  doc
    .fontSize(12)
    .font("Helvetica")
    .text(`Cliente: ${cliente?.nombre ?? "N/A"}`)
    .text(`Fecha: ${new Date().toLocaleDateString()}`)
    .text(`OL: ${displayPio}`)
    .moveDown(1);

  // ===== Tabla =====
  const tableTop = 200;
  const colX = [40, 120, 300, 370, 440];

  doc.font("Helvetica-Bold");
  ["Parte", "Nombre", "Cant", "Precio", "Subtotal"].forEach((txt, i) =>
    doc.text(txt, colX[i], tableTop)
  );

  doc.moveTo(40, tableTop + 15).lineTo(550, tableTop + 15).stroke();
  doc.font("Helvetica");

  let y = tableTop + 25;
  detalles.forEach((d: any) => {
    doc.text(d.numeroParte, colX[0], y);
    doc.text(d.nombre, colX[1], y, { width: 160 });
    doc.text(String(d.cantidad), colX[2], y);
    doc.text(`C$ ${d.precio.toFixed(2)}`, colX[3], y);
    doc.text(`C$ ${(d.cantidad * d.precio).toFixed(2)}`, colX[4], y);
    y += 20;
  });

  // ===== Totales =====
  y += 10;
  doc.font("Helvetica-Bold");
  doc.text(`Total C$: ${totalCordoba.toFixed(2)}`, 350, y);
  y += 20;
  doc.text(`Total USD: $${totalDolar.toFixed(2)}`, 350, y);

  // ===== Mensaje de empresa =====
  if (empresa.mensajeFactura) {
    doc.moveDown(2);
    doc.fontSize(10).font("Helvetica-Oblique").text(empresa.mensajeFactura, { align: "center" });
  }

  doc.end();
  return filePath;
}

// Genera y envía el PDF directamente al Response sin escribir en disco
export async function generarProformaPDFStream(
  { empresa, cliente, detalles, totalCordoba, totalDolar, tipoCambio, pio }: any,
  res: Response
) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  // Encabezados de respuesta para descarga
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="proforma.pdf"`);

  doc.pipe(res);

  const pageWidth = doc.page.width;
  const left = doc.page.margins.left; // 40
  const right = pageWidth - doc.page.margins.right; // usable right x
  const contentWidth = right - left;

  // ===== Header band =====
  const headerTop = 36;
  const headerHeight = 82;
  doc.save();
  doc.rect(left, headerTop, contentWidth, headerHeight).fill("#ffffff");
  doc.restore();

  // ===== Logo (empresa.logoUrl o fallback a carpeta img) =====
  const logoPath = resolveLogoPath(empresa?.logoUrl);
  if (logoPath) {
    try { doc.image(logoPath, left + 8, headerTop + 8, { width: 110 }); } catch {}
  }

  // ===== Encabezado Empresa (tarjeta limpia dentro de la banda) =====
  const infoX = left + 140;
  const infoPadding = 10;
  // tarjeta blanca detrás del texto
  doc.save();
  doc.roundedRect(infoX - 8, headerTop + 8, contentWidth - (infoX - left) - 16, headerHeight - 16, 8)
    .fill('#ffffff');
  // barra de acento
  doc.fill('#2563eb').rect(infoX - 8, headerTop + 8, 4, headerHeight - 16).fill();
  doc.restore();

  // nombre y datos de empresa
  doc.font('Helvetica-Bold').fontSize(18).fillColor('#0b3a9b')
    .text(empresa?.razonSocial || 'EMPRESA', infoX + infoPadding - 2, headerTop + 12, {
      width: contentWidth - (infoX - left) - (infoPadding * 2) - 8,
    });
  doc.font('Helvetica').fontSize(10).fillColor('#334155');
  const linesY = headerTop + 36;
  const linesW = contentWidth - (infoX - left) - (infoPadding * 2) - 8;
  const lineStep = 12; // mayor interlineado
  const displayPio = normalizePio(pio);
  doc.text(`RUC: ${empresa?.ruc ?? ''}`, infoX + infoPadding, linesY, { width: linesW });
  doc.text(`Direccion: ${empresa?.direccion ?? ''}`, infoX + infoPadding, doc.y + lineStep, { width: linesW });
  doc.text(`Tel: ${[empresa?.telefono1, empresa?.telefono2].filter(Boolean).join(' / ')}`, infoX + infoPadding, doc.y + lineStep, { width: linesW });
  doc.text(`Correo: ${empresa?.correo ?? ''}`, infoX + infoPadding, doc.y + lineStep, { width: linesW });
  doc.text(`Sitio Web: ${empresa?.sitioWeb ?? ''}`, infoX + infoPadding, doc.y + lineStep, { width: linesW });

  // Título Proforma
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor('#0b3a9b')
    .text("PROFORMA", left, headerTop + headerHeight + 24, { align: "center", width: contentWidth });

  // ===== Cliente =====
  const metaTop = headerTop + headerHeight + 34;
  doc.save();
  doc.roundedRect(left, metaTop, contentWidth, 50, 6).stroke("#cbd5e1");
  doc.restore();
  doc
    .fontSize(11)
    .fillColor('#111827')
    .font("Helvetica")
    .text(`Cliente: ${cliente?.nombre ?? "N/A"}`, left + 10, metaTop + 10, { width: contentWidth / 2 - 12 })
    .text(`Fecha: ${new Date().toLocaleDateString()}`, left + contentWidth / 2, metaTop + 10, { width: contentWidth / 2 - 12 })
    .text(`Tipo de cambio: ${tipoCambio ? Number(tipoCambio).toFixed(4) : '-'}`, left + contentWidth / 2, metaTop + 28, { width: contentWidth / 2 - 12 });
  doc.text(`OL: ${displayPio}`, left + 10, doc.y + lineStep, { width: contentWidth - 20 });

  // ===== Tabla ===== con paginación A4
  const tableTop = metaTop + 70;

  // Calcular anchos de columnas en base al ancho disponible
  // Parte | Nombre | Cant | Precio | Subtotal
  const wCant = 60;
  const wPrecio = 80;
  const wSub = 90;
  let wParte = 80;
  let wNombre = contentWidth - (wParte + wCant + wPrecio + wSub);
  if (wNombre < 130) {
    const deficit = 130 - wNombre;
    const reducible = Math.min(deficit, Math.max(40, wParte) - 40);
    wParte = Math.max(40, wParte - reducible);
    wNombre = contentWidth - (wParte + wCant + wPrecio + wSub);
  }

  const colX = [left, left + wParte, left + wParte + wNombre, left + wParte + wNombre + wCant, right - wSub];

  // Header row background
  const drawTableHeader = (yHeader: number) => {
    doc.save();
    doc.rect(left, yHeader - 6, contentWidth, 20).fill('#e5edff');
    doc.restore();
    doc.font("Helvetica-Bold").fillColor('#0f172a').fontSize(10);
    doc.text("Parte", colX[0], yHeader - 4, { width: wParte });
    doc.text("Nombre", colX[1], yHeader - 4, { width: wNombre });
    doc.text("Cant", colX[2], yHeader - 4, { width: wCant, align: 'right' });
    doc.text("Precio", colX[3], yHeader - 4, { width: wPrecio, align: 'right' });
    doc.text("Subtotal", colX[4], yHeader - 4, { width: wSub, align: 'right' });
    doc.moveTo(left, yHeader + 12).lineTo(right, yHeader + 12).stroke('#cbd5e1');
    doc.font("Helvetica").fillColor('#111827');
  };

  // Parámetros de paginación
  const pageHeight = doc.page.height;
  const bottomMargin = doc.page.margins.bottom;
  const startY = tableTop + 18;
  let rowFont = 10;
  let rowHeight = 18;
  let rows = Array.isArray(detalles) ? detalles : [];
  doc.fontSize(rowFont);

  // Func de truncado para celdas
  const truncate = (text: string, maxWidth: number) => {
    if (!text) return "";
    let t = String(text);
    while (doc.widthOfString(t) > maxWidth && t.length > 1) t = t.slice(0, -1);
    if (t.length < String(text).length) t = t.slice(0, Math.max(0, t.length - 1)) + '…';
    return t;
  };

  // Dibuja header de la tabla inicial
  drawTableHeader(tableTop);
  let y = startY;
  const usableBottom = pageHeight - bottomMargin - 100; // deja espacio para totales si es la última

  rows.forEach((d: any, idx: number) => {
    // Salto de página si no cabe la siguiente fila
    if (y + rowHeight > usableBottom) {
      doc.addPage();
      // en páginas siguientes dibuja solo el encabezado de tabla
      const yHeader = doc.page.margins.top + 10;
      drawTableHeader(yHeader);
      y = yHeader + 18;
    }
    if (idx % 2 === 0) {
      doc.save();
      doc.rect(left, y - (rowHeight - 2), contentWidth, rowHeight).fill('#f8fafc');
      doc.restore();
    }
    const cantidad = Number(d.cantidad || 0);
    const precio = Number(d.precio || 0);
    const subtotal = cantidad * precio;
    const parteTxt = truncate(d.numeroParte ?? "", wParte - 6);
    const nombreTxt = truncate(d.nombre ?? "", wNombre - 6);
    doc.fillColor('#111827');
    doc.text(parteTxt, colX[0] + 3, y - (rowHeight - 6), { width: wParte - 6 });
    doc.text(nombreTxt, colX[1] + 3, y - (rowHeight - 6), { width: wNombre - 6 });
    doc.text(String(cantidad), colX[2], y - (rowHeight - 6), { width: wCant, align: 'right' });
    doc.text(`C$ ${precio.toFixed(2)}`, colX[3], y - (rowHeight - 6), { width: wPrecio, align: 'right' });
    doc.text(`C$ ${subtotal.toFixed(2)}`, colX[4], y - (rowHeight - 6), { width: wSub, align: 'right' });
    y += rowHeight;
  });

  // ===== Totales =====
  y += 12;
  doc.save();
  const totalsBoxWidth = 200;
  doc.roundedRect(right - totalsBoxWidth, y, totalsBoxWidth, 48, 6).stroke('#94a3b8');
  doc.restore();
  doc.font("Helvetica").fillColor('#111827');
  doc.text('Total C$', right - totalsBoxWidth + 10, y + 10, { width: 90 });
  doc.text(`C$ ${Number(totalCordoba||0).toFixed(2)}`, right - 10, y + 10, { width: 90, align: 'right' });
  doc.text('Total $', right - totalsBoxWidth + 10, y + 28, { width: 90 });
  doc.text(`$ ${Number(totalDolar||0).toFixed(2)}`, right - 10, y + 28, { width: 90, align: 'right' });

  // Si no hay espacio suficiente para totales, mover a nueva página
  if (y + 70 > pageHeight - bottomMargin) {
    doc.addPage();
    // repetir cabecera mínima de tabla para contexto (opcional)
    const yHeader = doc.page.margins.top + 10;
    drawTableHeader(yHeader);
    y = yHeader + 18;
  }

  // ===== Mensaje de empresa =====
  if (empresa?.mensajeFactura) {
    doc.moveDown(2);
    doc.fontSize(10).font("Helvetica-Oblique").text(empresa.mensajeFactura, { align: "center" });
  }

  doc.end();
}

// Versión mejorada del PDF de Proforma con marca de agua, pie de página y formateo
export async function generarProformaPDFStreamV2(
  { empresa, cliente, detalles, totalCordoba, totalDolar, tipoCambio, pio }: any,
  res: Response
) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="proforma.pdf"`);
  doc.pipe(res);

  const fmtNIO = (n: number) => {
    try { return new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO', minimumFractionDigits: 2 }).format(Number(n||0)); } catch { return `C$ ${Number(n||0).toFixed(2)}`; }
  };
  const fmtUSD = (n: number) => {
    try { return new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(Number(n||0)); } catch { return `$ ${Number(n||0).toFixed(2)}`; }
  };

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const left = doc.page.margins.left;
  const right = pageWidth - doc.page.margins.right;
  const contentWidth = right - left;

  const drawWatermark = () => {
    doc.save();
    doc.fillColor('#1f2937').fillOpacity(0.06);
    doc.font('Helvetica-Bold').fontSize(110);
    const originX = pageWidth / 2; const originY = pageHeight / 2;
    doc.rotate(-30, { origin: [originX, originY] });
    doc.text('PROFORMA', originX - 300, originY - 60, { width: 600, align: 'center' });
    doc.restore();
  };

  const drawFooter = () => {
    const footerBase = pageHeight - doc.page.margins.bottom;
    const textY = footerBase - 10;
    doc.save();
    doc.moveTo(left, footerBase - 16).lineTo(right, footerBase - 16).stroke('#e5e7eb');
    doc.fontSize(8).fillColor('#000000').font('Helvetica');
    const pageNum = (doc as any).page?.number || 1;
    doc.text('Precios expresados en Cordobas (NIO). Equivalentes en USD al tipo de cambio indicado. Vigencia: 7 dias.', left, textY, { width: contentWidth - 80, lineBreak: false, ellipsis: true });
    doc.text('Pagina ' + pageNum, right - 60, textY, { width: 60, align: 'right', lineBreak: false });
    doc.restore();
  };
  
  const addNewPage = () => {
    doc.addPage();
    drawWatermark();
    drawFooter();
  };





  // Header band
  const headerTop = 36;
  const headerHeight = 86;
  doc.save();
  doc.rect(left, headerTop, contentWidth, headerHeight).fill("#ffffff");
  doc.restore();

  const logoPath = resolveLogoPath(empresa?.logoUrl);
  if (logoPath) { try { doc.image(logoPath, left + 10, headerTop + 10, { width: 108 }); } catch {} }

  doc
    .fillColor('#0f172a')
    .fontSize(18)
    .font("Helvetica-Bold")
    .text(empresa?.razonSocial || "EMPRESA", left + 140, headerTop + 10, { width: contentWidth - 148 })
    .moveDown(0.2)
    .fontSize(10)
    .font("Helvetica")
    .text(`RUC: ${empresa?.ruc ?? ""}`)
    .text(`Dirección: ${empresa?.direccion ?? ""}`)
    .text(`Tel: ${[empresa?.telefono1, empresa?.telefono2].filter(Boolean).join(" / ")}`)
    .text(`Correo: ${empresa?.correo ?? ""}`)
    .text(`Sitio Web: ${empresa?.sitioWeb ?? ""}`);

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor('#0b3a9b')
    .text("PROFORMA", left, headerTop + headerHeight + 12, { align: "center", width: contentWidth });

  const metaTop = headerTop + headerHeight + 58;
  const hasMsg = !!(empresa?.mensajeFactura);
  // Datos adicionales del cliente (opcionales)
  const cliRuc = (cliente?.ruc ?? cliente?.identificacion ?? cliente?.cedula) ?? null;
  const cliEmpresa = cliente?.empresa ?? null;
  const cliContacto = cliente?.nombreContacto ?? null;
  const cliRazon = cliente?.razonSocial ?? null;
  const cliDir = (cliente?.direccion ?? cliente?.address) ?? null;
  const cliTel = [cliente?.telefono1, cliente?.telefono2, cliente?.telefono].filter(Boolean).join(' / ') || null;
  const cliMail = (cliente?.correo ?? cliente?.correo1 ?? cliente?.correo2 ?? cliente?.email) ?? null;
  const extraLeft = [cliRuc, cliEmpresa, cliContacto, cliRazon, cliDir].filter(Boolean).length;
  const extraRight = [cliTel, cliMail].filter(Boolean).length;
  const extraRows = Math.max(extraLeft, extraRight);
  // aumentar altura base y step para más interlineado
  const extraStep = 20;
  const metaLineStep = 16;
  const metaHeight = 60 + (extraRows > 0 ? (extraRows * extraStep) : 0) + (hasMsg ? 28 : 0);
  doc.save();
  doc.lineWidth(1.5);
  doc.roundedRect(left, metaTop, contentWidth, metaHeight, 6).stroke("#64748b");
  doc.restore();
  const displayPio = normalizePio(pio);
  doc
    .fontSize(11)
    .fillColor('#111827')
    .font("Helvetica-Bold")
    .text(`Cliente: ${cliente?.nombre ?? "N/A"}`, left + 10, metaTop + 10, { width: contentWidth / 2 - 12 })
    .text(`Fecha: ${new Date().toLocaleDateString()}`, left + contentWidth / 2, metaTop + 10, { width: contentWidth / 2 - 12, align: 'right' })
    .text(`Tipo de cambio: ${tipoCambio ? Number(tipoCambio).toFixed(4) : '-'}`, left + contentWidth / 2, metaTop + 34, { width: contentWidth / 2 - 12, align: 'right' });
  doc.text(`OL: ${displayPio}`, left + 10, doc.y + metaLineStep, { width: contentWidth - 20 });
  // Campos extra: izquierda (RUC/ID, Empresa, Contacto, Razón/Representante, Dirección)
  let yLeft = metaTop + 36;
  if (cliRuc) { doc.font('Helvetica-Bold').text(`RUC/ID: ${cliRuc}`, left + 10, yLeft, { width: contentWidth / 2 - 12 }); yLeft += extraStep; }
  if (cliEmpresa) { doc.font('Helvetica-Bold').text(`Empresa: ${cliEmpresa}`, left + 10, yLeft, { width: contentWidth / 2 - 12 }); yLeft += extraStep; }
  if (cliContacto) { doc.font('Helvetica-Bold').text(`Contacto: ${cliContacto}`, left + 10, yLeft, { width: contentWidth / 2 - 12 }); yLeft += extraStep; }
  if (cliRazon) { doc.font('Helvetica-Bold').text(`Razon Social: ${cliRazon}`, left + 10, yLeft, { width: contentWidth / 2 - 12 }); yLeft += extraStep; }
  if (cliDir) { doc.font('Helvetica-Bold').text(`Direccion: ${cliDir}`, left + 10, yLeft, { width: contentWidth / 2 - 12 }); yLeft += extraStep; }
  // Campos extra: derecha (Tel, Correo)
  let yRight = metaTop + 54;
  if (cliTel) { doc.font('Helvetica-Bold').text(`Tel: ${cliTel}`, left + contentWidth / 2, yRight, { width: contentWidth / 2 - 12, align: 'right' }); yRight += extraStep; }
  if (cliMail) { doc.font('Helvetica-Bold').text(`Correo: ${cliMail}`, left + contentWidth / 2, yRight, { width: contentWidth / 2 - 12, align: 'right' }); }
  if (hasMsg) {
    doc.fontSize(9).font('Helvetica-Oblique').fillColor('#374151')
      .text(String(empresa.mensajeFactura || ''), left + 10, metaTop + 46 + (extraRows * 16), { width: contentWidth - 20 });
    doc.fontSize(11).font('Helvetica').fillColor('#111827');
  }

  const tableTop = metaTop + metaHeight + 18;
  const wCant = 60;
  const wPrecio = 90;
  const wSub = 110;
  let wParte = 80;
  let wNombre = contentWidth - (wParte + wCant + wPrecio + wSub);
  if (wNombre < 130) {
    const deficit = 130 - wNombre;
    const reducible = Math.min(deficit, Math.max(40, wParte) - 40);
    wParte = Math.max(40, wParte - reducible);
    wNombre = contentWidth - (wParte + wCant + wPrecio + wSub);
  }
  const colX = [left, left + wParte, left + wParte + wNombre, left + wParte + wNombre + wCant, right - wSub];

  const drawTableHeader = (yHeader: number) => {
    const headerH = 24;
    doc.save();
    // Navy header background
    doc.roundedRect(left, yHeader - 8, contentWidth, headerH, 6).fill('#2563eb');
    doc.restore();
    // White header text
    doc.font("Helvetica-Bold").fillColor('#ffffff').fontSize(10);
    const titleY = yHeader - 8 + ((headerH - doc.currentLineHeight(true)) / 2);
    doc.text("Parte", colX[0] + 6, titleY, { width: wParte - 12, align: 'center' });
    doc.text("Descripcion", colX[1] + 6, titleY, { width: wNombre - 12, align: 'center' });
    doc.text("Cant", colX[2], titleY, { width: wCant - 8, align: 'center' });
    doc.text("Precio", colX[3], titleY, { width: wPrecio - 8, align: 'center' });
    doc.text("Subtotal", colX[4], titleY, { width: wSub - 8, align: 'center' });
    // Light separators over dark header
    doc.save();
    doc.strokeColor('#475569').lineWidth(1);
    const vTop = yHeader - 8; const vBot = yHeader + headerH - 8;
    [left + wParte, left + wParte + wNombre, left + wParte + wNombre + wCant, right - wSub]
      .forEach((x) => doc.moveTo(x, vTop).lineTo(x, vBot).stroke());
    doc.restore();
    doc.font("Helvetica").fillColor('#111827');
  };

  const bottomMargin = doc.page.margins.bottom;
  const startY = tableTop + 22;
  const rowFont = 10;
  const padX = 6;
  const padY = 4;
  const rows = Array.isArray(detalles) ? detalles : [];
  doc.fontSize(rowFont);

  const truncate = (text: string, maxWidth: number) => {
    if (!text) return "";
    let t = String(text);
    while (doc.widthOfString(t) > maxWidth && t.length > 1) t = t.slice(0, -1);
    if (t.length < String(text).length) t = t.slice(0, Math.max(0, t.length - 1)) + '…';
    return t;
  };

  drawWatermark();
  drawFooter();

  drawTableHeader(tableTop);
  let y = startY;
  const usableBottom = pageHeight - bottomMargin - 110;

  rows.forEach((d: any, idx: number) => {
    const cantidad = Number(d.cantidad || 0);
    const precio = Number(d.precio || 0);
    const subtotal = cantidad * precio;

    const lineH = doc.currentLineHeight(true);
    const nombreText = String(d.nombre ?? "");
    const nombreH = Math.min(doc.heightOfString(nombreText, { width: wNombre - padX * 2 }), lineH * 2);
    const rowH = Math.max(20, nombreH + padY * 2);

    if (y + rowH > usableBottom) {
      addNewPage();
      const yHeader = doc.page.margins.top + 10;
      drawTableHeader(yHeader);
      y = yHeader + 22;
    }

    // fondo alternado y borde
    doc.save();
    if (idx % 2 === 0) {
      doc.rect(left, y, contentWidth, rowH).fill('#f8fafc');
      doc.fillColor('#111827');
    }
    doc.restore();
    doc.save();
    doc.strokeColor('#64748b').lineWidth(0.8);
    doc.rect(left, y, contentWidth, rowH).stroke();
    // separadores verticales por fila
    [left + wParte, left + wParte + wNombre, left + wParte + wNombre + wCant, right - wSub]
      .forEach((x) => doc.moveTo(x, y).lineTo(x, y + rowH).stroke());
    // línea separadora inferior más definida entre productos
    doc.strokeColor('#475569').lineWidth(1);
    doc.moveTo(left, y + rowH).lineTo(right, y + rowH).stroke();
    doc.restore();

    // celdas
    doc.fillColor('#111827');
    const parteTxt = truncate(d.numeroParte ?? "", wParte - padX * 2);
    doc.text(parteTxt, colX[0] + padX, y + padY, { width: wParte - padX * 2, height: rowH - padY * 2, ellipsis: true });
    // Descripcion m�s abajo y en negrita
    doc.font('Helvetica-Bold');
    doc.text(nombreText, colX[1] + padX, y + padY + 2, { width: wNombre - padX * 2, height: rowH - padY * 2, ellipsis: true });
    doc.font('Helvetica');
    // Cantidad centrada en su columna
    doc.text(String(cantidad), colX[2], y + padY, { width: wCant - padX, align: 'center' });
    doc.text(fmtNIO(precio), colX[3], y + padY, { width: wPrecio - padX, align: 'right' });
    doc.text(fmtNIO(subtotal), colX[4], y + padY, { width: wSub - padX, align: 'right' });

    y += rowH;
  });

  // Totales
  y += 12;
  const totalsBoxWidth = 230;
  const totalsHeight = 60;
  // Si no hay espacio suficiente para los totales, pasar a nueva página
  if (y + totalsHeight + 20 > pageHeight - bottomMargin) {
    addNewPage();
    y = doc.page.margins.top + 10;
  }
  const totalsTop = y;
  doc.save();
  doc.roundedRect(right - totalsBoxWidth, totalsTop, totalsBoxWidth, totalsHeight, 8).fill('#f1f5f9');
  doc.restore();
  doc.font("Helvetica-Bold").fontSize(11).fillColor('#0f172a').text('Resumen', right - totalsBoxWidth + 12, totalsTop + 8);
  doc.font("Helvetica").fontSize(10).fillColor('#111827');
  doc.text('Total C$', right - totalsBoxWidth + 12, totalsTop + 26, { width: (totalsBoxWidth/2) - 16 });
  doc.text(fmtNIO(Number(totalCordoba||0)), right - totalsBoxWidth + 12, totalsTop + 26, { width: totalsBoxWidth - 24, align: 'right' });
  doc.text('Total $', right - totalsBoxWidth + 12, totalsTop + 42, { width: (totalsBoxWidth/2) - 16 });
  doc.text(fmtUSD(Number(totalDolar||0)), right - totalsBoxWidth + 12, totalsTop + 42, { width: totalsBoxWidth - 24, align: 'right' });

 

  doc.end();
}

// Formato inspirado en la muestra compartida (Ayher, tabla detallada, encabezado con oferta)
export async function generarProformaPDFStreamV3(
  { empresa, cliente, detalles, totalCordoba, totalDolar, tipoCambio, pio, incoterm, plazoEntrega, condicionPago, proformaId, moneda }: any,
  res: Response
) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="proforma.pdf"`);
  doc.pipe(res);

  const esUSD = moneda === "USD";
  const fmtMoney = (n: number) => esUSD ? `$ ${Number(n || 0).toFixed(2)}` : `C$ ${Number(n || 0).toFixed(2)}`;
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const left = doc.page.margins.left;
  const right = pageWidth - doc.page.margins.right;
  const contentWidth = right - left;
  const numeroOferta = proformaId ? String(proformaId).padStart(6, '0') : normalizePio(pio);

  const drawHeader = () => {
    const headerTop = 20;
    const logoPath = resolveLogoPath(empresa?.logoUrl);
    if (logoPath) { try { doc.image(logoPath, left, headerTop, { width: 200 }); } catch {} }

    // Formato de fecha dd/mm/yyyy
    const now = new Date();
    const dia = String(now.getDate()).padStart(2, '0');
    const mes = String(now.getMonth() + 1).padStart(2, '0');
    const anio = now.getFullYear();
    const fechaFormateada = `${dia}/${mes}/${anio}`;

    doc.font("Helvetica").fontSize(11).fillColor("#111827")
      .text(`Fecha: ${fechaFormateada}`, right - 160, headerTop, { width: 160, align: "right" })
      .text(`Oferta N°: ${numeroOferta}`, right - 160, headerTop + 16, { width: 160, align: "right" });
  };

  const drawAtencion = (startY: number) => {
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#0b2d64").text("Atención a:", left, startY);
    doc.font("Helvetica").fontSize(11).fillColor("#111827");
    const y = startY + 14;
    const linea1 = cliente?.empresa || cliente?.nombre || "Cliente";
    const rucCliente = cliente?.ruc || cliente?.identificacion || cliente?.cedula || "";
    const linea2 = rucCliente ? `RUC: ${rucCliente}` : "";
    const linea3 = cliente?.direccion || "";
    const linea4 = cliente?.ciudad || cliente?.pais || "";
    doc.text(linea1, left, y);
    if (linea2) doc.text(linea2, left, doc.y + 2);
    if (linea3) doc.text(linea3, left, doc.y + 2);
    if (linea4) doc.text(linea4, left, doc.y + 2);
    return doc.y + 6;
  };

  const drawCondiciones = (startY: number) => {
    const incVal = typeof incoterm === "string" && incoterm.trim().length > 0 ? incoterm.trim() : "DDP NICARAGUA";
    const plazoVal = typeof plazoEntrega === "string" && plazoEntrega.trim().length > 0 ? plazoEntrega.trim() : "Inmediato";
    const pagoVal = typeof condicionPago === "string" && condicionPago.trim().length > 0 ? condicionPago.trim() : "30 dias credito";
    const lines = [
      { k: "INCOTERM:", v: incVal },
      { k: "PLAZO DE ENTREGA:", v: plazoVal },
      { k: "CONDICION DE PAGO:", v: pagoVal },
      { k: "PRECIO UNITARIO VALIDO UNICAMENTE SI SE CONFIRMA LA TOTALIDAD DE LAS CANTIDADES DE LINEAS SOLICITADAS.", v: "" },
      { k: "Atendiendo a su solicitud de cotización, enviamos el detalle de la lista de precios solicitada:", v: "" },
    ];
    let y = startY;
    lines.forEach(({ k, v }) => {
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827").text(k, left, y, { continued: !!v });
      if (v) doc.font("Helvetica").text(v);
      y = doc.y + 6;
    });
    return y;
  };

  const drawTabla = (startY: number) => {
    const tc = Number(tipoCambio || 36.5);
    
    // Mostrar tipo de cambio de forma prominente con 2 decimales
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#0b2d64")
      .text(`Tipo de Cambio: C$ ${tc.toFixed(2)} por USD`, left, startY, { width: contentWidth, align: "right" });
    const tableStartY = startY + 18;
    
    const cols = [
      { w: 25, title: "Pos" },
      { w: 65, title: "No. Parte" },
      { w: contentWidth - (25 + 65 + 40 + 55 + 55 + 55 + 55), title: "Descripcion" },
      { w: 40, title: "Cant." },
      { w: 55, title: "Precio C$" },
      { w: 55, title: "Precio $" },
      { w: 55, title: "Subtotal C$" },
      { w: 55, title: "Subtotal $" },
    ];
    const colX: number[] = [];
    cols.reduce((acc, c) => {
      colX.push(acc);
      return acc + c.w;
    }, left);

    const drawHeaderRow = (yHeader: number) => {
      doc.save().rect(left, yHeader, contentWidth, 24).fill("#0b2d64").restore();
      doc.save().strokeColor("#0b2d64").lineWidth(1.2).rect(left, yHeader, contentWidth, 24).stroke().restore();
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#ffffff");
      cols.forEach((c, idx) => {
        doc.text(c.title, colX[idx] + 2, yHeader + 8, { width: c.w - 4, align: "center" });
      });
      doc.save();
      doc.strokeColor("#ffffff").lineWidth(1);
      for (let i = 1; i < cols.length; i++) {
        doc.moveTo(colX[i], yHeader).lineTo(colX[i], yHeader + 24).stroke();
      }
      doc.restore();
      doc.font("Helvetica").fillColor("#111827");
    };

    const bottomLimit = pageHeight - doc.page.margins.bottom - 100;
    drawHeaderRow(tableStartY);
    let y = tableStartY + 24;
    const filas = Array.isArray(detalles) ? detalles : [];
    let totalCordobas = 0;
    let totalDolares = 0;

    filas.forEach((d: any, i) => {
      const cant = Number(d.cantidad || 0);
      const precioCordoba = Number(d.precio ?? d.precioUnitarioCordoba ?? 0);
      const precioDolar = precioCordoba / tc;
      const subCordoba = cant * precioCordoba;
      const subDolar = cant * precioDolar;
      totalCordobas += subCordoba;
      totalDolares += subDolar;
      
      // Calcular altura dinámica basada en el contenido
      doc.font("Helvetica-Bold").fontSize(8);
      const parteTxt = String(d.numeroParte ?? "");
      const nombreTxt = String(d.nombre ?? d.descripcion ?? "");
      
      const parteHeight = doc.heightOfString(parteTxt, { width: cols[1].w - 4 });
      const nombreHeight = doc.heightOfString(nombreTxt, { width: cols[2].w - 4 });
      const maxContentHeight = Math.max(parteHeight, nombreHeight);
      const rowH = Math.max(24, maxContentHeight + 12); // Mínimo 24px, o contenido + padding

      if (y + rowH > bottomLimit) {
        doc.addPage();
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#0b2d64")
          .text(`Tipo de Cambio: C$ ${tc.toFixed(2)} por USD`, left, doc.page.margins.top, { width: contentWidth, align: "right" });
        drawHeaderRow(doc.page.margins.top + 18);
        y = doc.page.margins.top + 42;
      }

      if (i % 2 === 0) {
        doc.save().rect(left, y, contentWidth, rowH).fill("#f8fafc").restore();
      }

      doc.save();
      doc.strokeColor("#333333").lineWidth(1.2);
      doc.rect(left, y, contentWidth, rowH).stroke();
      
      for (let j = 1; j < cols.length; j++) {
        doc.moveTo(colX[j], y).lineTo(colX[j], y + rowH).stroke();
      }
      doc.restore();

      doc.font("Helvetica-Bold").fontSize(8).fillColor("#111827");
      const verticalCenter = y + (rowH / 2) - 4;
      doc.text(String(i + 1), colX[0] + 2, verticalCenter, { width: cols[0].w - 4, align: "center" });
      doc.text(parteTxt, colX[1] + 2, y + 6, { width: cols[1].w - 4, align: "center" });
      doc.text(nombreTxt, colX[2] + 2, y + 6, { width: cols[2].w - 4, align: "center" });
      doc.text(String(cant), colX[3] + 2, verticalCenter, { width: cols[3].w - 4, align: "center" });
      doc.text(formatNumber(precioCordoba), colX[4] + 2, verticalCenter, { width: cols[4].w - 4, align: "right" });
      doc.text(formatNumber(precioDolar), colX[5] + 2, verticalCenter, { width: cols[5].w - 4, align: "right" });
      doc.text(formatNumber(subCordoba), colX[6] + 2, verticalCenter, { width: cols[6].w - 4, align: "right" });
      doc.text(formatNumber(subDolar), colX[7] + 2, verticalCenter, { width: cols[7].w - 4, align: "right" });
      y += rowH;
    });

    // Totales (dos filas más anchas, empezando desde Cant.)
    y += 10;
    const totalRowH = 28;
    
    if (y + totalRowH * 2 > bottomLimit) {
      doc.addPage();
      y = doc.page.margins.top + 10;
    }
    
    // Calcular el ancho para las filas de totales (desde "Cant." hasta el final)
    const totalStartX = colX[3]; // Empieza desde "Cant."
    const totalWidth = cols[3].w + cols[4].w + cols[5].w + cols[6].w + cols[7].w;
    // Label ocupa menos espacio, valor ocupa más
    const labelWidth = cols[3].w + cols[4].w + cols[5].w;
    const valueWidth = cols[6].w + cols[7].w;
    const valueDividerX = totalStartX + labelWidth;
    
    // Fila Total Córdobas
    doc.save();
    doc.strokeColor("#333333").lineWidth(1.2);
    doc.rect(totalStartX, y, totalWidth, totalRowH).stroke();
    doc.moveTo(valueDividerX, y).lineTo(valueDividerX, y + totalRowH).stroke(); // Línea divisoria
    doc.restore();
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#111827");
    doc.text("TOTAL C$", totalStartX + 4, y + 9, { width: labelWidth - 8, align: "right" });
    doc.text(`C$ ${formatNumber(totalCordobas)}`, valueDividerX + 4, y + 9, { width: valueWidth - 8, align: "right" });
    
    y += totalRowH;
    
    // Fila Total Dólares
    doc.save();
    doc.strokeColor("#333333").lineWidth(1.2);
    doc.rect(totalStartX, y, totalWidth, totalRowH).stroke();
    doc.moveTo(valueDividerX, y).lineTo(valueDividerX, y + totalRowH).stroke(); // Línea divisoria
    doc.restore();
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#111827");
    doc.text("Total $", totalStartX + 4, y + 9, { width: labelWidth - 8, align: "right" });
    doc.text(`$ ${formatNumber(totalDolares)}`, valueDividerX + 4, y + 9, { width: valueWidth - 8, align: "right" });

    return y + 28;
  };

  drawHeader();
  let cursorY = 128;
  cursorY = drawAtencion(cursorY);
  cursorY = drawCondiciones(cursorY + 10);
  cursorY = drawTabla(cursorY + 10);

  // Despedida
  cursorY += 20;
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827")
    .text("Atentamente", left, cursorY, { width: contentWidth, align: "center" });
  cursorY += 18;
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827")
    .text("SERVICIOS MULTIPLES E IMPORTACIONES AYHER", left, cursorY, { width: contentWidth, align: "center" });

  doc.end();
}
