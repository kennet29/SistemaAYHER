"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generarRemisionPDFStreamV2 = generarRemisionPDFStreamV2;
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function generarRemisionPDFStreamV2({ empresa, cliente, detalles, numero, fecha, observacion, tipoCambio, }, res) {
    const doc = new pdfkit_1.default({ size: "A4", margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="remision_${numero}.pdf"`);
    doc.pipe(res);
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const left = doc.page.margins.left;
    const right = pageWidth - doc.page.margins.right;
    const contentWidth = right - left;
    // Watermark ligera (REMISION)
    const drawWatermark = () => {
        doc.save();
        doc.fillColor('#1f2937').fillOpacity(0.06);
        doc.font('Helvetica-Bold').fontSize(90);
        const originX = pageWidth / 2;
        const originY = pageHeight / 2;
        doc.rotate(-30, { origin: [originX, originY] });
        doc.text('REMISION', originX - 260, originY - 60, { width: 520, align: 'center' });
        doc.restore();
    };
    const drawFooter = () => {
        const footerBase = pageHeight - doc.page.margins.bottom;
        const textY = footerBase - 10;
        doc.save();
        doc.moveTo(left, footerBase - 16).lineTo(right, footerBase - 16).stroke('#e5e7eb');
        doc.fontSize(8).fillColor('#000000').font('Helvetica');
        const pageNum = doc.page?.number || 1;
        doc.text('Documento de remisión de productos', left, textY, { width: contentWidth - 80, lineBreak: false, ellipsis: true });
        doc.text('Página ' + pageNum, right - 60, textY, { width: 60, align: 'right', lineBreak: false });
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
    // Resolve logo path (similar a proforma)
    const resolveLogoPath = () => {
        const candidates = [];
        const declared = empresa?.logoUrl && typeof empresa.logoUrl === 'string' ? empresa.logoUrl : null;
        if (declared)
            candidates.push(declared);
        const cwd = process.cwd();
        candidates.push(path_1.default.join(cwd, "FrontEnd-React", "Frontend", "src", "img", "logo.png"));
        candidates.push(path_1.default.join(cwd, "src", "img", "logo.png"));
        candidates.push(path_1.default.join(__dirname, "../../../../../FrontEnd-React/Frontend/src/img/logo.png"));
        for (const p of candidates) {
            try {
                if (p && fs_1.default.existsSync(p))
                    return p;
            }
            catch { }
        }
        return null;
    };
    const logoPath = resolveLogoPath();
    if (logoPath) {
        try {
            doc.image(logoPath, left + 8, headerTop + 8, { width: 110 });
        }
        catch { }
    }
    // Empresa block
    const infoX = left + 140;
    const infoPadding = 10;
    doc.save();
    doc.roundedRect(infoX - 8, headerTop + 8, contentWidth - (infoX - left) - 16, headerHeight - 16, 8).fill('#ffffff');
    doc.fill('#2563eb').rect(infoX - 8, headerTop + 8, 4, headerHeight - 16).fill();
    doc.restore();
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#0b3a9b')
        .text(empresa?.razonSocial || 'EMPRESA', infoX + infoPadding - 2, headerTop + 12, {
        width: contentWidth - (infoX - left) - (infoPadding * 2) - 8,
    });
    doc.font('Helvetica').fontSize(10).fillColor('#334155');
    const linesY = headerTop + 36;
    const linesW = contentWidth - (infoX - left) - (infoPadding * 2) - 8;
    const lineStep = 12;
    const headerTextOpts = { width: linesW, lineBreak: false, ellipsis: true };
    doc.text(`RUC: ${empresa?.ruc ?? ''}`, infoX + infoPadding, linesY, headerTextOpts);
    doc.text(`Dirección: ${empresa?.direccion ?? ''}`, infoX + infoPadding, doc.y + lineStep, headerTextOpts);
    doc.text(`Tel: ${[empresa?.telefono1, empresa?.telefono2].filter(Boolean).join(' / ')}`, infoX + infoPadding, doc.y + lineStep, headerTextOpts);
    doc.text(`Correo: ${empresa?.correo ?? ''}`, infoX + infoPadding, doc.y + lineStep, headerTextOpts);
    doc.text(`Sitio Web: ${empresa?.sitioWeb ?? ''}`, infoX + infoPadding, doc.y + lineStep, headerTextOpts);
    const headerTextBottom = doc.y;
    // Title
    const afterHeaderY = Math.max(headerTop + headerHeight, headerTextBottom) + 16;
    doc.font("Helvetica-Bold").fontSize(16).fillColor('#0b3a9b')
        .text("REMISIÓN", left, afterHeaderY, { align: "center", width: contentWidth });
    // Meta (cuadro de cliente)
    const metaTop = afterHeaderY + 22; // más abajo
    doc.save();
    doc.roundedRect(left, metaTop, contentWidth, 58, 6).stroke("#cbd5e1");
    doc.restore();
    doc.fontSize(11).fillColor('#111827').font("Helvetica")
        .text(`No.: ${numero}`, left + 10, metaTop + 10, { width: contentWidth / 3 - 12 })
        .text(`Cliente: ${cliente?.nombre || cliente?.empresa || 'N/A'}`, left + contentWidth / 3, metaTop + 10, { width: contentWidth / 3 - 12 })
        .text(`Fecha: ${new Date(fecha).toLocaleDateString()}`, left + (2 * contentWidth) / 3, metaTop + 10, { width: contentWidth / 3 - 12 })
        .text(`Observación: ${observacion || 'N/A'}`, left + 10, metaTop + 32, { width: contentWidth - 20 });
    // Tabla (Parte | Producto | Cant | Subtotal)
    const tableTop = metaTop + 74;
    const wParte = 100;
    const wCant = 60;
    const wSub = 90;
    const wNombre = contentWidth - (wParte + wCant + wSub);
    const colX = [left, left + wParte, left + wParte + wNombre, right - wSub];
    const drawTableHeader = (yHeader) => {
        const headerHeight2 = 24;
        doc.save();
        doc.roundedRect(left, yHeader - 8, contentWidth, headerHeight2, 6).fill('#0b3a9b');
        doc.restore();
        doc.font("Helvetica-Bold").fillColor('#ffffff').fontSize(10);
        const headerTextY = yHeader - 6;
        doc.text("Parte", colX[0], headerTextY, { width: wParte, align: 'center' });
        doc.text("Producto", colX[1], headerTextY, { width: wNombre, align: 'center' });
        doc.text("Cant", colX[2], headerTextY, { width: wCant, align: 'center' });
        doc.text("Subtotal", colX[3], headerTextY, { width: wSub, align: 'center' });
        // separador bajo header
        doc.moveTo(left, yHeader + (headerHeight2 - 8)).lineTo(right, yHeader + (headerHeight2 - 8)).stroke('#e5e7eb');
        doc.font("Helvetica").fillColor('#111827');
    };
    const pageBottom = doc.page.height - doc.page.margins.bottom;
    let y = tableTop + 34; // más espacio entre header y primera fila
    const rowHeight = 22; // filas más altas
    drawTableHeader(tableTop);
    let rowOnPage = 0;
    const truncate = (s, maxWidth) => {
        if (!s)
            return s;
        let out = s;
        while (doc.widthOfString(out) > maxWidth && out.length > 1)
            out = out.slice(0, -1);
        return out !== s ? out + '…' : out;
    };
    for (const d of detalles) {
        if (y + rowHeight > pageBottom) {
            addNewPage();
            const yHeader = doc.page.margins.top + 10;
            drawTableHeader(yHeader);
            y = yHeader + 34;
            rowOnPage = 0;
        }
        const inv = d.inventario || {};
        const parteTxt = truncate(String(inv.numeroParte ?? ''), wParte - 8);
        const nombreTxt = truncate(String(inv.nombre ?? inv.descripcion ?? ''), wNombre - 8);
        const cantidad = Number(d.cantidad || 0);
        const cantidadTxt = String(cantidad);
        const pSugNio = Number(inv.precioVentaSugeridoCordoba ?? inv.precioVentaPromedioCordoba ?? 0) || 0;
        const pUsd = Number(inv.precioVentaSugeridoDolar ?? inv.precioVentaPromedioDolar ?? 0) || 0;
        const tc = Number(tipoCambio || 0) || 0;
        const unitNio = pSugNio || (pUsd && tc ? pUsd * tc : 0);
        const subNio = cantidad * unitNio;
        const contentY = y - (rowHeight - 8);
        doc.text(parteTxt, colX[0] + 3, contentY, { width: wParte - 6, align: 'center' });
        doc.text(nombreTxt, colX[1] + 3, contentY, { width: wNombre - 6, align: 'center' });
        doc.text(cantidadTxt, colX[2], contentY, { width: wCant - 6, align: 'center' });
        doc.text(`C$ ${Number(subNio || 0).toFixed(2)}`, colX[3], contentY, { width: wSub - 6, align: 'right' });
        // Bordes estilo Excel (sin borde superior en la primera fila bajo el header)
        const rowTop = y - rowHeight + 2;
        const isFirstOnPage = rowOnPage === 0;
        doc.save();
        doc.lineWidth(0.6);
        const gridColor = '#0b3a9b';
        const drawCellBox = (x, w) => {
            if (isFirstOnPage) {
                doc.moveTo(x, rowTop).lineTo(x, rowTop + rowHeight).stroke(gridColor); // izquierdo
                doc.moveTo(x + w, rowTop).lineTo(x + w, rowTop + rowHeight).stroke(gridColor); // derecho
                doc.moveTo(x, rowTop + rowHeight).lineTo(x + w, rowTop + rowHeight).stroke(gridColor); // inferior
            }
            else {
                doc.rect(x, rowTop, w, rowHeight).stroke(gridColor);
            }
        };
        drawCellBox(left, wParte);
        drawCellBox(colX[1], wNombre);
        drawCellBox(colX[2], wCant);
        drawCellBox(colX[3], wSub);
        doc.restore();
        y += rowHeight;
        rowOnPage++;
    }
    // Área de firmas
    const drawSignatures = () => {
        const bottomMargin = doc.page.margins.bottom;
        const areaHeight = 100;
        const raise = 36; // subir bloque
        let sigTop = doc.page.height - bottomMargin - areaHeight - raise;
        if (y + 40 > sigTop) {
            addNewPage();
            sigTop = doc.page.margins.top + 40;
        }
        const gap = 20;
        const colWidth = (contentWidth - gap) / 2;
        const lineY = sigTop + 50;
        const labelY = lineY + 6;
        const color = '#94a3b8';
        doc.save();
        doc.lineWidth(1);
        // Firma responsable (izquierda)
        doc.moveTo(left, lineY).lineTo(left + colWidth, lineY).stroke(color);
        // Firma cliente (derecha)
        doc.moveTo(left + colWidth + gap, lineY).lineTo(right, lineY).stroke(color);
        // Nombre y cédula
        const secondLineY = lineY + 34;
        doc.moveTo(left, secondLineY).lineTo(right, secondLineY).stroke(color);
        doc.restore();
        doc.font('Helvetica').fontSize(9).fillColor('#111827');
        doc.text('Firma del responsable que entrega', left, labelY, { width: colWidth, align: 'center' });
        doc.text('Firma del cliente que recibe', left + colWidth + gap, labelY, { width: colWidth, align: 'center' });
        doc.text('Nombre y cédula del receptor', left, secondLineY + 6, { width: contentWidth, align: 'center' });
    };
    drawWatermark();
    drawSignatures();
    drawFooter();
    doc.end();
}
