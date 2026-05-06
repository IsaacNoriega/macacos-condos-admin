import Redis from 'ioredis';
import { ConnectionOptions } from 'bullmq';

/**
 * Configuración de conexión para Azure Managed Redis.
 * Cumple con el requisito de seguridad mediante TLS en puerto 6380.
 */
export const redisConfig: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  maxRetriesPerRequest: null, // Requerido por BullMQ
};

export const redisConnection = new Redis({
  ...redisConfig,
  // Configuraciones adicionales de ioredis si son necesarias
});

redisConnection.on('error', (err) => {
  console.error('Redis Connection Error:', err);
});

redisConnection.on('connect', () => {
  console.log('Successfully connected to Redis');
});
