"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvoiceExcel = generateInvoiceExcel;
const exceljs_1 = __importDefault(require("exceljs"));
const DEFAULT_FONT = {
    name: 'Calibri',
    family: 2,
    size: 11,
    bold: false
};
const fontSmall = {
    name: 'Calibri',
    family: 2,
    size: 10,
    bold: false
};
const LIST_MAX_ITEM = 15; // Productos por hoja
const LIST_HEIGHT_ROW = 20;
const FOOTER_START_ROW_OFFSET = 7;
const HEADER_START_ROW_OFFSET = 4;
const HEADER_HEIGHT_ROW = 11.66;
const ALIGNMENT_RIGHT = { horizontal: 'right' };
const ALIGNMENT_CENTER = { horizontal: 'center', vertical: 'middle' };
const COL_WIDTHS = {
    'A': 3.86,
    'C': 18.06,
    'D': 30.13,
    'F': 15.90,
    'G': 15.90
};
function chunk(max, arr) {
    const res = [];
    for (let i = 0; i < arr.length; i += max) {
        res.push(arr.slice(i, i + max));
    }
    return res;
}
async function generateInvoiceExcel(data) {
    const simboloMoneda = data.moneda === 'USD' ? '$' : 'C$';
    const fecha = data.fecha ? new Date(data.fecha).toLocaleDateString() : '';
    const monto = data.montoTotal.toFixed(2);
    const fechaVenc = data.fechaVencimiento ? new Date(data.fechaVencimiento).toLocaleDateString() : null;
    const bank = data.metodo ? `${data.metodo.banco || ''} - ${data.metodo.numeroCuenta || ''} - ${data.metodo.moneda || ''} - ${data.metodo.titular || ''}` : '';
    const wb = new exceljs_1.default.Workbook();
    const ws = wb.addWorksheet('Factura', {
        pageSetup: {
            paperSize: 1, // Carta
            orientation: 'portrait',
            scale: 97,
            fitToPage: false,
            showGridLines: false,
            horizontalCentered: true,
            verticalCentered: false,
            margins: {
                left: 0.197,
                right: 0.315,
                top: 0.157,
                bottom: 0.354,
                header: 0.315,
                footer: 0.315
            }
        }
    });
    // Fuente por defecto
    ws.eachRow({ includeEmpty: false }, (row) => {
        row.font = DEFAULT_FONT;
    });
    // Anchos de columnas
    Object.keys(COL_WIDTHS).forEach(colIndex => {
        ws.getColumn(colIndex).width = COL_WIDTHS[colIndex];
    });
    // Dividir productos en chunks (hojas)
    const itemChunks = chunk(LIST_MAX_ITEM, data.items || []);
    const todosLosNumeros = [data.numeroFactura, ...(data.numerosFacturaAdicionales || [])];
    itemChunks.forEach((items, pageIndex) => {
        const numeroFacturaHoja = todosLosNumeros[pageIndex] || data.numeroFactura;
        // HEADER
        const headerOffset = ws.getRow(ws.rowCount + HEADER_START_ROW_OFFSET);
        headerOffset.height = 69.33 + 9.86;
        // Cliente / Fecha / Número de Factura
        const cfRowValues = [];
        cfRowValues[3] = 'CLIENTE:';
        cfRowValues[4] = data.clienteNombre;
        cfRowValues[5] = `Code: ${numeroFacturaHoja}`; // Número de factura de esta hoja
        cfRowValues[6] = 'FECHA:';
        cfRowValues[7] = fecha;
        cfRowValues[8] = ' ';
        const cfRow = ws.addRow(cfRowValues);
        cfRow.getCell('C').alignment = ALIGNMENT_RIGHT;
        cfRow.getCell('E').alignment = ALIGNMENT_CENTER;
        cfRow.getCell('E').font = { ...DEFAULT_FONT, bold: true };
        cfRow.getCell('F').alignment = ALIGNMENT_RIGHT;
        cfRow.getCell('G').alignment = ALIGNMENT_RIGHT;
        cfRow.height = HEADER_HEIGHT_ROW;
        // Dirección / Monto
        const dmRowValues = [];
        dmRowValues[3] = 'DIRECCION:';
        dmRowValues[4] = data.clienteDireccion;
        dmRowValues[6] = 'MONTO:';
        dmRowValues[7] = `${simboloMoneda}${monto}`;
        const dmRow = ws.addRow(dmRowValues);
        dmRow.getCell('C').alignment = ALIGNMENT_RIGHT;
        dmRow.getCell('D').alignment = { vertical: 'top' };
        dmRow.getCell('F').alignment = ALIGNMENT_RIGHT;
        dmRow.getCell('G').alignment = ALIGNMENT_RIGHT;
        dmRow.height = HEADER_HEIGHT_ROW;
        ws.mergeCells(`D${dmRow.number}:D${dmRow.number + 1}`);
        // Plazo
        const r7 = ws.getRow(dmRow.number + 1);
        r7.getCell('F').value = 'PLAZO:';
        r7.getCell('F').alignment = ALIGNMENT_RIGHT;
        r7.getCell('G').value = data.plazo;
        r7.getCell('G').alignment = ALIGNMENT_RIGHT;
        r7.height = HEADER_HEIGHT_ROW;
        // RUC | Orden de Compra
        const r8 = ws.getRow(dmRow.number + 2);
        r8.getCell('C').value = 'RUC:';
        r8.getCell('C').alignment = ALIGNMENT_RIGHT;
        r8.getCell('D').value = `${data.clienteRuc}        Orden de Compra:${data.pio}`;
        r8.getCell('D').font = fontSmall;
        r8.height = HEADER_HEIGHT_ROW;
        // Vencimiento
        if (fechaVenc) {
            r8.getCell('F').value = 'VENCIMIENTO:';
            r8.getCell('F').alignment = ALIGNMENT_RIGHT;
            r8.getCell('G').value = fechaVenc;
            r8.getCell('G').alignment = ALIGNMENT_RIGHT;
        }
        // Indicador de página (si hay múltiples hojas)
        if (itemChunks.length > 1) {
            const pageIndicator = ws.getRow(r8.number + 1);
            pageIndicator.getCell('C').value = `Hoja ${pageIndex + 1} de ${itemChunks.length}`;
            pageIndicator.getCell('C').alignment = ALIGNMENT_CENTER;
            pageIndicator.getCell('C').font = { ...fontSmall, italic: true };
            ws.mergeCells(`C${pageIndicator.number}:G${pageIndicator.number}`);
        }
        // Space after header
        ws.addRows([{}, {}, {}]);
        // PRODUCT LIST
        items.forEach((item, index) => {
            const rowValues = [];
            const globalIndex = pageIndex * LIST_MAX_ITEM + index + 1;
            rowValues[2] = item.cantidad;
            rowValues[3] = item.numeroParte;
            rowValues[4] = item.descripcion;
            rowValues[6] = `${simboloMoneda}${item.precioUnitario.toFixed(2)}`;
            rowValues[7] = `${simboloMoneda}${item.subtotal.toFixed(2)}`;
            const row = ws.addRow(rowValues);
            row.height = LIST_HEIGHT_ROW;
            row.getCell('B').alignment = ALIGNMENT_CENTER;
            row.getCell('C').alignment = ALIGNMENT_CENTER;
            row.getCell('D').alignment = ALIGNMENT_CENTER;
            row.getCell('F').alignment = ALIGNMENT_RIGHT;
            row.getCell('G').alignment = ALIGNMENT_RIGHT;
        });
        // FOOTER
        const nombreMoneda = data.moneda === 'USD' ? 'Dólares' : 'Córdobas';
        const rowSon = ws.getRow(ws.rowCount + FOOTER_START_ROW_OFFSET);
        rowSon.getCell('C').value = 'SON:';
        rowSon.getCell('C').alignment = ALIGNMENT_RIGHT;
        rowSon.getCell('D').value = `${data.montoEnTexto} ${nombreMoneda}`;
        rowSon.getCell('D').font = fontSmall;
        rowSon.getCell('G').value = `${simboloMoneda}${monto}`;
        rowSon.getCell('G').alignment = ALIGNMENT_RIGHT;
        // Dirección
        const rowFooterDirStart = ws.rowCount + 3;
        const rowFooterDir = ws.getRow(rowFooterDirStart);
        rowFooterDir.getCell('C').value = data.direccion || '';
        rowFooterDir.getCell('C').alignment = ALIGNMENT_CENTER;
        ws.mergeCells(`C${rowFooterDirStart}:F${rowFooterDirStart}`);
        // Razón social
        const rowUserStart = ws.rowCount + 1;
        const rowUser = ws.getRow(rowUserStart);
        rowUser.getCell('E').value = data.razonSocial || '';
        rowUser.getCell('E').alignment = ALIGNMENT_CENTER;
        ws.mergeCells(`E${rowUserStart}:G${rowUserStart}`);
        // Space height
        const rowSpace = ws.getRow(ws.rowCount + 1);
        rowSpace.height = 21.33;
        // Banco
        const rowBank = ws.getRow(ws.rowCount + 1);
        rowBank.getCell('D').value = bank;
        // Page Break (salto de página para imprimir en hojas separadas)
        if (pageIndex < itemChunks.length - 1) {
            ws.getRow(ws.rowCount).addPageBreak();
        }
    });
    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
}
