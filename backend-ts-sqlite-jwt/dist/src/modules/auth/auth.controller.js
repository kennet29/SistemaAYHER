"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.me = me;
const prisma_1 = require("../../db/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwt_1 = require("../../utils/jwt");
const zod_1 = require("zod");
const RegisterSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6)
});
const LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6)
});
async function register(req, res) {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json(parsed.error.format());
    const { name, email, password } = parsed.data;
    const exists = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (exists)
        return res.status(409).json({ message: 'Email ya registrado' });
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    const user = await prisma_1.prisma.user.create({
        data: { name, email, passwordHash }
    });
    const role = user.role === 'ADMIN' ? 'ADMIN' : 'USER';
    const token = (0, jwt_1.signToken)({ sub: user.id, role });
    return res.status(201).json({ token, user: { id: user.id, name, email, role: user.role } });
}
async function login(req, res) {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json(parsed.error.format());
    const { email, password } = parsed.data;
    const user = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (!user)
        return res.status(401).json({ message: 'Credenciales inválidas' });
    const ok = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!ok)
        return res.status(401).json({ message: 'Credenciales inválidas' });
    const role = user.role === 'ADMIN' ? 'ADMIN' : 'USER';
    const token = (0, jwt_1.signToken)({ sub: user.id, role });
    return res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
}
async function me(req, res) {
    const userId = req.user.id;
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
    return res.json({ user });
}
