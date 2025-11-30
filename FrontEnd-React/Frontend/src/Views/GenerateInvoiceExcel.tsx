import React from 'react';
import * as ExcelJS from 'exceljs';

const DEFAULT_FONT = {
    name: 'Calibri',
    family: 2,  // sans-Serif
    size: 11,
    bold: false
};

const fontSmall = {
    name: 'Calibri',
    family: 2,  // sans-Serif     
    size: 10,
    bold: false
};

const LIST_MAX_ITEM = 15;
const LIST_HEIGHT_ROW = 20;

const FOOTER_START_ROW_OFFSET = 7;

const HEADER_START_ROW_OFFSET = 4;
const HEADER_HEIGHT_ROW = 11.66;

const ALIGNMENT_RIGHT: Partial<ExcelJS.Alignment> = { horizontal: 'right' };
const ALIGNMENT_CENTER: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle' };

const COL_WIDTHS: { [key: string]: number } = {
    'A': 3.86,
    'C': 18.06,
    'D': 30.13,
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
    }[] | null;
};

function chunk<T>(max: number, arr: T[]): T[][] {
    const res: T[][] = [];
    for (let i = 0; i < arr.length; i += max) {
        res.push(arr.slice(i, i + max));
    }
    return res;
}

export async function generateInvoiceExcel(data: InvoiceExcelData): Promise<Blob> {
    //
    // DATA PREPARATION
    //
    const simboloMoneda = data.moneda === 'USD' ? '$' : 'C$';
    const fecha = data.fecha ? new Date(data.fecha).toLocaleDateString() : '';
    const monto = data.montoTotal.toFixed(2);
    const fechaVenc = data.fechaVencimiento ? new Date(data.fechaVencimiento).toLocaleDateString() : null;

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

        // Cliente / Fecha
        const cfRowValues: any = [];
        cfRowValues[3] = 'CLIENTE:';
        cfRowValues[4] = data.clienteNombre;
        cfRowValues[6] = 'FECHA:';
        cfRowValues[7] = fecha;
        cfRowValues[8] = ' ';

        const cfRow = ws.addRow(cfRowValues);
        cfRow.getCell('C').alignment = ALIGNMENT_RIGHT;
        cfRow.getCell('F').alignment = ALIGNMENT_RIGHT;
        cfRow.getCell('G').alignment = ALIGNMENT_RIGHT;
        cfRow.height = HEADER_HEIGHT_ROW;

        // Dirección / Monto
        const dmRowValues: any = [];
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
        r8.getCell('B').value = 'RUC:';
        r8.getCell('B').alignment = ALIGNMENT_RIGHT;
        r8.getCell('C').value = data.clienteRuc;
        r8.getCell('C').alignment = { horizontal: 'left' };
        r8.getCell('D').value = `Orden de Compra: ${data.pio}`;
        r8.getCell('D').font = fontSmall;
        r8.getCell('D').alignment = { horizontal: 'left' };
        r8.height = HEADER_HEIGHT_ROW;

        // Vencimiento
        if (fechaVenc) {
            r8.getCell('F').value = 'VENCIMIENTO:';
            r8.getCell('F').alignment = ALIGNMENT_RIGHT;
            r8.getCell('G').value = fechaVenc;
            r8.getCell('G').alignment = ALIGNMENT_RIGHT;
        }

        // Space after header
        ws.addRows([{}, {}, {}]);

        // PRODUCT LIST
        items.forEach((item) => {
            const rowValues: any = [];
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

        if (isLastPage) {
            // ÚLTIMA PÁGINA - Mostrar total completo
            const nombreMoneda = data.moneda === 'USD' ? 'Dolares' : 'Cordobas';
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

            // Espacio adicional
            ws.addRows([{}, {}, {}]);

            // Dirección
            const rowFooterDirStart = ws.rowCount + 1;
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
        }

        // Page Break
        ws.getRow(ws.rowCount).addPageBreak();
        
        // Incrementar el número de factura para la siguiente página
        numeroFacturaActual++;
    });

    // 
    // GENERATE FILE
    //
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
