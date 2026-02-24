const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const authMiddleware = require('./middleware/authMiddleware');
const tenantMiddleware = require('./middleware/tenantMiddleware');

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
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// TODO: Importar y usar rutas de módulos
// app.use('/api/auth', require('./modules/auth/routes'));
// app.use('/api/tenants', require('./modules/tenants/routes'));
// app.use('/api/users', authMiddleware, tenantMiddleware, require('./modules/users/routes'));
// app.use('/api/charges', authMiddleware, tenantMiddleware, require('./modules/charges/routes'));
// app.use('/api/payments', authMiddleware, tenantMiddleware, require('./modules/payments/routes'));
// app.use('/api/maintenance', authMiddleware, tenantMiddleware, require('./modules/maintenance/routes'));
// app.use('/api/reservations', authMiddleware, tenantMiddleware, require('./modules/reservations/routes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {},
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

module.exports = app;
