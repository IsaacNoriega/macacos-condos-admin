import Redis, { Cluster } from 'ioredis';
import { ConnectionOptions } from 'bullmq';

/**
 * Configuración de conexión para Azure Managed Redis.
 * Soporta modo Cluster (necesario para puerto 10000) y TLS.
 */
export const redisConfig: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  maxRetriesPerRequest: null,
};

const isCluster = process.env.REDIS_CLUSTER === 'true' || process.env.REDIS_PORT === '10000';

export const redisConnection = isCluster
  ? new Cluster(
      [{ host: redisConfig.host, port: redisConfig.port }],
      {
        redisOptions: {
          password: redisConfig.password,
          tls: redisConfig.tls,
        },
        dnsLookup: (address, callback) => callback(null, address),
      }
    )
  : new Redis({
      ...redisConfig,
    });

redisConnection.on('error', (err) => {
  console.error('Redis Connection Error:', err);
});

redisConnection.on('connect', () => {
  console.log(`Successfully connected to Redis (${isCluster ? 'Cluster' : 'Standalone'} mode)`);
});
