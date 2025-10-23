import { Router } from 'express';
import { login, me, register } from './auth.controller';
import { authenticate } from '../../middleware/auth';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/me', authenticate, me);
