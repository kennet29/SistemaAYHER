"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generarNotaCreditoVentaPDF = generarNotaCreditoVentaPDF;
const pdfkit_1 = __importDefault(require("pdfkit"));
const logo_1 = require("../../../utils/logo");
const fmtDate = (val) => {
    if (!val)
        return "-";
    try {
        return new Date(val).toLocaleDateString("es-NI", { day: "2-digit", month: "2-digit", year: "numeric" });
    }
    catch {
        return String(val);
    }
};
const fmtNumber = (n) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function generarNotaCreditoVentaPDF(res, payload) {
    const { config, devolucion, detalles } = payload;
    const tc = Number(devolucion.tipoCambioValor || devolucion.venta?.tipoCambioValor || 0) || null;
    const numeroNC = `NC-${String(devolucion.id).padStart(6, "0")}`;
    const cliente = devolucion.cliente ||
        devolucion.venta?.cliente?.empresa ||
        devolucion.venta?.cliente?.nombre ||
        "-";
    const consecutivo = devolucion.venta?.numeroFactura || "Sin factura";
    const clienteEntidad = devolucion.venta?.cliente;
    const clienteRuc = clienteEntidad?.ruc || "-";
    const clienteDireccion = clienteEntidad?.direccion || "-";
    const rawMotivo = devolucion.motivo || "";
    const obsToken = "Obs:";
    let conceptoTexto = rawMotivo || "-";
    let observacionesTexto = "-";
    if (rawMotivo.includes(obsToken)) {
        const [c, o] = rawMotivo.split(obsToken);
        conceptoTexto = (c || "-").replace("|", "").trim() || "-";
        observacionesTexto = (o || "-").trim() || "-";
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="nota_credito_${numeroNC}.pdf"`);
    const doc = new pdfkit_1.default({ size: "A4", margin: 32 });
    doc.pipe(res);
    // Header
    const logoPath = (0, logo_1.resolveLogoPath)(config?.logoUrl || undefined);
    if (logoPath) {
        doc.image(logoPath, 28, doc.y, { fit: [150, 90] });
    }
    doc.font("Helvetica-Bold").fontSize(12).text(config?.razonSocial || "AYHER", logoPath ? 170 : 32, 32, {
        align: "right",
    });
    doc
        .font("Helvetica")
        .fontSize(10)
        .text([
        config?.ruc ? `RUC: ${config.ruc}` : "",
        config?.telefono1 ? `Telefono: ${config.telefono1}` : "",
        config?.telefono2 ? config.telefono2 : "",
        config?.direccion || "",
        config?.correo || "",
    ]
        .filter(Boolean)
        .join("\n"), { align: "right" });
    doc.moveDown(0.2);
    doc.font("Helvetica-Bold").fontSize(16).text("Nota de Credito", { align: "right" });
    doc.font("Helvetica").fontSize(10).text(numeroNC, { align: "right" });
    doc.moveDown(0.4);
    // Datos principales
    const boxTop = doc.y;
    const lineHeight = 12;
    const labelX = 32;
    const gap = 7;
    const drawField = (label, value, y, width) => {
        doc.font("Helvetica-Bold").text(label, labelX, y);
        const labelWidth = doc.font("Helvetica-Bold").widthOfString(label);
        doc.font("Helvetica").text(value || "-", labelX + labelWidth + gap, y, width ? { width } : undefined);
    };
    drawField("Acreditacion a:", cliente || "-", boxTop);
    drawField("RUC:", clienteRuc, boxTop + lineHeight);
    drawField("Direccion:", clienteDireccion, boxTop + lineHeight * 2, 400);
    drawField("Facturas:", consecutivo, boxTop + lineHeight * 3);
    drawField("Fecha:", fmtDate(devolucion.fecha || devolucion.createdAt), boxTop + lineHeight * 4);
    drawField("Tipo cambio:", tc ? fmtNumber(tc) : "-", boxTop + lineHeight * 5);
    drawField("Concepto:", conceptoTexto, boxTop + lineHeight * 6, 400);
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const infoRectX = labelX - 4;
    const infoRectWidth = contentWidth - (labelX - doc.page.margins.left) + 8;
    const infoRectHeight = lineHeight * 6 + lineHeight + 8;
    doc.rect(infoRectX, boxTop - 4, infoRectWidth, infoRectHeight).stroke();
    doc.moveDown(1);
    // Tabla de detalles
    const tableTopBase = doc.y + 6;
    const startX = 32;
    const rowHeight = 18;
    const columns = [
        { header: "Codigo", width: 58, align: "center" },
        { header: "Cant.", width: 45, align: "center" },
        { header: "Articulo", width: 165, align: "center" },
        { header: "Precio C$", width: 65, align: "right" },
        { header: "Precio US$", width: 65, align: "right" },
        { header: "Subtotal C$", width: 68, align: "right" },
        { header: "Subtotal US$", width: 65, align: "right" },
    ];
    const tableWidth = columns.reduce((s, c) => s + c.width, 0);
    const xPositions = [];
    columns.reduce((acc, col) => {
        xPositions.push(acc + col.width);
        return acc + col.width;
    }, startX);
    const drawRow = (y, values, isHeader = false, fill = false) => {
        if (isHeader) {
            doc.save().rect(startX, y - 3, tableWidth, rowHeight).fill("#0a1a40").restore();
        }
        else if (fill) {
            doc.save().rect(startX, y - 3, tableWidth, rowHeight).fill("#f7f9fb").restore();
        }
        let x = startX;
        values.forEach((val, idx) => {
            const col = columns[idx];
            doc
                .font(isHeader ? "Helvetica-Bold" : "Helvetica")
                .fontSize(9)
                .fillColor(isHeader ? "#ffffff" : "#000000")
                .text(val, x + 4, y, {
                width: col.width - 8,
                align: isHeader ? "center" : col.align,
            });
            x += col.width;
        });
        doc.fillColor("#000000");
        doc.rect(startX, y - 3, tableWidth, rowHeight).stroke();
    };
    const drawVerticals = (startY, endY) => {
        xPositions.slice(0, -1).forEach((x) => {
            doc.moveTo(x, startY - 3).lineTo(x, endY + 0).stroke();
        });
    };
    const totalCordoba = detalles.reduce((sum, d) => sum + Number(d.cantidad || 0) * Number(d.precioUnitarioCordoba || 0), 0);
    let tableTop = tableTopBase;
    drawRow(tableTop, columns.map((c) => c.header), true);
    let cursorY = tableTop + rowHeight;
    let pageStartY = tableTop;
    const ensureSpace = () => {
        const limitY = doc.page.height - doc.page.margins.bottom - 140;
        if (cursorY + rowHeight > limitY) {
            // cerrar líneas de la página actual
            drawVerticals(pageStartY, cursorY);
            doc.addPage();
            tableTop = doc.y + 6;
            pageStartY = tableTop;
            drawRow(tableTop, columns.map((c) => c.header), true);
            cursorY = tableTop + rowHeight;
        }
    };
    detalles.forEach((det, idx) => {
        ensureSpace();
        const inv = det.inventario || {};
        const marca = inv.marca?.nombre || inv?.marcaNombre || "";
        const nombre = [inv.nombre, marca].filter(Boolean).join(" - ") || `Articulo ${det.inventarioId}`;
        const precioUsd = tc ? Number(det.precioUnitarioCordoba || 0) / tc : null;
        const subtotal = Number(det.cantidad || 0) * Number(det.precioUnitarioCordoba || 0);
        const subtotalUsd = tc ? subtotal / tc : null;
        drawRow(cursorY, [
            inv.numeroParte || `#${det.inventarioId}`,
            String(det.cantidad || 0),
            nombre,
            fmtNumber(Number(det.precioUnitarioCordoba || 0)),
            precioUsd ? fmtNumber(precioUsd) : "-",
            fmtNumber(subtotal),
            subtotalUsd ? fmtNumber(subtotalUsd) : "-",
        ], false, idx % 2 === 1);
        cursorY += rowHeight;
    });
    // líneas verticales de la última página y totales (solo al final)
    drawVerticals(pageStartY, cursorY);
    const totalesY = cursorY + 8;
    const totalsLabelX = startX + tableWidth - 190;
    const totalsValueX = startX + tableWidth - 40;
    doc.fillColor("#000000");
    doc.font("Helvetica-Bold").fontSize(10).text("Total C$", totalsLabelX, totalesY);
    doc.font("Helvetica-Bold").text(fmtNumber(totalCordoba), totalsValueX, totalesY, { align: "right" });
    if (tc) {
        doc.font("Helvetica-Bold").text("Total US$", totalsLabelX, totalesY + 14);
        doc.font("Helvetica-Bold").text(fmtNumber(totalCordoba / tc), totalsValueX, totalesY + 14, { align: "right" });
    }
    doc.moveDown(1.2);
    doc.font("Helvetica-Bold").text("Observaciones:", labelX);
    doc.font("Helvetica").text(observacionesTexto, labelX, doc.y, { width: 500 });
    doc.end();
}
