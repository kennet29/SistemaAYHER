"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kardex = kardex;
exports.carteraClientes = carteraClientes;
exports.clienteDetalle = clienteDetalle;
exports.ventasDetalladasClientes = ventasDetalladasClientes;
const prisma_1 = require("../../db/prisma");
async function kardex(req, res) {
    const inventarioId = Number(req.params.inventarioId);
    if (isNaN(inventarioId))
        return res.status(400).json({ message: 'ID inválido' });
    // Buscar producto
    const producto = await prisma_1.prisma.inventario.findUnique({
        where: { id: inventarioId },
        include: { marca: true }
    });
    if (!producto)
        return res.status(404).json({ message: 'Producto no encontrado' });
    // Obtener movimientos
    const movimientos = await prisma_1.prisma.movimientoInventario.findMany({
        where: { inventarioId },
        include: { tipoMovimiento: true },
        orderBy: { fecha: 'asc' }
    });
    // Calcular saldo acumulado
    let saldo = 0;
    const data = movimientos.map((m) => {
        saldo += m.tipoMovimiento.esEntrada ? m.cantidad : -m.cantidad;
        return {
            fecha: m.fecha,
            tipo: m.tipoMovimiento.nombre,
            cantidad: m.cantidad,
            afectaStock: m.tipoMovimiento.afectaStock,
            esEntrada: m.tipoMovimiento.esEntrada,
            costoUnitario: m.costoUnitarioCordoba,
            precioUnitario: m.precioVentaUnitarioCordoba,
            usuario: m.usuario,
            observacion: m.observacion,
            saldo
        };
    });
    res.json({
        producto: {
            id: producto.id,
            numeroParte: producto.numeroParte,
            nombre: producto.nombre,
            marca: producto.marca?.nombre,
            stockActual: producto.stockActual
        },
        movimientos: data
    });
}
// ===============================
// 📊 Cartera de Clientes (totales por cliente: Crédito vs Contado)
// ===============================
async function carteraClientes(_req, res) {
    try {
        const rows = await prisma_1.prisma.venta.groupBy({
            by: ['clienteId', 'tipoPago'],
            where: { clienteId: { not: null } },
            _sum: { totalCordoba: true, totalDolar: true },
        });
        const clienteIds = Array.from(new Set(rows.map((r) => r.clienteId))).filter(Boolean);
        const clientes = await prisma_1.prisma.cliente.findMany({
            where: { id: { in: clienteIds } },
            select: {
                id: true,
                nombre: true,
                empresa: true,
                creditoHabilitado: true,
                creditoMaximoCordoba: true,
                creditoMaximoDolar: true,
            },
        });
        const mapCliente = new Map();
        for (const c of clientes)
            mapCliente.set(c.id, c);
        const acc = new Map();
        for (const r of rows) {
            const id = r.clienteId;
            if (!acc.has(id)) {
                const c = mapCliente.get(id);
                acc.set(id, {
                    clienteId: id,
                    clienteNombre: (c?.nombre || c?.empresa || `Cliente ${id}`),
                    totalContadoCordoba: 0,
                    totalCreditoCordoba: 0,
                    totalContadoDolar: 0,
                    totalCreditoDolar: 0,
                    creditoHabilitado: c?.creditoHabilitado ?? false,
                    creditoMaximoCordoba: Number(c?.creditoMaximoCordoba ?? 0),
                    creditoMaximoDolar: Number(c?.creditoMaximoDolar ?? 0),
                });
            }
            const item = acc.get(id);
            const sumC$ = Number(r._sum.totalCordoba || 0);
            const sumUS$ = Number(r._sum.totalDolar || 0);
            if (r.tipoPago === 'CONTADO') {
                item.totalContadoCordoba += sumC$;
                item.totalContadoDolar += sumUS$;
            }
            else if (r.tipoPago === 'CREDITO') {
                item.totalCreditoCordoba += sumC$;
                item.totalCreditoDolar += sumUS$;
            }
        }
        const data = Array.from(acc.values()).sort((a, b) => (b.totalContadoCordoba + b.totalCreditoCordoba) - (a.totalContadoCordoba + a.totalCreditoCordoba));
        res.json({ data });
    }
    catch (err) {
        console.error('❌ Error en carteraClientes:', err);
        res.status(500).json({ message: 'Error interno al calcular cartera de clientes' });
    }
}
// ===============================
// 👤 Detalle completo de un cliente
// ===============================
async function clienteDetalle(req, res) {
    try {
        const clienteId = Number(req.params.clienteId);
        if (isNaN(clienteId))
            return res.status(400).json({ message: 'ID de cliente invalido' });
        // Obtener información del cliente
        const cliente = await prisma_1.prisma.cliente.findUnique({
            where: { id: clienteId },
            select: {
                id: true,
                nombre: true,
                empresa: true,
                telefono1: true,
                telefono2: true,
                correo1: true,
                correo2: true,
                creditoHabilitado: true,
                creditoMaximoCordoba: true,
                creditoMaximoDolar: true,
            },
        });
        if (!cliente) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }
        // Obtener todas las ventas del cliente
        const ventas = await prisma_1.prisma.venta.findMany({
            where: { clienteId },
            include: {
                detalles: {
                    include: {
                        inventario: {
                            include: {
                                marca: true,
                                categoria: true,
                            },
                        },
                    },
                },
            },
            orderBy: { fecha: 'desc' },
        });
        // Calcular estadísticas
        const totalVentas = ventas.length;
        const totalCordoba = ventas.reduce((sum, v) => sum + Number(v.totalCordoba || 0), 0);
        const totalDolar = ventas.reduce((sum, v) => sum + Number(v.totalDolar || 0), 0);
        const promedioCordoba = totalVentas > 0 ? totalCordoba / totalVentas : 0;
        const promedioDolar = totalVentas > 0 ? totalDolar / totalVentas : 0;
        // Contar ventas por tipo de pago
        const ventasContado = ventas.filter((v) => v.tipoPago === 'CONTADO').length;
        const ventasCredito = ventas.filter((v) => v.tipoPago === 'CREDITO').length;
        // Analizar productos más comprados
        const productosMap = new Map();
        const marcasMap = new Map();
        const categoriasMap = new Map();
        for (const venta of ventas) {
            for (const detalle of venta.detalles) {
                const invId = detalle.inventarioId;
                const cantidad = Number(detalle.cantidad || 0);
                const subtotal = cantidad * Number(detalle.precioUnitarioCordoba || 0);
                // Productos
                if (invId && detalle.inventario) {
                    const nombre = detalle.inventario.nombre || 'Producto desconocido';
                    if (!productosMap.has(invId)) {
                        productosMap.set(invId, { nombre, cantidad: 0, veces: 0, total: 0 });
                    }
                    const prod = productosMap.get(invId);
                    prod.cantidad += cantidad;
                    prod.veces += 1;
                    prod.total += subtotal;
                }
                // Marcas
                if (detalle.inventario?.marca?.nombre) {
                    const marca = detalle.inventario.marca.nombre;
                    if (!marcasMap.has(marca)) {
                        marcasMap.set(marca, { cantidad: 0, veces: 0 });
                    }
                    const m = marcasMap.get(marca);
                    m.cantidad += cantidad;
                    m.veces += 1;
                }
                // Categorías
                if (detalle.inventario?.categoria?.nombre) {
                    const categoria = detalle.inventario.categoria.nombre;
                    if (!categoriasMap.has(categoria)) {
                        categoriasMap.set(categoria, { cantidad: 0, veces: 0 });
                    }
                    const c = categoriasMap.get(categoria);
                    c.cantidad += cantidad;
                    c.veces += 1;
                }
            }
        }
        // Top productos
        const topProductos = Array.from(productosMap.entries())
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.cantidad - a.cantidad)
            .slice(0, 10);
        // Top marcas
        const topMarcas = Array.from(marcasMap.entries())
            .map(([nombre, data]) => ({ nombre, ...data }))
            .sort((a, b) => b.cantidad - a.cantidad)
            .slice(0, 5);
        // Top categorías
        const topCategorias = Array.from(categoriasMap.entries())
            .map(([nombre, data]) => ({ nombre, ...data }))
            .sort((a, b) => b.cantidad - a.cantidad)
            .slice(0, 5);
        // Hábitos de compra (frecuencia por mes)
        const ventasPorMes = new Map();
        for (const venta of ventas) {
            const fecha = new Date(venta.fecha);
            const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
            ventasPorMes.set(mesKey, (ventasPorMes.get(mesKey) || 0) + 1);
        }
        const habitosCompra = Array.from(ventasPorMes.entries())
            .map(([mes, cantidad]) => ({ mes, cantidad }))
            .sort((a, b) => b.mes.localeCompare(a.mes))
            .slice(0, 12);
        // Última compra
        const ultimaCompra = ventas.length > 0 ? ventas[0].fecha : null;
        // Días desde última compra
        const diasDesdeUltimaCompra = ultimaCompra
            ? Math.floor((Date.now() - new Date(ultimaCompra).getTime()) / (1000 * 60 * 60 * 24))
            : null;
        res.json({
            cliente: {
                id: cliente.id,
                nombre: cliente.nombre,
                empresa: cliente.empresa,
                telefono: cliente.telefono1 || cliente.telefono2 || null,
                correo: cliente.correo1 || cliente.correo2 || null,
                creditoHabilitado: cliente.creditoHabilitado,
                creditoMaximoCordoba: Number(cliente.creditoMaximoCordoba || 0),
                creditoMaximoDolar: Number(cliente.creditoMaximoDolar || 0),
            },
            estadisticas: {
                totalVentas,
                totalCordoba,
                totalDolar,
                promedioCordoba,
                promedioDolar,
                ventasContado,
                ventasCredito,
                ultimaCompra,
                diasDesdeUltimaCompra,
            },
            topProductos,
            topMarcas,
            topCategorias,
            habitosCompra,
        });
    }
    catch (err) {
        console.error('❌ Error en clienteDetalle:', err);
        res.status(500).json({ message: 'Error interno al obtener detalle del cliente' });
    }
}
// ===============================
// 📊 Reporte detallado de ventas por clientes con utilidad
// ===============================
async function ventasDetalladasClientes(req, res) {
    try {
        const { fechaInicio, fechaFin } = req.query;
        if (!fechaInicio || !fechaFin) {
            return res.status(400).json({ message: 'Fechas de inicio y fin son requeridas' });
        }
        // Obtener ventas en el rango de fechas con todos los detalles
        const ventas = await prisma_1.prisma.venta.findMany({
            where: {
                fecha: {
                    gte: new Date(fechaInicio),
                    lte: new Date(fechaFin),
                },
                clienteId: { not: null },
            },
            include: {
                cliente: true,
                detalles: {
                    include: {
                        inventario: {
                            include: {
                                marca: true,
                                categoria: true,
                            },
                        },
                    },
                },
            },
            orderBy: [
                { cliente: { nombre: 'asc' } },
                { fecha: 'asc' },
            ],
        });
        // Agrupar por cliente
        const porCliente = new Map();
        for (const venta of ventas) {
            const clienteId = venta.clienteId;
            if (!porCliente.has(clienteId)) {
                porCliente.set(clienteId, {
                    clienteId,
                    clienteNombre: venta.cliente?.nombre || venta.cliente?.empresa || `Cliente ${clienteId}`,
                    ventas: [],
                    totalVendido: 0,
                    totalCosto: 0,
                    totalUtilidad: 0,
                });
            }
            const cliente = porCliente.get(clienteId);
            // Calcular totales de esta venta
            let ventaTotalVendido = 0;
            let ventaTotalCosto = 0;
            const detallesVenta = [];
            for (const detalle of venta.detalles) {
                const cantidad = Number(detalle.cantidad || 0);
                const precioVenta = Number(detalle.precioUnitarioCordoba || 0);
                const subtotal = cantidad * precioVenta;
                // Obtener el costo del inventario
                const costoUnitario = Number(detalle.inventario?.costoPromedioCordoba || 0);
                const costoTotal = cantidad * costoUnitario;
                ventaTotalVendido += subtotal;
                ventaTotalCosto += costoTotal;
                detallesVenta.push({
                    producto: detalle.inventario?.nombre || '—',
                    numeroParte: detalle.inventario?.numeroParte || '—',
                    marca: detalle.inventario?.marca?.nombre || '—',
                    categoria: detalle.inventario?.categoria?.nombre || '—',
                    cantidad,
                    precioVenta,
                    costoUnitario,
                    subtotal,
                    costoTotal,
                    utilidad: subtotal - costoTotal,
                });
            }
            cliente.ventas.push({
                fecha: venta.fecha,
                numeroFactura: venta.numeroFactura || `#${venta.id}`,
                tipoPago: venta.tipoPago,
                totalVendido: ventaTotalVendido,
                totalCosto: ventaTotalCosto,
                utilidad: ventaTotalVendido - ventaTotalCosto,
                detalles: detallesVenta,
            });
            cliente.totalVendido += ventaTotalVendido;
            cliente.totalCosto += ventaTotalCosto;
            cliente.totalUtilidad += (ventaTotalVendido - ventaTotalCosto);
        }
        // Generar Excel
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Ventas por Cliente');
        // Estilos
        const headerStyle = {
            font: { bold: true, color: { argb: 'FFFFFFFF' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF004aad' } },
            alignment: { horizontal: 'center', vertical: 'middle' },
            border: {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            },
        };
        const clienteHeaderStyle = {
            font: { bold: true, size: 12, color: { argb: 'FFFFFFFF' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2e7d32' } },
            alignment: { horizontal: 'left', vertical: 'middle' },
        };
        const totalStyle = {
            font: { bold: true },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4CC' } },
            alignment: { horizontal: 'right', vertical: 'middle' },
        };
        let currentRow = 1;
        // Título
        worksheet.mergeCells(currentRow, 1, currentRow, 11);
        const titleCell = worksheet.getCell(currentRow, 1);
        titleCell.value = `Reporte Detallado de Ventas por Cliente (${fechaInicio} - ${fechaFin})`;
        titleCell.font = { bold: true, size: 14 };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        currentRow += 2;
        let totalGeneralVendido = 0;
        let totalGeneralCosto = 0;
        let totalGeneralUtilidad = 0;
        // Por cada cliente
        for (const [, cliente] of porCliente) {
            // Header del cliente
            worksheet.mergeCells(currentRow, 1, currentRow, 11);
            const clienteCell = worksheet.getCell(currentRow, 1);
            clienteCell.value = `Cliente: ${cliente.clienteNombre}`;
            clienteCell.style = clienteHeaderStyle;
            currentRow++;
            // Headers de columnas
            const headers = ['Fecha', 'Factura', 'Tipo Pago', 'Producto', 'N° Parte', 'Marca', 'Categoria', 'Cant.', 'Precio Venta', 'Costo Unit.', 'Utilidad'];
            headers.forEach((header, idx) => {
                const cell = worksheet.getCell(currentRow, idx + 1);
                cell.value = header;
                cell.style = headerStyle;
            });
            currentRow++;
            // Detalles de ventas
            for (const venta of cliente.ventas) {
                for (const detalle of venta.detalles) {
                    worksheet.getCell(currentRow, 1).value = new Date(venta.fecha).toLocaleDateString();
                    worksheet.getCell(currentRow, 2).value = venta.numeroFactura;
                    worksheet.getCell(currentRow, 3).value = venta.tipoPago;
                    worksheet.getCell(currentRow, 4).value = detalle.producto;
                    worksheet.getCell(currentRow, 5).value = detalle.numeroParte;
                    worksheet.getCell(currentRow, 6).value = detalle.marca;
                    worksheet.getCell(currentRow, 7).value = detalle.categoria;
                    worksheet.getCell(currentRow, 8).value = detalle.cantidad;
                    worksheet.getCell(currentRow, 9).value = detalle.precioVenta;
                    worksheet.getCell(currentRow, 9).numFmt = 'C$#,##0.00';
                    worksheet.getCell(currentRow, 10).value = detalle.costoUnitario;
                    worksheet.getCell(currentRow, 10).numFmt = 'C$#,##0.00';
                    worksheet.getCell(currentRow, 11).value = detalle.utilidad;
                    worksheet.getCell(currentRow, 11).numFmt = 'C$#,##0.00';
                    currentRow++;
                }
            }
            // Totales del cliente
            worksheet.mergeCells(currentRow, 1, currentRow, 8);
            const totalClienteCell = worksheet.getCell(currentRow, 1);
            totalClienteCell.value = `Total ${cliente.clienteNombre}:`;
            totalClienteCell.style = totalStyle;
            worksheet.getCell(currentRow, 9).value = cliente.totalVendido;
            worksheet.getCell(currentRow, 9).numFmt = 'C$#,##0.00';
            worksheet.getCell(currentRow, 9).style = totalStyle;
            worksheet.getCell(currentRow, 10).value = cliente.totalCosto;
            worksheet.getCell(currentRow, 10).numFmt = 'C$#,##0.00';
            worksheet.getCell(currentRow, 10).style = totalStyle;
            worksheet.getCell(currentRow, 11).value = cliente.totalUtilidad;
            worksheet.getCell(currentRow, 11).numFmt = 'C$#,##0.00';
            worksheet.getCell(currentRow, 11).style = totalStyle;
            currentRow += 2;
            totalGeneralVendido += cliente.totalVendido;
            totalGeneralCosto += cliente.totalCosto;
            totalGeneralUtilidad += cliente.totalUtilidad;
        }
        // Total general
        worksheet.mergeCells(currentRow, 1, currentRow, 8);
        const totalGeneralCell = worksheet.getCell(currentRow, 1);
        totalGeneralCell.value = 'TOTAL GENERAL:';
        totalGeneralCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        totalGeneralCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF004aad' } };
        totalGeneralCell.alignment = { horizontal: 'right', vertical: 'middle' };
        worksheet.getCell(currentRow, 9).value = totalGeneralVendido;
        worksheet.getCell(currentRow, 9).numFmt = 'C$#,##0.00';
        worksheet.getCell(currentRow, 9).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        worksheet.getCell(currentRow, 9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF004aad' } };
        worksheet.getCell(currentRow, 10).value = totalGeneralCosto;
        worksheet.getCell(currentRow, 10).numFmt = 'C$#,##0.00';
        worksheet.getCell(currentRow, 10).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        worksheet.getCell(currentRow, 10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF004aad' } };
        worksheet.getCell(currentRow, 11).value = totalGeneralUtilidad;
        worksheet.getCell(currentRow, 11).numFmt = 'C$#,##0.00';
        worksheet.getCell(currentRow, 11).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
        worksheet.getCell(currentRow, 11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF004aad' } };
        // Ajustar anchos de columna
        worksheet.columns = [
            { width: 12 }, // Fecha
            { width: 15 }, // Factura
            { width: 12 }, // Tipo Pago
            { width: 30 }, // Producto
            { width: 15 }, // N° Parte
            { width: 15 }, // Marca
            { width: 15 }, // Categoria
            { width: 8 }, // Cant.
            { width: 15 }, // Precio Venta
            { width: 15 }, // Costo Unit.
            { width: 15 }, // Utilidad
        ];
        // Generar buffer y enviar
        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=reporte_ventas_clientes_${fechaInicio}_${fechaFin}.xlsx`);
        res.send(buffer);
    }
    catch (err) {
        console.error('❌ Error en ventasDetalladasClientes:', err);
        res.status(500).json({ message: 'Error interno al generar reporte' });
    }
}
