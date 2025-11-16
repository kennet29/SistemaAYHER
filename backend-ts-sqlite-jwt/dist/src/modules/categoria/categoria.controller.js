"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.getById = getById;
exports.create = create;
exports.update = update;
exports.remove = remove;
const prisma_1 = require("../../db/prisma");
const zod_1 = require("zod");
// 🧩 Validación con Zod
const CategoriaSchema = zod_1.z.object({
    nombre: zod_1.z.string().min(1, 'El nombre es obligatorio'),
    descripcion: zod_1.z.string().optional().nullable(),
});
// 📋 Listar todas las categorías
async function list(_req, res) {
    const categorias = await prisma_1.prisma.categoria.findMany({
        orderBy: { nombre: 'asc' },
        include: {
            _count: {
                select: { inventarios: true }, // cuántos productos tiene cada categoría
            },
        },
    });
    res.json({ categorias });
}
// 🔍 Obtener categoría por ID
async function getById(req, res) {
    const id = Number(req.params.id);
    if (isNaN(id))
        return res.status(400).json({ message: 'ID inválido' });
    const categoria = await prisma_1.prisma.categoria.findUnique({
        where: { id },
        include: { inventarios: true },
    });
    if (!categoria)
        return res.status(404).json({ message: 'Categoría no encontrada' });
    res.json({ categoria });
}
// ➕ Crear nueva categoría
async function create(req, res) {
    const parsed = CategoriaSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json(parsed.error.format());
    const data = parsed.data;
    // Evitar duplicados por nombre
    const existente = await prisma_1.prisma.categoria.findUnique({
        where: { nombre: data.nombre },
    });
    if (existente)
        return res.status(409).json({ message: 'Ya existe una categoría con ese nombre' });
    const nueva = await prisma_1.prisma.categoria.create({ data });
    res.status(201).json({ categoria: nueva });
}
// ✏️ Actualizar categoría existente
async function update(req, res) {
    const id = Number(req.params.id);
    if (isNaN(id))
        return res.status(400).json({ message: 'ID inválido' });
    const parsed = CategoriaSchema.partial().safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json(parsed.error.format());
    const data = parsed.data;
    const categoria = await prisma_1.prisma.categoria.update({
        where: { id },
        data,
    });
    res.json({ categoria });
}
// ❌ Eliminar categoría (solo si no tiene productos)
async function remove(req, res) {
    const id = Number(req.params.id);
    if (isNaN(id))
        return res.status(400).json({ message: 'ID inválido' });
    const categoria = await prisma_1.prisma.categoria.findUnique({
        where: { id },
        include: { inventarios: true },
    });
    if (!categoria)
        return res.status(404).json({ message: 'Categoría no encontrada' });
    if (categoria.inventarios.length > 0) {
        return res.status(400).json({ message: 'No se puede eliminar una categoría con productos asociados' });
    }
    await prisma_1.prisma.categoria.delete({ where: { id } });
    res.json({ ok: true, message: 'Categoría eliminada correctamente' });
}
