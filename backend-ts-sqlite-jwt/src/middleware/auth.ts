import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No autorizado' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    req.user = { id: decoded.sub, role: decoded.role };
    return next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

export function requireRoles(...roles: Array<'USER' | 'ADMIN'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'No autorizado' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Prohibido' });
    }
    next();
  };
}
