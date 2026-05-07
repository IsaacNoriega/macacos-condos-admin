import * as appInsights from 'applicationinsights';
import dotenv from 'dotenv';
dotenv.config();

// 📊 Inicialización Crítica de Azure Application Insights (RNF-MON-001)
// Debe ejecutarse antes de cargar express, mongoose o redis para capturar telemetría correctamente.
const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
if (connectionString) {
  appInsights.setup(connectionString)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true) // Habilita también contadores personalizados
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true, true) // Incluye logs de consola en App Insights
    .setSendLiveMetrics(true)
    .start();
  console.log('🚀 Azure Application Insights: Telemetría inicializada y Live Metrics activas.');
} else {
  console.warn('⚠️ [Azure Insights] APPLICATIONINSIGHTS_CONNECTION_STRING no encontrada. Ejecutando sin telemetría remota.');
}

import app from './app';
import connectDB from './config/database';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Start server
    app.listen(PORT as number, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Start background worker with a delay to ensure API is stable first
    setTimeout(() => {
      console.log('Attempting to start background worker...');
      try {
        const { startWorker } = require('./worker');
        startWorker().catch((err: any) => {
          console.error('❌ Worker failed to start (async):', err);
        });
      } catch (err) {
        console.error('❌ Worker failed to start (sync):', err);
      }
    }, 5000);

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
