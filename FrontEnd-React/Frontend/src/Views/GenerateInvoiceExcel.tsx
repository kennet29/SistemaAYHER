import React from 'react';
import * as ExcelJS from 'exceljs';

const DEFAULT_FONT = {
    name: 'Calibri',
    family: 2,  // sans-Serif
    size: 9,
    bold: false
};

const fontSmall = {
    name: 'Calibri',
    family: 2,  // sans-Serif     
    size: 9,
    bold: false
};

const LIST_MAX_ITEM = 14;
const LIST_HEIGHT_ROW = 17;

const FOOTER_START_ROW_OFFSET = 1;

const HEADER_START_ROW_OFFSET = 4;
const HEADER_HEIGHT_ROW = 11.66;

const ALIGNMENT_RIGHT: Partial<ExcelJS.Alignment> = { horizontal: 'right' };
const ALIGNMENT_CENTER: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' };

const COL_WIDTHS: { [key: string]: number } = {
    'A': 3.86,
    'B': 10,
    'C': 18.06,
    'D': 30.13,
    'E': 18,
    'F': 15.90,
    'G': 15.90
};

export type InvoiceExcelData = {
    clienteNombre: string;
    clienteDireccion: string;
    clienteRuc: string;
    numeroFactura?: string | null;
    numeroFacturaInicial?: number;
    fecha?: string | Date | undefined;
    fechaVencimiento?: string | Date | null;
    montoTotal: number;
    montoEnTexto: string;
    plazo: string;
    pio: string;
    moneda: string;
    razonSocial?: string | null;
    direccion?: string | null;
    metodo: any;
    items?: {
        cantidad: number;
        numeroParte: string;
        descripcion: string;
        precioUnitario: number;
        subtotal: number;
        codigoFacturar?: string | null;
    }[] | null;
};

function chunk<T>(max: number, arr: T[]): T[][] {
    const res: T[][] = [];
    for (let i = 0; i < arr.length; i += max) {
        res.push(arr.slice(i, i + max));
    }
    return res;
}

// Formatea fechas sin desfase por zona horaria, priorizando YYYY-MM-DD
function formatDateLocal(val?: string | Date | null): string {
    if (!val) return '';
    if (typeof val === 'string') {
        const m = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) {
            const [, y, mo, d] = m;
            return `${d}/${mo}/${y}`;
        }
    }
    const d = new Date(val as any);
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

