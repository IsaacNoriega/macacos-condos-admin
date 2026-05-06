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
import noticesRoutes from './modules/notices/routes';
import healthRoutes from './modules/health/routes';
import analyticsRoutes from './modules/analytics/routes';
import { AppError } from './utils/httpError';
import logger from './utils/logger';
import { azureIpMiddleware } from './middleware/azureIpMiddleware';

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
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedCorsOrigins.has(origin) || AZURE_SWA_ORIGIN_REGEX.test(origin)) {
      return callback(null, true);
    }

    // In development, we can be more permissive or at least log the mismatch
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CORS] Allowing origin ${origin} in development mode`);
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id']
}));

// 🔥 Seguridad Zero Trust: Solo permitir tráfico desde Azure Application Gateway
app.use(azureIpMiddleware);

// Middleware de logging
app.use(morgan('combined'));

// Webhook de Stripe requiere body sin parsear
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (sin autenticación para balanceadores de carga)
app.use('/health', healthRoutes);

// 🛡️ Validación SSL (PKI Validation)
app.get('/.well-known/pki-validation/ED70DF3BEDBCC33963F5334CD901ACD0.txt', (req, res) => {
  const content = `50B9860ECCB3FF7B305E674807EC0D61C524BFC3393FBF7C2D9B4A0EB3B54EED
comodoca.com
3e6fe478f20b924`;
  res.type('text/plain').send(content);
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
app.use('/api/notices', authMiddleware, tenantMiddleware, noticesRoutes);
app.use('/api/analytics', authMiddleware, tenantMiddleware, analyticsRoutes);

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
