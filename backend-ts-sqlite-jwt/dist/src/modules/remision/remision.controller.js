"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.imprimirRemisionPDF = exports.imprimirRemision = exports.imprimirRemisionExcel = exports.marcarRemisionFacturada = exports.remisionesPendientes = exports.obtenerRemision = exports.listarRemisiones = exports.crearRemision = void 0;
const prisma_1 = require("../../db/prisma");
const zod_1 = require("zod");
const numeroRemision_service_1 = require("../../services/numeroRemision.service");
const stock_service_1 = require("../services/stock.service");
const remision_pdf_1 = require("./services/remision.pdf");
// ✅ Validación Zod
const remisionSchema = zod_1.z.object({
    clienteId: zod_1.z.preprocess((v) => (v !== "" && v != null ? Number(v) : undefined), zod_1.z.number().optional()),
    usuario: zod_1.z.string().optional(),
    observacion: zod_1.z.string().optional(),
    items: zod_1.z.array(zod_1.z.object({
        inventarioId: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int()),
        cantidad: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().min(1)),
    })).min(1, "Debe enviar al menos un producto"),
});
// ✅ Crear remisión
const crearRemision = async (req, res) => {
    try {
        console.log("📥 Body recibido en /remisiones/crear:");
        console.log(JSON.stringify(req.body, null, 2));
        const parsed = remisionSchema.safeParse(req.body);
        if (!parsed.success) {
            console.error("❌ Error validación ZOD:", parsed.error.errors);
            return res.status(400).json({ message: "Datos inválidos", errors: parsed.error.errors });
        }
        const { clienteId, usuario, observacion, items } = parsed.data;
        const numero = await (0, numeroRemision_service_1.generarNumeroRemision)();
        const remision = await prisma_1.prisma.$transaction(async (tx) => {
            const dataCreate = { numero, usuario, observacion, facturada: false };
            if (typeof clienteId === 'number')
                dataCreate.clienteId = clienteId;
            const nuevaRemision = await tx.remision.create({ data: dataCreate });
            console.log("✅ Transacción iniciada para remisión:", nuevaRemision.id);
            for (const item of items) {
                const producto = await tx.inventario.findUnique({
                    where: { id: item.inventarioId },
                    select: { stockActual: true, nombre: true },
                });
                if (!producto) {
                    throw new Error(`Producto ID ${item.inventarioId} no existe`);
                }
                if (producto.stockActual < item.cantidad) {
                    throw new Error(`Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stockActual}, Solicitado: ${item.cantidad}`);
                }
                // ✅ Llamando servicio con `tx`
                const movimiento = await (0, stock_service_1.crearMovimientoYAjustarStock)({
                    inventarioId: item.inventarioId,
                    tipoMovimientoNombre: "Salida por Remisión",
                    cantidad: item.cantidad,
                    usuario,
                    observacion: `Remisión ${numero}`,
                    tx, // ✅ CLAVE
                });
                await tx.detalleRemision.create({
                    data: {
                        remisionId: nuevaRemision.id,
                        inventarioId: item.inventarioId,
                        cantidad: item.cantidad,
                        movimientoId: movimiento.movimiento.id, // ✅ Correcto
                    },
                });
            }
            return nuevaRemision;
        });
        return res.status(201).json({ message: "✅ Remisión creada correctamente", remision });
    }
    catch (error) {
        console.error("❌ Error crear remisión:", error);
        if (error.message?.includes("Stock insuficiente")) {
            return res.status(400).json({ message: error.message });
        }
        if (error.message?.includes("TipoMovimiento no encontrado")) {
            return res.status(400).json({ message: "Tipo de movimiento no existe en base de datos" });
        }
        return res.status(500).json({ message: "Error al crear remisión" });
    }
};
exports.crearRemision = crearRemision;
// ✅ Listar remisiones
const listarRemisiones = async (_req, res) => {
    try {
        const remisiones = await prisma_1.prisma.remision.findMany({
            orderBy: { id: "desc" },
            include: { detalles: { include: { inventario: true } } },
        });
        res.json(remisiones);
    }
    catch (err) {
        console.error("❌ Error listarRemisiones:", err);
        res.status(500).json({ message: "Error al obtener remisiones" });
    }
};
exports.listarRemisiones = listarRemisiones;
// ✅ Obtener remisión
const obtenerRemision = async (req, res) => {
    try {
        const remision = await prisma_1.prisma.remision.findUnique({
            where: { id: Number(req.params.id) },
            include: { detalles: { include: { inventario: true } } },
        });
        if (!remision)
            return res.status(404).json({ message: "No encontrada" });
        res.json(remision);
    }
    catch {
        res.status(500).json({ message: "Error al obtener remisión" });
    }
};
exports.obtenerRemision = obtenerRemision;
const remisionesPendientes = async (_req, res) => {
    try {
        console.log("🚀 Ejecutando remisionesPendientes"); // 👈 DEBUG
        const pendientes = await prisma_1.prisma.remision.findMany({
            where: { facturada: false },
            include: {
                detalles: {
                    include: {
                        inventario: true
                    }
                }
            },
            orderBy: { id: "desc" },
        });
        console.log("✅ Pendientes encontrados:", pendientes.length); // 👈 DEBUG
        return res.json(pendientes);
    }
    catch (error) {
        console.error("❌ Error en remisionesPendientes:");
        console.error(error); // 👈 IMPRESCINDIBLE
        return res.status(500).json({
            message: "Error obteniendo remisiones pendientes",
            error: error.message,
        });
    }
};
exports.remisionesPendientes = remisionesPendientes;
// ✅ Marcar remisión como facturada
const marcarRemisionFacturada = async (req, res) => {
    try {
        const remisionId = Number(req.params.id);
        await prisma_1.prisma.$transaction(async (tx) => {
            // 1) Marcar como facturada y obtener número
            const rem = await tx.remision.update({
                where: { id: remisionId },
                data: { facturada: true },
                select: { id: true, numero: true },
            });
            const numeroTexto = rem.numero ? String(rem.numero) : String(rem.id);
            // 2) Obtener movimientos vinculados a los detalles de la remisión
            const detalles = await tx.detalleRemision.findMany({
                where: { remisionId },
                select: { movimientoId: true },
            });
            const movIds = detalles.map((d) => d.movimientoId).filter(Boolean);
            if (movIds.length === 0)
                return;
            const movimientos = await tx.movimientoInventario.findMany({
                where: { id: { in: movIds } },
                select: { id: true, observacion: true },
            });
            // 3) Actualizar observación: anexar "Facturación de remisión #<numero>"
            const anotacion = `Facturación de remisión ${numeroTexto}`;
            for (const m of movimientos) {
                const nuevaObs = m.observacion && m.observacion.trim().length > 0
                    ? `${m.observacion} | ${anotacion}`
                    : anotacion;
                await tx.movimientoInventario.update({
                    where: { id: m.id },
                    data: { observacion: nuevaObs },
                });
            }
        });
        return res.json({ message: "✅ Remisión marcada como facturada y movimientos anotados" });
    }
    catch (e) {
        console.error("❌ Error al marcar remisión como facturada:", e);
        return res.status(500).json({ message: "Error al marcar remisión como facturada" });
    }
};
exports.marcarRemisionFacturada = marcarRemisionFacturada;
const exceljs_1 = __importDefault(require("exceljs"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const imprimirRemisionExcel = async (req, res) => {
    try {
        const id = Number(req.params.id);
        // ✅ Obtener remisión
        const remision = await prisma_1.prisma.remision.findUnique({
            where: { id },
            include: {
                cliente: true,
                detalles: { include: { inventario: true } }
            }
        });
        if (!remision)
            return res.status(404).json({ message: "Remisión no encontrada" });
        const rem = remision; // non-null from here
        // ✅ Obtener configuración de empresa
        const config = await prisma_1.prisma.configuracion.findFirst();
        const workbook = new exceljs_1.default.Workbook();
        const sheet = workbook.addWorksheet("Remisión", {
            pageSetup: {
                paperSize: 9, // A4
                orientation: "portrait",
                margins: { top: 0.4, right: 0.4, bottom: 0.4, left: 0.4, header: 0.3, footer: 0.3 },
            }
        });
        // ========== 🏢 ENCABEZADO EMPRESA ==========
        sheet.mergeCells("A1:D1");
        const empresa = sheet.getCell("A1");
        empresa.value = config?.razonSocial || "EMPRESA";
        empresa.font = { size: 18, bold: true };
        empresa.alignment = { horizontal: "center" };
        sheet.mergeCells("A2:D2");
        sheet.getCell("A2").value = `RUC: ${config?.ruc || "-"}`;
        sheet.getCell("A2").alignment = { horizontal: "center" };
        sheet.mergeCells("A3:D3");
        sheet.getCell("A3").value = `${config?.direccion || ""}`;
        sheet.getCell("A3").alignment = { horizontal: "center" };
        sheet.mergeCells("A4:D4");
        sheet.getCell("A4").value = `Tel: ${config?.telefono1 || ""} ${config?.telefono2 || ""}`;
        sheet.getCell("A4").alignment = { horizontal: "center" };
        sheet.mergeCells("A5:D5");
        sheet.getCell("A5").value = `${config?.correo || ""} | ${config?.sitioWeb || ""}`;
        sheet.getCell("A5").alignment = { horizontal: "center" };
        sheet.addRow([]);
        sheet.addRow([]);
        // ========== 📄 INFORMACIÓN DE REMISIÓN ==========
        sheet.addRow([`Remisión No.:`, remision.numero]);
        sheet.addRow([`Cliente:`, remision.cliente?.nombre || remision.cliente?.empresa]);
        sheet.addRow([`Fecha:`, remision.fecha.toISOString().split("T")[0]]);
        sheet.addRow([`Observación:`, remision.observacion || "N/A"]);
        sheet.addRow([]);
        sheet.addRow(["Producto", "Cantidad"]).font = { bold: true };
        remision.detalles.forEach((d) => {
            sheet.addRow([d.inventario.nombre, d.cantidad]);
        });
        // ✅ Bordes
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber > 10) {
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: "thin" },
                        bottom: { style: "thin" },
                        left: { style: "thin" },
                        right: { style: "thin" }
                    };
                });
            }
        });
        sheet.columns = [{ width: 45 }, { width: 15 }];
        // ✅ Mensaje final
        if (config?.mensajeFactura) {
            sheet.addRow([]);
            sheet.addRow([config.mensajeFactura]);
        }
        // ✅ Descargar Excel
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=remision_${remision.numero}.xlsx`);
        await workbook.xlsx.write(res);
        res.status(200).end();
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error exportando remisión" });
    }
};
exports.imprimirRemisionExcel = imprimirRemisionExcel;
const imprimirRemision = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const remision = await prisma_1.prisma.remision.findUnique({
            where: { id },
            include: {
                cliente: true,
                detalles: {
                    include: { inventario: true }
                }
            }
        });
        if (!remision) {
            return res.status(404).send("Remisión no encontrada");
        }
        let html = `
      <html>
      <head>
        <title>Remisión ${remision.numero}</title>
        <style>
          body { font-family: Arial; padding:20px; }
          h2 { color: #003399 }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top:20px;
          }
          table, th, td {
            border: 1px solid black;
          }
          th, td {
            padding: 8px;
            text-align: left;
          }
          .info { margin-bottom:10px; }
          .print-btn {
            padding:8px 15px;
            background:#0052cc;
            color:white;
            border:none;
            border-radius:5px;
            cursor:pointer;
            margin-bottom:10px;
          }
        </style>
      </head>
      <body>
        <button class="print-btn" onclick="window.print()">🖨️ Imprimir</button>

        <h2>Remisión ${remision.numero}</h2>

        <div class="info"><b>Cliente:</b> ${remision.cliente?.nombre || remision.cliente?.empresa}</div>
        <div class="info"><b>Fecha:</b> ${remision.fecha.toISOString().split("T")[0]}</div>
        <div class="info"><b>Observación:</b> ${remision.observacion || "N/A"}</div>

        <table>
          <tr>
            <th>Producto</th>
            <th>Cantidad</th>
          </tr>
    `;
        remision.detalles.forEach((d) => {
            html += `
        <tr>
          <td>${d.inventario.nombre}</td>
          <td>${d.cantidad}</td>
        </tr>
      `;
        });
        html += `
        </table>
      </body>
      </html>
    `;
        res.send(html);
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Error generando impresión");
    }
};
exports.imprimirRemision = imprimirRemision;
// Generar PDF de una remisión específica y enviarlo al cliente
const imprimirRemisionPDF = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const remision = await prisma_1.prisma.remision.findUnique({
            where: { id },
            include: {
                cliente: true,
                detalles: {
                    include: { inventario: true }
                }
            }
        });
        if (!remision)
            return res.status(404).json({ message: "Remisión no encontrada" });
        const empresa = await prisma_1.prisma.configuracion.findFirst();
        const rem = remision; // alias no nulo para tipado posterior
        // ultimo tipo de cambio (si existe)
        let tipoCambioValor = null;
        try {
            const ultimoTC = await prisma_1.prisma.tipoCambio.findFirst({ orderBy: { createdAt: 'desc' } });
            if (ultimoTC && ultimoTC.valor != null)
                tipoCambioValor = Number(ultimoTC.valor);
        }
        catch { }
        await (0, remision_pdf_1.generarRemisionPDFStreamV2)({
            empresa: empresa || {},
            cliente: remision.cliente,
            detalles: remision.detalles,
            numero: remision.numero || remision.id,
            fecha: remision.fecha,
            observacion: remision.observacion || null,
            tipoCambio: tipoCambioValor,
        }, res);
        return;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="remision_${rem.numero || rem.id}.pdf"`);
        const doc = new pdfkit_1.default({ size: "A4", margin: 40 });
        doc.pipe(res);
        const pageWidth = doc.page.width;
        const left = doc.page.margins.left; // 40
        const right = pageWidth - doc.page.margins.right;
        const contentWidth = right - left;
        // Encabezado Empresa
        doc
            .fontSize(18)
            .font("Helvetica-Bold")
            .text(empresa?.razonSocial || "EMPRESA", left, 40, { width: contentWidth, align: "left" })
            .moveDown(0.2)
            .fontSize(10)
            .font("Helvetica")
            .text(`RUC: ${empresa?.ruc || "-"}`)
            .text(`Dirección: ${empresa?.direccion || "-"}`)
            .text(`Tel: ${[empresa?.telefono1, empresa?.telefono2].filter(Boolean).join(" / ")}`)
            .text(`Correo: ${empresa?.correo || "-"}`)
            .text(`Sitio Web: ${empresa?.sitioWeb || "-"}`)
            .moveDown(1);
        // Título Remisión
        doc
            .font("Helvetica-Bold")
            .fontSize(16)
            .text("REMISIÓN", left, doc.y, { align: "center", width: contentWidth })
            .moveDown(0.8);
        // Datos principales
        doc
            .fontSize(12)
            .font("Helvetica")
            .text(`No.: ${rem.numero || rem.id}`)
            .text(`Cliente: ${rem.cliente?.nombre || rem.cliente?.empresa || "N/A"}`)
            .text(`Fecha: ${new Date(rem.fecha).toLocaleDateString()}`)
            .text(`Observación: ${rem.observacion || "N/A"}`)
            .moveDown(0.8);
        // Tabla de ítems (Parte | Producto | Cantidad)
        const headerY = doc.y + 6;
        const wParte = 100;
        const wNombre = Math.max(160, contentWidth - (wParte + 90));
        const wCant = contentWidth - (wParte + wNombre);
        const colX = [left, left + wParte, left + wParte + wNombre];
        // Encabezados
        doc.save();
        doc.rect(left, headerY - 6, contentWidth, 20).fill('#e5edff');
        doc.restore();
        doc.font("Helvetica-Bold").fontSize(10);
        doc.text("Parte", colX[0] + 3, headerY, { width: wParte - 6 });
        doc.text("Producto", colX[1] + 3, headerY, { width: wNombre - 6 });
        doc.text("Cant", colX[2], headerY, { width: wCant - 6, align: 'right' });
        doc.moveTo(left, headerY + 14).lineTo(right, headerY + 14).stroke('#cbd5e1');
        doc.font("Helvetica").fontSize(10);
        let y = headerY + 22;
        const rowHeight = 18;
        for (const d of rem.detalles) {
            const inv = d.inventario || {};
            const parteTxt = String(inv.numeroParte ?? "");
            const nombreTxt = String(inv.nombre ?? inv.descripcion ?? "");
            const cantidadTxt = String(d.cantidad ?? 0);
            // salto de página simple si no hay espacio
            if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
                doc.addPage();
                // volver a dibujar encabezado de tabla
                const yHeader = doc.page.margins.top + 10;
                doc.save();
                doc.rect(left, yHeader - 6, contentWidth, 20).fill('#e5edff');
                doc.restore();
                doc.font("Helvetica-Bold").fontSize(10);
                doc.text("Parte", colX[0] + 3, yHeader, { width: wParte - 6 });
                doc.text("Producto", colX[1] + 3, yHeader, { width: wNombre - 6 });
                doc.text("Cant", colX[2], yHeader, { width: wCant - 6, align: 'right' });
                doc.moveTo(left, yHeader + 14).lineTo(right, yHeader + 14).stroke('#cbd5e1');
                doc.font("Helvetica").fontSize(10);
                y = yHeader + 22;
            }
            doc.text(parteTxt, colX[0] + 3, y - (rowHeight - 6), { width: wParte - 6 });
            doc.text(nombreTxt, colX[1] + 3, y - (rowHeight - 6), { width: wNombre - 6 });
            doc.text(cantidadTxt, colX[2], y - (rowHeight - 6), { width: wCant - 6, align: 'right' });
            y += rowHeight;
        }
        const mensaje = empresa?.mensajeFactura ?? '';
        if (mensaje) {
            doc.moveDown(2);
            doc.fontSize(10).font("Helvetica-Oblique").text(mensaje, { align: "center" });
        }
        doc.end();
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error generando PDF de remisión" });
    }
};
exports.imprimirRemisionPDF = imprimirRemisionPDF;
