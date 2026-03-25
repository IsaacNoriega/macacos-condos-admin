import request from 'supertest';
import jwt from 'jsonwebtoken';
import { describe, expect, it, beforeEach } from 'vitest';
import app from './app';

describe('app integration', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'integration-secret';
  });

  it('GET /health returns OK and timestamp', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: 'OK',
        timestamp: expect.any(String),
      })
    );
  });

  it('returns 404 for unknown routes', async () => {
    const response = await request(app).get('/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: 'Route not found',
    });
  });

  it('rejects protected route without token', async () => {
    const response = await request(app).get('/api/users');

    expect(response.status).toBe(401);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        message: 'No token provided',
      })
    );
  });

  it('rejects tenant scoped route when token has no tenantId', async () => {
    const token = jwt.sign({ id: 'u1', role: 'admin' }, process.env.JWT_SECRET as string);

    const response = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        message: 'No tenantId found in token',
      })
    );
  });

  it('rejects tenants route when role is missing in token', async () => {
    const token = jwt.sign({ id: 'u1' }, process.env.JWT_SECRET as string);

    const response = await request(app)
      .get('/api/tenants')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        message: 'User role not found',
      })
    );
  });

  it('validates login payload before controller execution', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'invalid-email', password: '' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        message: 'Error de validacion',
        errors: expect.any(Array),
      })
    );
  });

  it('validates reset-password payload before controller execution', async () => {
    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: '', newPassword: '123' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        message: 'Error de validacion',
        errors: expect.any(Array),
      })
    );
  });
});
