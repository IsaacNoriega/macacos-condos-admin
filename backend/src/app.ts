import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import authMiddleware from './middleware/authMiddleware';
import tenantMiddleware from './middleware/tenantMiddleware';

import authRoutes from './modules/auth/routes';
import tenantsRoutes from './modules/tenants/routes';
import usersRoutes from './modules/users/routes';
import unitsRoutes from './modules/units/routes';
import residentsRoutes from './modules/residents/routes';
import chargesRoutes from './modules/charges/routes';
import paymentsRoutes from './modules/payments/routes';
import { stripeWebhook } from './modules/payments/controller';
import maintenanceRoutes from './modules/maintenance/routes';
import reservationsRoutes from './modules/reservations/routes';
import amenitiesRoutes from './modules/amenities/routes';
import { AppError } from './utils/httpError';
import logger from './utils/logger';

const app = express();

// Middleware de seguridad
app.use(helmet({ crossOriginResourcePolicy: false }));

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:4200',
  'https://delightful-bay-02eed360f.2.azurestaticapps.net',
];

const configuredCorsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedCorsOrigins = new Set<string>([...DEFAULT_CORS_ORIGINS, ...configuredCorsOrigins]);

// Azure Static Web Apps issues preview deployments on *.azurestaticapps.net;
// we allow those by default so PR preview environments can reach the API.
const AZURE_SWA_ORIGIN_REGEX = /^https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.azurestaticapps\.net$/i;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedCorsOrigins.has(origin) || AZURE_SWA_ORIGIN_REGEX.test(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id']
}));

// Middleware de logging
app.use(morgan('combined'));

// Webhook de Stripe requiere body sin parsear
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (sin autenticación)
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Importar y usar rutas de módulos
app.use('/api/auth', authRoutes);
app.use('/api/tenants', authMiddleware, tenantsRoutes);
app.use('/api/users', authMiddleware, tenantMiddleware, usersRoutes);
app.use('/api/units', authMiddleware, tenantMiddleware, unitsRoutes);
app.use('/api/residents', authMiddleware, tenantMiddleware, residentsRoutes);
app.use('/api/charges', authMiddleware, tenantMiddleware, chargesRoutes);
app.use('/api/payments', authMiddleware, tenantMiddleware, paymentsRoutes);
app.use('/api/maintenance', authMiddleware, tenantMiddleware, maintenanceRoutes);
app.use('/api/reservations', authMiddleware, tenantMiddleware, reservationsRoutes);
app.use('/api/amenities', authMiddleware, tenantMiddleware, amenitiesRoutes);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err instanceof AppError ? err.statusCode : err.status || 500;
  const message = err instanceof AppError ? err.message : err.message || 'Internal server error';

  logger.error(
    'app.unhandled.error',
    req.user?.id ? String(req.user.id) : 'system',
    req.tenantId || 'global',
    err instanceof Error ? err : new Error(String(err))
  );

  res.status(statusCode).json({
    success: false,
    message,
    errors:
      err instanceof AppError && err.details
        ? err.details
        : process.env.NODE_ENV === 'development'
        ? { stack: err?.stack }
        : undefined,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

export default app;
