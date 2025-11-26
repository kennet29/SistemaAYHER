import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Auth Module', () => {
  describe('Login', () => {
    it('should return 400 if email or password is missing', async () => {
      const app = express();
      app.use(express.json());
      
      app.post('/login', (req, res) => {
        const { email, password } = req.body;
        if (!email || !password) {
          return res.status(400).json({ error: 'Email y contraseña requeridos' });
        }
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/login')
        .send({ email: 'test@test.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email y contraseña requeridos');
    });

    it('should hash password correctly', async () => {
      const password = 'testPassword123';
      const hash = await bcrypt.hash(password, 10);
      const isValid = await bcrypt.compare(password, hash);
      
      expect(isValid).toBe(true);
    });

    it('should generate valid JWT token', () => {
      const payload = { userId: 1, email: 'test@test.com' };
      const secret = process.env.JWT_SECRET || 'test-secret';
      const token = jwt.sign(payload, secret, { expiresIn: '24h' });
      
      const decoded = jwt.verify(token, secret) as any;
      expect(decoded.userId).toBe(1);
      expect(decoded.email).toBe('test@test.com');
    });
  });

  describe('Password Validation', () => {
    it('should validate correct password', async () => {
      const password = 'correctPassword';
      const hash = await bcrypt.hash(password, 10);
      const isValid = await bcrypt.compare(password, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'correctPassword';
      const hash = await bcrypt.hash(password, 10);
      const isValid = await bcrypt.compare('wrongPassword', hash);
      
      expect(isValid).toBe(false);
    });
  });
});
