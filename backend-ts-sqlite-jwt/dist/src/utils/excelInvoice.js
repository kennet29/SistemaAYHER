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
const FOOTER_START_ROW_OFFSET = 5;
const HEADER_HEIGHT_ROW = 15;
const TOP_MARGIN_ROWS = 4;
const GAP_AFTER_HEADER_ROWS = 2;
const ALIGNMENT_RIGHT = { horizontal: 'right' };
const ALIGNMENT_CENTER = { horizontal: 'center', vertical: 'middle' };
const ALIGNMENT_LEFT = { horizontal: 'left', vertical: 'middle' };
const COL_WIDTHS = {
    'A': 3.86,
    'B': 9.14,
    'C': 18.06,
    'D': 6.00,
    'E': 30.13,
    'F': 15.90,
    'G': 15.90,
    'H': 10.00,
    'I': 10.00
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
    const monto = Number(data.montoTotal || 0);
    const fechaVenc = data.fechaVencimiento ? new Date(data.fechaVencimiento).toLocaleDateString() : '';
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
    // Anchos de columnas
    Object.keys(COL_WIDTHS).forEach(colIndex => {
        ws.getColumn(colIndex).width = COL_WIDTHS[colIndex];
    });
    // Dividir productos en chunks (hojas)
    const itemChunks = chunk(LIST_MAX_ITEM, data.items || []);
    const todosLosNumeros = [data.numeroFactura, ...(data.numerosFacturaAdicionales || [])];
    itemChunks.forEach((items, pageIndex) => {
        const numeroFacturaHoja = todosLosNumeros[pageIndex] || data.numeroFactura;
        const poValue = data.pio || numeroFacturaHoja || '';
        if (pageIndex > 0) {
            ws.getRow(ws.rowCount).addPageBreak();
        }
        // Margen superior para posicionar el contenido (filas 1-4)
        for (let i = 0; i < TOP_MARGIN_ROWS; i++) {
            ws.addRow({});
        }
        // Cliente / Fecha
        const clienteRow = ws.addRow([]);
        clienteRow.height = HEADER_HEIGHT_ROW;
        clienteRow.getCell('E').value = 'CLIENTE:';
        clienteRow.getCell('E').font = { ...DEFAULT_FONT, bold: true };
        clienteRow.getCell('F').value = data.clienteNombre;
        clienteRow.getCell('F').alignment = ALIGNMENT_LEFT;
        clienteRow.getCell('G').value = `FECHA: ${fecha}`;
        clienteRow.getCell('G').font = { ...DEFAULT_FONT, bold: true };
        clienteRow.getCell('G').alignment = ALIGNMENT_RIGHT;
        // Direccion / Monto
        const direccionRow = ws.addRow([]);
        direccionRow.height = HEADER_HEIGHT_ROW;
        direccionRow.getCell('D').value = 'DIRECCION:';
        direccionRow.getCell('D').font = { ...DEFAULT_FONT, bold: true };
        ws.mergeCells(`E${direccionRow.number}:F${direccionRow.number}`);
        direccionRow.getCell('E').value = data.clienteDireccion;
        direccionRow.getCell('E').alignment = { vertical: 'top', wrapText: true };
        direccionRow.getCell('G').value = 'MONTO:';
        direccionRow.getCell('G').font = { ...DEFAULT_FONT, bold: true };
        direccionRow.getCell('H').value = monto;
        direccionRow.getCell('H').alignment = ALIGNMENT_RIGHT;
        direccionRow.getCell('H').numFmt = `"${simboloMoneda}"#,##0.00`;
        // RUC / PO
        const rucRow = ws.addRow([]);
        rucRow.height = HEADER_HEIGHT_ROW;
        rucRow.getCell('D').value = 'RUC:';
        rucRow.getCell('D').font = { ...DEFAULT_FONT, bold: true };
        rucRow.getCell('E').value = data.clienteRuc;
        rucRow.getCell('E').alignment = ALIGNMENT_LEFT;
        rucRow.getCell('F').value = `PO:${poValue}`;
        rucRow.getCell('F').alignment = ALIGNMENT_LEFT;
        // Plazo
        const plazoRow = ws.addRow([]);
        plazoRow.height = HEADER_HEIGHT_ROW;
        plazoRow.getCell('G').value = 'PLAZO:';
        plazoRow.getCell('G').font = { ...DEFAULT_FONT, bold: true };
        plazoRow.getCell('H').value = data.plazo;
        plazoRow.getCell('H').alignment = ALIGNMENT_RIGHT;
        // Vencimiento
        const vencRow = ws.addRow([]);
        vencRow.height = HEADER_HEIGHT_ROW;
        vencRow.getCell('G').value = 'VENCIMIENTO:';
        vencRow.getCell('G').font = { ...DEFAULT_FONT, bold: true };
        vencRow.getCell('H').value = fechaVenc;
        vencRow.getCell('H').alignment = ALIGNMENT_RIGHT;
        // Espacio antes del detalle de productos
        for (let i = 0; i < GAP_AFTER_HEADER_ROWS; i++) {
            ws.addRow({});
        }
        // PRODUCT LIST
        items.forEach((item) => {
            const row = ws.addRow([]);
            row.height = LIST_HEIGHT_ROW;
            row.getCell('B').value = item.cantidad;
            row.getCell('B').alignment = ALIGNMENT_CENTER;
            row.getCell('C').value = item.codigoFacturar || item.numeroParte;
            row.getCell('C').alignment = ALIGNMENT_LEFT;
            row.getCell('E').value = item.descripcion;
            row.getCell('E').alignment = ALIGNMENT_LEFT;
            row.getCell('F').value = Number(item.precioUnitario || 0);
            row.getCell('F').alignment = ALIGNMENT_RIGHT;
            row.getCell('F').numFmt = `"${simboloMoneda}"#,##0.00`;
            row.getCell('G').value = Number(item.subtotal || 0);
            row.getCell('G').alignment = ALIGNMENT_RIGHT;
            row.getCell('G').numFmt = `"${simboloMoneda}"#,##0.00`;
        });
        // FOOTER
        const nombreMoneda = data.moneda === 'USD' ? 'Dolares' : 'Cordobas';
        const rowSon = ws.getRow(ws.rowCount + FOOTER_START_ROW_OFFSET);
        rowSon.getCell('B').value = 'SON:';
        rowSon.getCell('B').alignment = ALIGNMENT_RIGHT;
        rowSon.getCell('E').value = `${data.montoEnTexto} ${nombreMoneda}`;
        rowSon.getCell('E').font = fontSmall;
        rowSon.getCell('G').value = monto;
        rowSon.getCell('G').alignment = ALIGNMENT_RIGHT;
        rowSon.getCell('G').numFmt = `"${simboloMoneda}"#,##0.00`;
        // Direccion
        const rowFooterDirStart = rowSon.number + 2;
        const rowFooterDir = ws.getRow(rowFooterDirStart);
        rowFooterDir.getCell('B').value = data.direccion || '';
        rowFooterDir.getCell('B').alignment = ALIGNMENT_CENTER;
        ws.mergeCells(`B${rowFooterDirStart}:F${rowFooterDirStart}`);
        // Razon social
        const rowUserStart = rowFooterDirStart + 1;
        const rowUser = ws.getRow(rowUserStart);
        rowUser.getCell('E').value = data.razonSocial || '';
        rowUser.getCell('E').alignment = ALIGNMENT_CENTER;
        ws.mergeCells(`E${rowUserStart}:G${rowUserStart}`);
        // Espacio extra
        const rowSpace = ws.getRow(rowUserStart + 1);
        rowSpace.height = 21.33;
        // Banco
        const rowBank = ws.getRow(rowSpace.number + 1);
        rowBank.getCell('D').value = bank;
        // Page Break (salto de pagina para imprimir en hojas separadas)
        if (pageIndex < itemChunks.length - 1) {
            ws.getRow(ws.rowCount).addPageBreak();
        }
    });
    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
}
