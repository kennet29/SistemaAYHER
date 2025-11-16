import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export type JwtPayload = {
  sub: number;       // userId
  role: 'USER' | 'ADMIN';
};

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, env.JWT_SECRET as Secret, { expiresIn: env.JWT_EXPIRES_IN } as SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET as Secret) as any as JwtPayload;
}
