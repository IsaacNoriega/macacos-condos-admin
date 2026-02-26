import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import authMiddleware from './middleware/authMiddleware';
import tenantMiddleware from './middleware/tenantMiddleware';

import authRoutes from './modules/auth/routes';
import tenantsRoutes from './modules/tenants/routes';
import usersRoutes from './modules/users/routes';
import chargesRoutes from './modules/charges/routes';
import paymentsRoutes from './modules/payments/routes';
import maintenanceRoutes from './modules/maintenance/routes';
import reservationsRoutes from './modules/reservations/routes';

const app = express();

// Middleware de seguridad
app.use(helmet());
app.use(cors());

// Middleware de logging
app.use(morgan('combined'));

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
app.use('/api/charges', authMiddleware, tenantMiddleware, chargesRoutes);
app.use('/api/payments', authMiddleware, tenantMiddleware, paymentsRoutes);
app.use('/api/maintenance', authMiddleware, tenantMiddleware, maintenanceRoutes);
app.use('/api/reservations', authMiddleware, tenantMiddleware, reservationsRoutes);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {},
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
