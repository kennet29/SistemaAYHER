import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';
import bcrypt from 'bcryptjs';
import { signToken } from '../../utils/jwt';
import { z } from 'zod';

const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export async function register(req: Request, res: Response) {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());

  const { name, email, password } = parsed.data;
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json({ message: 'Email ya registrado' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash }
  });

  const role = (user as any).role === 'ADMIN' ? 'ADMIN' : 'USER';
  const token = signToken({ sub: user.id, role });
  return res.status(201).json({ token, user: { id: user.id, name, email, role: user.role } });
}

export async function login(req: Request, res: Response) {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' });

  const role = (user as any).role === 'ADMIN' ? 'ADMIN' : 'USER';
  const token = signToken({ sub: user.id, role });
  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
}

export async function me(req: Request, res: Response) {
  const userId = req.user!.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, createdAt: true }
  });
  return res.json({ user });
}
