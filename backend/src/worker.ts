import { Worker } from 'bullmq';
import { redisConfig } from './config/redis';
import { taskProcessor } from './processors/taskProcessor';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

/**
 * Worker Independiente para procesamiento asíncrono.
 * Cumple con RNF-ESC-002 (Escalabilidad Horizontal).
 */
const startWorker = async () => {
  // El worker necesita conexión a la BD si los servicios la requieren
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Worker: MongoDB connected');
    } catch (err) {
      console.error('Worker: MongoDB connection error', err);
      process.exit(1);
    }
  }

  const worker = new Worker('{macacos-tasks}', taskProcessor, {
    connection: redisConfig,
    concurrency: 5, // Procesar hasta 5 tareas simultáneas por worker
  });

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} has completed!`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} has failed with ${err.message}`);
  });

  console.log('Worker: BullMQ Worker started successfully');
};

// Capturar errores no manejados
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startWorker();
