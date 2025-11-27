"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.importarExcel = importarExcel;
const prisma_1 = require("../../db/prisma");
const XLSX = __importStar(require("xlsx"));
// Función para obtener tipo de cambio
async function getTipoCambio() {
    try {
        const latest = await prisma_1.prisma.tipoCambio.findFirst({
            orderBy: { fecha: "desc" },
        });
        return Number(latest?.valor ?? 36.5);
    }
    catch {
        return 36.5;
    }
}
// Función para buscar o crear marca
async function obtenerMarcaId(nombreMarca) {
    const nombre = (nombreMarca || "Desconocido").trim();
    // SQLite no soporta mode: "insensitive", así que buscamos por nombre exacto
    let marca = await prisma_1.prisma.marca.findFirst({
        where: { nombre: nombre },
    });
    if (!marca) {
        marca = await prisma_1.prisma.marca.create({
            data: { nombre },
        });
    }
    return marca.id;
}
// Función para buscar o crear categoría
async function obtenerCategoriaId(nombreCategoria) {
    const nombre = (nombreCategoria || "General").trim();
    // SQLite no soporta mode: "insensitive", así que buscamos por nombre exacto
    let categoria = await prisma_1.prisma.categoria.findFirst({
        where: { nombre: nombre },
    });
    if (!categoria) {
        categoria = await prisma_1.prisma.categoria.create({
            data: { nombre },
        });
    }
    return categoria.id;
}
// Limpiar valor numérico (quitar $, comas, etc.)
function limpiarNumero(valor) {
    if (typeof valor === "number")
        return valor;
    if (!valor)
        return 0;
    const str = String(valor).replace(/[$,\s]/g, "");
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
}
async function importarExcel(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No se recibió ningún archivo" });
        }
        const tipoCambio = await getTipoCambio();
        const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);
        let creados = 0;
        let actualizados = 0;
        let errores = [];
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            try {
                // Buscar columnas con diferentes variaciones de nombres
                const findColumn = (variations) => {
                    for (const key of Object.keys(row)) {
                        const normalizedKey = key.trim().toUpperCase().replace(/\s+/g, " ");
                        for (const variation of variations) {
                            if (normalizedKey === variation.toUpperCase()) {
                                return String(row[key] || "").trim();
                            }
                        }
                    }
                    return "";
                };
                // Extraer datos del Excel con múltiples variaciones
                const numeroParte = findColumn([
                    "NUMERO DE PARTE",
                    "Numero de Parte",
                    "numero de parte",
                    "NumeroParte",
                    "Nro Parte",
                    "N° Parte",
                    "Código",
                    "Codigo",
                    "Code"
                ]);
                const nombre = findColumn([
                    "DESCRIPCION",
                    "Descripcion",
                    "descripcion",
                    "NOMBRE",
                    "Nombre",
                    "nombre",
                    "Description",
                    "Producto"
                ]);
                const marcaNombre = findColumn([
                    "MARCA",
                    "Marca",
                    "marca",
                    "Brand"
                ]) || "Desconocido";
                const categoriaNombre = findColumn([
                    "CATEGORIA",
                    "Categoria",
                    "categoria",
                    "Category"
                ]) || "General";
                if (!numeroParte || !nombre) {
                    errores.push(`Fila ${i + 2}: Falta número de parte o descripción`);
                    continue;
                }
                const stockActualStr = findColumn([
                    "STOCK REAL",
                    "Stock Real",
                    "stock real",
                    "Stock",
                    "Existencia",
                    "Cantidad"
                ]);
                const stockActual = Math.max(0, Math.floor(limpiarNumero(stockActualStr || 0)));
                const costoDolar = limpiarNumero(findColumn([
                    "PRECIO COSTO PROMEDIO",
                    "Precio Costo Promedio",
                    "precio costo promedio",
                    "Costo",
                    "Cost"
                ]) || 0);
                const ventaDolar = limpiarNumero(findColumn([
                    "PRECIO VENTA PROMEDIO",
                    "Precio Venta Promedio",
                    "precio venta promedio",
                    "Precio Venta",
                    "Venta",
                    "Price"
                ]) || 0);
                const sugeridoDolar = limpiarNumero(findColumn([
                    "PRECIO SUGERIDO",
                    "Precio Sugerido",
                    "precio sugerido",
                    "Sugerido",
                    "Suggested Price"
                ]) || ventaDolar);
                // Convertir a córdobas
                const costoCordoba = costoDolar * tipoCambio;
                const ventaCordoba = ventaDolar * tipoCambio;
                const sugeridoCordoba = sugeridoDolar * tipoCambio;
                // Códigos sustitutos
                const codigoSustituto = findColumn(["PPCY", "ppcy"]) || null;
                const codigoSustituto2 = findColumn(["PPVU", "ppvu"]) || null;
                // Obtener IDs de marca y categoría
                const marcaId = await obtenerMarcaId(marcaNombre);
                const categoriaId = await obtenerCategoriaId(categoriaNombre);
                // Verificar si el producto ya existe
                const existente = await prisma_1.prisma.inventario.findFirst({
                    where: { numeroParte, marcaId },
                });
                const productoData = {
                    numeroParte,
                    nombre,
                    marcaId,
                    categoriaId,
                    stockActual,
                    costoPromedioCordoba: costoCordoba,
                    precioVentaPromedioCordoba: ventaCordoba,
                    precioVentaSugeridoCordoba: sugeridoCordoba,
                    costoPromedioDolar: costoDolar,
                    precioVentaPromedioDolar: ventaDolar,
                    precioVentaSugeridoDolar: sugeridoDolar,
                    // No incluir códigos sustitutos en la importación inicial
                    // Se pueden agregar manualmente después
                };
                if (existente) {
                    // Actualizar producto existente
                    await prisma_1.prisma.inventario.update({
                        where: { id: existente.id },
                        data: productoData,
                    });
                    actualizados++;
                }
                else {
                    // Crear nuevo producto - eliminar marcaId y categoriaId para usar connect
                    const { marcaId: _, categoriaId: __, ...dataParaCrear } = productoData;
                    await prisma_1.prisma.inventario.create({
                        data: {
                            ...dataParaCrear,
                            marca: { connect: { id: marcaId } },
                            categoria: { connect: { id: categoriaId } },
                        },
                    });
                    creados++;
                }
            }
            catch (error) {
                errores.push(`Fila ${i + 2}: ${error.message}`);
            }
        }
        res.json({
            success: true,
            creados,
            actualizados,
            errores,
            total: data.length,
        });
    }
    catch (error) {
        console.error("Error al importar Excel:", error);
        res.status(500).json({ message: "Error al procesar el archivo", error: error.message });
    }
}
