"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUsers = listUsers;
exports.setRole = setRole;
const prisma_1 = require("../../db/prisma");
const zod_1 = require("zod");
const RoleSchema = zod_1.z.enum(['USER', 'ADMIN']);
async function listUsers(req, res) {
    const users = await prisma_1.prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
    res.json({ users });
}
async function setRole(req, res) {
    const id = Number(req.params.id);
    if (Number.isNaN(id))
        return res.status(400).json({ message: 'ID inválido' });
    const parsed = RoleSchema.safeParse(req.body.role);
    if (!parsed.success)
        return res.status(400).json({ message: 'Rol inválido' });
    const user = await prisma_1.prisma.user.update({
        where: { id },
        data: { role: parsed.data },
        select: { id: true, name: true, email: true, role: true }
    });
    res.json({ user });
}
