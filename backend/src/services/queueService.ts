import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import logger from '../utils/logger';

/**
 * Servicio Productor de Tareas.
 * Permite delegar procesos pesados a workers independientes (RNF-ESC-002).
 */
class QueueService {
  private queue: Queue;

  constructor() {
    this.queue = new Queue('{macacos-tasks}', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }

  /**
   * Agrega un trabajo a la cola asegurando el aislamiento multi-tenant.
   */
  async addTask(name: string, data: any, tenantId: string) {
    if (!tenantId) {
      throw new Error('Aislamiento Crítico: tenantId es obligatorio para agregar tareas a la cola.');
    }

    console.log(`[QueueService] Añadiendo tarea '${name}' para tenant: ${tenantId}`);
    const job = await this.queue.add(name, { ...data, tenantId });
    console.log(`[QueueService] Tarea añadida exitosamente. JobID: ${job.id}`);
    
    logger.log('queue.task.added', 'system', tenantId, { 
      jobId: job.id, 
      taskName: name 
    });

    return job;
  }

  async close() {
    await this.queue.close();
  }
}

export const queueService = new QueueService();