export async function generateInvoiceExcel(data: InvoiceExcelData): Promise<Blob> {
    //
    // DATA PREPARATION
    //
    const simboloMoneda = data.moneda === 'USD' ? '$' : 'C$';
    const fecha = formatDateLocal(data.fecha);
    const monto = data.montoTotal.toFixed(2);
    const fechaVenc = data.fechaVencimiento ? formatDateLocal(data.fechaVencimiento) : null;

    const bank = `${data.metodo?.banco || ''} - ${data.metodo?.numeroCuenta || ''} - ${data.metodo?.moneda || ''} - ${data.metodo?.titular || ''}`;

    // Número de factura inicial (si no se proporciona, usar el de la venta)
    let numeroFacturaActual = data.numeroFacturaInicial || parseInt(data.numeroFactura || '1') || 1;

    //
    // INITIALIZATION
    //
    const wb = new ExcelJS.Workbook();

    const ws = wb.addWorksheet('Factura', {
        pageSetup: {
            paperSize: undefined, // Letter / Carta
            orientation: 'portrait',
            scale: 93, // Zoom 93%
            showGridLines: false,
            horizontalCentered: true,  // Center
            verticalCentered: false,  // Top
            margins: {
                left: 0.197,
                right: 0.315,
                top: 0.157,
                bottom: 0.354,
                header: 0,
                footer: 0
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

    const chunks = chunk(LIST_MAX_ITEM, data.items || []);
    const totalPages = chunks.length;

    chunks.forEach((items, pageIndex) => {
        const isLastPage = pageIndex === totalPages - 1;
        const currentPageNumber = numeroFacturaActual;
        const nextPageNumber = numeroFacturaActual + 1;

        // HEADER 

        const headerOffset = ws.getRow(ws.rowCount + HEADER_START_ROW_OFFSET);
        headerOffset.height = 69.33 + 9.86;

        // Cliente / Fecha (alineado a la izquierda)
        const cfRowValues: any = [];
        cfRowValues[2] = 'CLIENTE:';
        cfRowValues[3] = data.clienteNombre;
        cfRowValues[5] = 'FECHA:';
        cfRowValues[6] = fecha;

        const cfRow = ws.addRow(cfRowValues);
        cfRow.alignment = { horizontal: 'left', vertical: 'middle' };
        cfRow.height = HEADER_HEIGHT_ROW;
        ws.mergeCells(`C${cfRow.number}:D${cfRow.number}`);
        ws.mergeCells(`F${cfRow.number}:G${cfRow.number}`);

        // Dirección / Monto (alineado a la izquierda)
        const dmRowValues: any = [];
        dmRowValues[2] = 'DIRECCION:';
        dmRowValues[3] = data.clienteDireccion;
        dmRowValues[5] = 'MONTO:';
        dmRowValues[6] = Number(monto);

        const dmRow = ws.addRow(dmRowValues);
        dmRow.alignment = { horizontal: 'left', vertical: 'middle' };
        dmRow.getCell('C').font = fontSmall;
        dmRow.getCell('D').font = fontSmall;
        dmRow.getCell('F').alignment = { horizontal: 'left' };
        dmRow.getCell('F').numFmt = `"${simboloMoneda}"#,##0.00`;
        dmRow.height = HEADER_HEIGHT_ROW;
        // Extender la dirección dos filas hacia abajo (C:D)
        ws.mergeCells(`C${dmRow.number}:D${dmRow.number + 1}`);
        ws.mergeCells(`F${dmRow.number}:G${dmRow.number}`);

        // Plazo (alineado a la izquierda)
        const r7 = ws.getRow(dmRow.number + 1);
        r7.getCell('E').value = 'PLAZO:';
        r7.getCell('E').alignment = { horizontal: 'left' };
        r7.getCell('F').value = data.plazo;
        r7.getCell('F').alignment = { horizontal: 'left' };
        r7.height = HEADER_HEIGHT_ROW;

        // RUC | Orden de Compra
        const r8 = ws.getRow(dmRow.number + 2);
        r8.getCell('B').value = 'RUC:';
        r8.getCell('B').alignment = ALIGNMENT_RIGHT;
        r8.getCell('C').value = data.clienteRuc;
        r8.getCell('C').alignment = { horizontal: 'left' };
        r8.getCell('D').value = `Orden de Compra: ${data.pio}`;
        r8.getCell('D').font = fontSmall;
        r8.getCell('D').alignment = { horizontal: 'left' };
        ws.mergeCells(`D${r8.number}:E${r8.number}`);
        r8.height = HEADER_HEIGHT_ROW;

        // Vencimiento
        if (fechaVenc) {
            r8.getCell('E').value = 'VENCIMIENTO:';
            r8.getCell('E').alignment = { horizontal: 'left' };
            r8.getCell('F').value = fechaVenc;
            r8.getCell('F').alignment = { horizontal: 'left' };
        }

        // Space after header
        ws.addRows([{}, {}, {}]);

        // PRODUCT LIST
        items.forEach((item) => {
            const rowValues: any = [];
            rowValues[2] = item.cantidad;
            rowValues[3] = item.codigoFacturar || item.numeroParte;
            rowValues[4] = item.descripcion;
            rowValues[6] = Number(item.precioUnitario || 0);
            rowValues[7] = Number(item.subtotal || 0);

            const row = ws.addRow(rowValues);
            row.height = LIST_HEIGHT_ROW;
            row.getCell('B').alignment = ALIGNMENT_CENTER;
            row.getCell('C').alignment = ALIGNMENT_CENTER;
            row.getCell('C').font = { ...DEFAULT_FONT, size: 8 };
            row.getCell('D').alignment = ALIGNMENT_CENTER;
            // Nombre: mantener tamaño de fuente original (sin reducir)
            row.getCell('D').font = { ...DEFAULT_FONT };
            row.getCell('F').alignment = ALIGNMENT_CENTER;
            row.getCell('G').alignment = ALIGNMENT_CENTER;
            row.getCell('F').numFmt = `"${simboloMoneda}"#,##0.00`;
            row.getCell('G').numFmt = `"${simboloMoneda}"#,##0.00`;

            // Unir columnas D y E para el nombre
            ws.mergeCells(`D${row.number}:E${row.number}`);
        });

        // Agregar filas vacías para que observación/total queden en posición fija (artículo 13)
        const emptyRowsNeeded = 13 - items.length;
        for (let i = 0; i < emptyRowsNeeded; i++) {
            const emptyRow = ws.addRow([]);
            emptyRow.height = LIST_HEIGHT_ROW;
        }

        // FOOTER

        if (isLastPage) {
            // ÚLTIMA PÁGINA - Mostrar total completo en la ubicación de observación
            const nombreMoneda = data.moneda === 'USD' ? 'Dolares' : 'Cordobas';

            // Reubicar SON/Total más abajo (donde estaba la dirección)
            const rowSonStart = ws.rowCount + 5;
            const rowSon = ws.getRow(rowSonStart);
            rowSon.getCell('C').value = 'SON:';
            rowSon.getCell('C').alignment = ALIGNMENT_RIGHT;
            rowSon.getCell('D').value = `${data.montoEnTexto} ${nombreMoneda}`;
            rowSon.getCell('D').font = fontSmall;
            rowSon.getCell('F').value = 'TOTAL:';
            rowSon.getCell('F').alignment = ALIGNMENT_RIGHT;
            rowSon.getCell('G').value = Number(monto);
            rowSon.getCell('G').numFmt = `"${simboloMoneda}"#,##0.00`;
            rowSon.getCell('G').alignment = ALIGNMENT_CENTER;

            // Dirección del cliente
            const rowFooterDirStart = rowSonStart + 2;
            const rowFooterDir = ws.getRow(rowFooterDirStart);
            rowFooterDir.getCell('C').value = data.clienteDireccion || '';
            rowFooterDir.getCell('C').font = fontSmall;
            rowFooterDir.getCell('C').alignment = ALIGNMENT_CENTER;
            ws.mergeCells(`C${rowFooterDirStart}:F${rowFooterDirStart}`);

            // Nombre del titular
            const rowUserStart = ws.rowCount + 1;
            const rowUser = ws.getRow(rowUserStart);
            rowUser.getCell('E').value = 'Dustin Adonis Ayerdis Espinoza';
            rowUser.getCell('E').alignment = ALIGNMENT_CENTER;
            ws.mergeCells(`E${rowUserStart}:G${rowUserStart}`);

            // Space height
            const rowSpace = ws.getRow(ws.rowCount + 1);
            rowSpace.height = 21.33;

            // Banco
            const rowBank = ws.getRow(ws.rowCount + 1);
            rowBank.getCell('D').value = bank;
        } else {
            // PÁGINAS INTERMEDIAS - Mostrar observación de continuación
            const rowContinua = ws.getRow(ws.rowCount + FOOTER_START_ROW_OFFSET);
            rowContinua.getCell('C').value = 'OBSERVACIÓN:';
            rowContinua.getCell('C').alignment = ALIGNMENT_RIGHT;
            rowContinua.getCell('C').font = { ...DEFAULT_FONT, bold: true };
            
            const nextNumeroFormatted = nextPageNumber.toString().padStart(6, '0');
            rowContinua.getCell('D').value = `Esta factura continúa en el número ${nextNumeroFormatted}`;
            rowContinua.getCell('D').font = { ...DEFAULT_FONT, bold: true, size: 12 };
            rowContinua.getCell('D').alignment = ALIGNMENT_CENTER;
            ws.mergeCells(`D${rowContinua.number}:G${rowContinua.number}`);
        }

        // Page Break
        ws.getRow(ws.rowCount).addPageBreak();
        
        // Incrementar el número de factura para la siguiente página
        numeroFacturaActual++;
    });

    // 
    // GENERATE FILE
    //
    // Limitar el área de impresión hasta la columna G y la última fila utilizada
    ws.pageSetup.printArea = `A1:G${ws.rowCount}`;
    ws.pageSetup.fitToWidth = 1;

    const buffer = await wb.xlsx.writeBuffer();
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Componente React para la ruta (opcional, solo muestra información)
const GenerateInvoiceExcel: React.FC = () => {
    return (
        <div style={{ padding: '2rem' }}>
            <h1>Generar Factura Excel</h1>
            <p>Esta funcionalidad se utiliza desde el módulo de Ventas.</p>
            <p>Usa el botón "Excel" en la tabla de ventas para generar facturas.</p>
        </div>
    );
};

export default GenerateInvoiceExcel;
