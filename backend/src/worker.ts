import { Worker } from 'bullmq';
import { redisConnection } from './config/redis';
import { taskProcessor } from './processors/taskProcessor';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

/**
 * Worker Independiente para procesamiento asíncrono.
 * Cumple con RNF-ESC-002 (Escalabilidad Horizontal).
 */
export const startWorker = async () => {
  // El worker necesita conexión a la BD si los servicios la requieren
  if (mongoose.connection.readyState === 0 && process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Worker: MongoDB connected');
    } catch (err) {
      console.error('Worker: MongoDB connection error', err);
      // No salir si falla aquí, quizás la API ya está conectada
    }
  }

  const worker = new Worker('{macacos-tasks}', taskProcessor, {
    connection: redisConnection,
    concurrency: 5, // Procesar hasta 5 tareas simultáneas por worker
  });

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} has completed!`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} has failed with ${err.message}`);
  });

  console.log('Worker: BullMQ Worker started successfully');
  return worker;
};

// Capturar errores no manejados
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Solo arrancar automáticamente si es el archivo principal
if (require.main === module) {
  startWorker();
}
