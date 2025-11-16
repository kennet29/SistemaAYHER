"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generarExcelPresupuesto = generarExcelPresupuesto;
const exceljs_1 = __importDefault(require("exceljs"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const prisma_1 = require("../../db/prisma");
async function generarExcelPresupuesto(req, res) {
    const { cliente, correo, observacion, detalles } = req.body;
    if (!cliente || !detalles || !Array.isArray(detalles) || detalles.length === 0) {
        return res.status(400).json({ message: "Faltan datos para generar el presupuesto." });
    }
    // Consultar productos desde la base de datos
    const ids = detalles.map((d) => d.inventarioId);
    const productos = await prisma_1.prisma.inventario.findMany({
        where: { id: { in: ids } },
        include: { marca: true }
    });
    if (productos.length === 0)
        return res.status(404).json({ message: "No se encontraron los productos." });
    const workbook = new exceljs_1.default.Workbook();
    const sheet = workbook.addWorksheet("Presupuesto");
    // Encabezado
    sheet.mergeCells("A1:G1");
    sheet.getCell("A1").value = `Presupuesto para ${cliente}`;
    sheet.getCell("A1").font = { size: 16, bold: true };
    sheet.getCell("A1").alignment = { horizontal: "center" };
    sheet.addRow([]);
    sheet.addRow(["Cliente:", cliente]);
    if (correo)
        sheet.addRow(["Correo:", correo]);
    if (observacion)
        sheet.addRow(["Observación:", observacion]);
    sheet.addRow(["Fecha:", new Date().toLocaleString()]);
    sheet.addRow([]);
    // Columnas
    sheet.addRow(["#", "Código", "Producto", "Marca", "Cantidad", "Precio Unitario (C$)", "Subtotal (C$)"]);
    sheet.getRow(sheet.lastRow.number).font = { bold: true };
    // Agregar filas
    let total = 0;
    detalles.forEach((d, index) => {
        const prod = productos.find((p) => p.id === d.inventarioId);
        if (!prod)
            return;
        const precio = d.precioUnitarioCordoba ?? Number(prod.precioVentaSugeridoCordoba);
        const subtotal = d.cantidad * precio;
        total += subtotal;
        sheet.addRow([
            index + 1,
            prod.numeroParte,
            prod.nombre,
            prod.marca?.nombre ?? "",
            d.cantidad,
            precio,
            subtotal
        ]);
    });
    // Total
    sheet.addRow([]);
    sheet.addRow(["", "", "", "", "", "TOTAL (C$):", total]);
    const totalRow = sheet.lastRow;
    if (totalRow) {
        totalRow.font = { bold: true };
        totalRow.alignment = { horizontal: "right" };
    }
    // Ajustes visuales mínimos
    sheet.columns.forEach((col) => {
        if (col.width && col.width < 15)
            col.width = 15;
    });
    // Guardar archivo temporal
    const filePath = path_1.default.join(process.cwd(), `presupuesto-${Date.now()}.xlsx`);
    await workbook.xlsx.writeFile(filePath);
    // Enviar el archivo
    res.download(filePath, (err) => {
        if (!err)
            fs_1.default.unlinkSync(filePath);
    });
}
