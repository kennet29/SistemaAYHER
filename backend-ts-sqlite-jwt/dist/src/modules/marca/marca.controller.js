"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.list = list;
exports.create = create;
exports.getById = getById;
exports.update = update;
exports.remove = remove;
const prisma_1 = require("../../db/prisma");
const zod_1 = require("zod");
const MarcaSchema = zod_1.z.object({
    nombre: zod_1.z.string().min(1),
    descripcion: zod_1.z.string().optional()
});
async function list(_req, res) {
    const marcas = await prisma_1.prisma.marca.findMany({ orderBy: { nombre: 'asc' } });
    res.json({ marcas });
}
async function create(req, res) {
    const parsed = MarcaSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json(parsed.error.format());
    const marca = await prisma_1.prisma.marca.create({ data: parsed.data });
    res.status(201).json({ marca });
}
async function getById(req, res) {
    const id = Number(req.params.id);
    const marca = await prisma_1.prisma.marca.findUnique({ where: { id } });
    if (!marca)
        return res.status(404).json({ message: 'No encontrada' });
    res.json({ marca });
}
async function update(req, res) {
    const id = Number(req.params.id);
    const parsed = MarcaSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json(parsed.error.format());
    const marca = await prisma_1.prisma.marca.update({ where: { id }, data: parsed.data });
    res.json({ marca });
}
async function remove(req, res) {
    const id = Number(req.params.id);
    await prisma_1.prisma.marca.delete({ where: { id } });
    res.json({ ok: true });
}
