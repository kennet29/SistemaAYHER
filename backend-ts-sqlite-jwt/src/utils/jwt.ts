import jwt, { Secret } from 'jsonwebtoken';
import { env } from '../config/env';

export type JwtPayload = {
  sub: number;       // userId
  role: 'USER' | 'ADMIN';
};

export function signToken(payload: JwtPayload) {
  // Sign tokens without expiration so sessions do not expire
  return jwt.sign(payload, env.JWT_SECRET as Secret);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET as Secret) as any as JwtPayload;
}
