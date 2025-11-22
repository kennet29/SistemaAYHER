"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generarRemisionPDFStreamV2 = generarRemisionPDFStreamV2;
const pdfkit_1 = __importDefault(require("pdfkit"));
const logo_1 = require("../../../utils/logo");
const fmtDate = (val) => {
    try {
        return new Date(val).toLocaleDateString("es-NI", { day: "2-digit", month: "2-digit", year: "numeric" });
    }
    catch {
        return String(val);
    }
};
const fmtNIO = (n) => `C$ ${Number(n || 0).toFixed(2)}`;
const pickPrecioCordoba = (inv) => Number(inv?.precioVentaSugeridoCordoba ?? inv?.precioVentaPromedioCordoba ?? 0) || 0;
async function generarRemisionPDFStreamV2({ empresa, cliente, detalles, numero, fecha, observacion, pio, }, res) {
    const doc = new pdfkit_1.default({ size: "A4", margin: 36 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="remision_${numero}.pdf"`);
    doc.pipe(res);
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const left = doc.page.margins.left;
    const right = pageWidth - doc.page.margins.right;
    const contentWidth = right - left;
    const drawHeader = () => {
        const logoPath = (0, logo_1.resolveLogoPath)(empresa?.logoUrl ?? null);
        if (logoPath) {
            try {
                doc.image(logoPath, right - 150, 24, { width: 140 });
            }
            catch { }
        }
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827");
        doc.text("NOTA DE REMISION", left, 38, { width: contentWidth, align: "center" });
        doc.fillColor("#b91c1c").fontSize(11).text(`N° ${numero}`, left, 54, { width: contentWidth, align: "center" });
    };
    const drawDatosGenerales = (startY) => {
        const rows = [
            ["Entregado a:", cliente?.nombre || cliente?.empresa || "N/A", "Fecha:", fmtDate(fecha)],
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
    const drawItemsTable = (startY) => {
        const cols = [
            { title: "CODIGO", w: 120 },
            { title: "DESCRIPCION PRODUCTO", w: contentWidth - 120 - 90 },
            { title: "CANTIDAD", w: 90 },
        ];
        const colX = [];
        cols.reduce((acc, c) => { colX.push(acc); return acc + c.w; }, left);
        const headerH = 22;
        doc.save().rect(left, startY, contentWidth, headerH).fill("#cbd5e1").restore();
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827");
        cols.forEach((c, idx) => doc.text(c.title, colX[idx] + 4, startY + 6, { width: c.w - 8, align: "center" }));
        let y = startY + headerH;
        const bottomLimit = pageHeight - doc.page.margins.bottom - 140;
        const filas = Array.isArray(detalles) ? detalles : [];
        doc.font("Helvetica").fontSize(10).fillColor("#111827");
        filas.forEach((d, idx) => {
            const codigo = d.inventario?.numeroParte || d.numeroParte || "-";
            const desc = d.inventario?.nombre || d.inventario?.descripcion || d.nombre || d.descripcion || "";
            const cant = Number(d.cantidad || 0);
            const descH = doc.heightOfString(desc, { width: cols[1].w - 10 });
            const rowH = Math.max(32, descH + 12);
            if (y + rowH > bottomLimit) {
                doc.addPage();
                drawHeader();
                y = 120;
                doc.save().rect(left, y, contentWidth, headerH).fill("#cbd5e1").restore();
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
            doc.restore();
            doc.text(String(codigo), colX[0] + 4, y + 6, { width: cols[0].w - 8, align: "center" });
            doc.text(desc, colX[1] + 4, y + 6, { width: cols[1].w - 8, align: "center" });
            doc.text(String(cant), colX[2] + 4, y + 6, { width: cols[2].w - 8, align: "center" });
            y += rowH;
        });
        return y + 12;
    };
    const drawFirmas = (startY) => {
        const rowH = 22;
        const labelW = 110;
        const fechaW = 100;
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
        // Usamos sin acentos para evitar problemas de codificación en algunos visores
        doc.text("Recibi Conforme:", left + 6, startY + 6, { width: labelW - 12 });
        doc.text("Entregue Conforme:", left + 6, startY + rowH + 6, { width: labelW - 12 });
        // Fecha centrada verticalmente en la columna gris
        const fechaY = startY + (rowH * 2 - doc.currentLineHeight(true)) / 2;
        doc.font("Helvetica-Bold").text("Fecha:", left + contentWidth - fechaW + 6, fechaY, { width: fechaW - 12 });
        doc.font("Helvetica").text(fmtDate(fecha), left + contentWidth - fechaW + 6, fechaY + 12, { width: fechaW - 12, align: "right" });
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
