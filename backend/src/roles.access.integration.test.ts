import request from 'supertest';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it } from 'vitest';
import app from './app';

type Role = 'superadmin' | 'admin' | 'residente';

const tenantId = '507f1f77bcf86cd799439011';

const tokenFor = (role: Role) =>
  jwt.sign(
    {
      id: `${role}-id`,
      role,
      tenantId,
    },
    process.env.JWT_SECRET as string
  );

const authHeader = (role: Role) => ({ Authorization: `Bearer ${tokenFor(role)}` });

describe('RBAC integration by role (superadmin, admin, usuario/residente)', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'roles-access-secret';
  });

  describe('Superadmin capabilities', () => {
    it('can access tenants routes (superadmin-only)', async () => {
      const response = await request(app)
        .get('/api/tenants/not-a-mongo-id')
        .set(authHeader('superadmin'));

      expect(response.status).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Error de validacion',
        })
      );
    });

    it('can execute admin-level actions in users module', async () => {
      const response = await request(app)
        .put('/api/users/not-a-mongo-id')
        .set(authHeader('superadmin'))
        .send({ name: 'Nuevo Nombre' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Error de validacion',
        })
      );
    });
  });

  describe('Admin capabilities', () => {
    it('cannot access tenants routes', async () => {
      const response = await request(app)
        .get('/api/tenants/not-a-mongo-id')
        .set(authHeader('admin'));

      expect(response.status).toBe(403);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('requires one of these roles: superadmin'),
        })
      );
    });

    it('can access users routes', async () => {
      const response = await request(app)
        .get('/api/users/not-a-mongo-id')
        .set(authHeader('admin'));

      expect(response.status).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Error de validacion',
        })
      );
    });

    it('can perform admin-only actions in maintenance and payments', async () => {
      const maintenanceResponse = await request(app)
        .put('/api/maintenance/not-a-mongo-id')
        .set(authHeader('admin'))
        .send({ status: 'resuelto' });

      expect(maintenanceResponse.status).toBe(400);

      const paymentsResponse = await request(app)
        .post('/api/payments/not-a-mongo-id/approve')
        .set(authHeader('admin'));

      expect(paymentsResponse.status).toBe(400);
    });
  });

  describe('Usuario (residente) capabilities', () => {
    it('cannot access superadmin-only routes (tenants)', async () => {
      const response = await request(app)
        .get('/api/tenants/not-a-mongo-id')
        .set(authHeader('residente'));

      expect(response.status).toBe(403);
    });

    it('cannot access admin routes (users and amenities create)', async () => {
      const usersResponse = await request(app)
        .get('/api/users/not-a-mongo-id')
        .set(authHeader('residente'));

      expect(usersResponse.status).toBe(403);

      const amenitiesResponse = await request(app)
        .post('/api/amenities')
        .set(authHeader('residente'))
        .send({ name: 'Gimnasio' });

      expect(amenitiesResponse.status).toBe(403);
    });

    it('can access resident-enabled modules (units read and reservations create/update)', async () => {
      const unitsResponse = await request(app)
        .get('/api/units/not-a-mongo-id')
        .set(authHeader('residente'));

      expect(unitsResponse.status).toBe(400);

      const createReservationResponse = await request(app)
        .post('/api/reservations')
        .set(authHeader('residente'))
        .send({
          amenity: 'Piscina',
          start: '2026-04-12T11:00:00.000Z',
          end: '2026-04-12T10:00:00.000Z',
        });

      expect(createReservationResponse.status).toBe(400);
      expect(createReservationResponse.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Error de validacion',
        })
      );

      const updateReservationResponse = await request(app)
        .put('/api/reservations/not-a-mongo-id')
        .set(authHeader('residente'))
        .send({ status: 'cancelada' });

      expect(updateReservationResponse.status).toBe(400);
    });

    it('cannot perform admin-only write actions in charges and maintenance', async () => {
      const chargeResponse = await request(app)
        .post('/api/charges')
        .set(authHeader('residente'))
        .send({
          userId: '507f1f77bcf86cd799439012',
          description: 'Cuota mensual',
          amount: 1200,
          dueDate: '2026-05-01T00:00:00.000Z',
        });

      expect(chargeResponse.status).toBe(403);

      const maintenanceResponse = await request(app)
        .put('/api/maintenance/not-a-mongo-id')
        .set(authHeader('residente'))
        .send({ status: 'resuelto' });

      expect(maintenanceResponse.status).toBe(403);
    });
  });
});
