import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';
import { z } from 'zod';

const RoleSchema = z.enum(['USER', 'ADMIN']);

export async function listUsers(req: Request, res: Response) {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true }
  });
  res.json({ users });
}

export async function setRole(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'ID inválido' });

  const parsed = RoleSchema.safeParse(req.body.role);
  if (!parsed.success) return res.status(400).json({ message: 'Rol inválido' });

  const user = await prisma.user.update({
    where: { id },
    data: { role: parsed.data },
    select: { id: true, name: true, email: true, role: true }
  });

  res.json({ user });
}
