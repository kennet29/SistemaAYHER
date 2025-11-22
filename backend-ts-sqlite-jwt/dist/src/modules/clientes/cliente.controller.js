"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCliente = exports.updateCliente = exports.searchClientes = exports.getClienteById = exports.getClientes = exports.createCliente = void 0;
const prisma_1 = require("../../db/prisma");
const zod_1 = require("zod");
//// =============================
// ✅ Validación Zod para Cliente
//// =============================
const optionalEmail = zod_1.z
    .string()
    .email("Correo inválido")
    .or(zod_1.z.literal(""))
    .optional();
const clienteSchema = zod_1.z.object({
    tipoCliente: zod_1.z.string().default("PERSONA"),
    nombre: zod_1.z.string().min(2, "El nombre es obligatorio"),
    empresa: zod_1.z.string().optional(),
    nombreContacto: zod_1.z.string().optional(),
    ruc: zod_1.z.string().optional(),
    razonSocial: zod_1.z.string().optional(),
    telefono1: zod_1.z.string().optional(),
    telefono2: zod_1.z.string().optional(),
    correo1: optionalEmail,
    correo2: optionalEmail,
    direccion: zod_1.z.string().optional(),
    observacion: zod_1.z.string().optional(),
    estado: zod_1.z.string().default("ACTIVO"),
    creditoHabilitado: zod_1.z.boolean().default(false),
    creditoMaximoCordoba: zod_1.z.number().nonnegative().optional().default(0),
    creditoMaximoDolar: zod_1.z.number().nonnegative().optional().default(0),
});
//// =============================
// ✅ Crear nuevo cliente
//// =============================
const createCliente = async (req, res) => {
    try {
        const parsed = clienteSchema.safeParse(req.body);
        if (!parsed.success) {
            console.log("BODY CLIENTE:", req.body);
            console.log("ZOD ERROR:", parsed.error?.errors);
            return res.status(400).json({
                message: "Error de validación",
                errors: parsed.error.errors,
            });
        }
        const cliente = await prisma_1.prisma.cliente.create({
            data: parsed.data,
        });
        return res.status(201).json(cliente);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error al crear cliente" });
    }
};
exports.createCliente = createCliente;
//// =============================
// ✅ Obtener todos los clientes
//// =============================
const getClientes = async (req, res) => {
    try {
        const clientes = await prisma_1.prisma.cliente.findMany({
            orderBy: { id: "desc" },
        });
        return res.json(clientes);
    }
    catch (err) {
        return res.status(500).json({ message: "Error al obtener clientes" });
    }
};
exports.getClientes = getClientes;
//// =============================
// ✅ Obtener cliente por ID
//// =============================
const getClienteById = async (req, res) => {
    try {
        const cliente = await prisma_1.prisma.cliente.findUnique({
            where: { id: Number(req.params.id) },
        });
        if (!cliente) {
            return res.status(404).json({ message: "Cliente no encontrado" });
        }
        return res.json(cliente);
    }
    catch (err) {
        return res.status(500).json({ message: "Error al obtener cliente" });
    }
};
exports.getClienteById = getClienteById;
//// =============================
// ✅ Buscar clientes (autocomplete)
//// =============================
const searchClientes = async (req, res) => {
    try {
        const q = (req.query.q?.toString() || "").trim();
        if (!q)
            return res.json([]);
        // Búsqueda compatible con SQLite (sin `mode`)
        const all = await prisma_1.prisma.cliente.findMany({ take: 200 });
        const ql = q.toLowerCase();
        const pick = (s) => (s || "").toLowerCase();
        const filtered = all
            .filter((c) => pick(c.nombre).includes(ql) || pick(c.empresa).includes(ql) || pick(c.ruc).includes(ql))
            .slice(0, 20);
        return res.json(filtered);
    }
    catch (err) {
        return res.status(500).json({ message: "Error al buscar clientes" });
    }
};
exports.searchClientes = searchClientes;
//// =============================
// ✅ Actualizar cliente
//// =============================
const updateCliente = async (req, res) => {
    try {
        const { id } = req.params;
        const parsed = clienteSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Error de validación",
                errors: parsed.error.errors,
            });
        }
        const cliente = await prisma_1.prisma.cliente.update({
            where: { id: Number(id) },
            data: parsed.data,
        });
        return res.json(cliente);
    }
    catch (err) {
        return res.status(500).json({ message: "Error al actualizar cliente" });
    }
};
exports.updateCliente = updateCliente;
//// =============================
// ✅ Eliminar cliente
//// =============================
const deleteCliente = async (req, res) => {
    try {
        const { id } = req.params;
        const exists = await prisma_1.prisma.cliente.findUnique({
            where: { id: Number(id) },
        });
        if (!exists) {
            return res.status(404).json({ message: "Cliente no encontrado" });
        }
        await prisma_1.prisma.cliente.delete({
            where: { id: Number(id) },
        });
        return res.json({ message: "Cliente eliminado correctamente" });
    }
    catch (err) {
        return res.status(500).json({ message: "Error al eliminar cliente" });
    }
};
exports.deleteCliente = deleteCliente;
