import { redisConnection } from '../config/redis';
import logger from '../utils/logger';

/**
 * CacheService: Implementa la estrategia Cache-Aside para optimización de consultas.
 * Diseñado para entornos Multi-tenant y Azure Redis Cluster.
 */
class CacheService {
  private readonly defaultTTL = 1800; // 30 minutos en segundos

  /**
   * Obtiene datos de caché o ejecuta una función para obtenerlos y guardarlos.
   * @param key Clave única de caché (ej: tenant:{id}:dashboard:stats)
   * @param fetchFn Función que se ejecuta en caso de Cache Miss (consulta a DB)
   * @param ttl Tiempo de vida en segundos
   */
  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttl: number = this.defaultTTL): Promise<T> {
    try {
      const cachedData = await redisConnection.get(key);
      
      if (cachedData) {
        console.log(`[Cache] HIT: ${key}`);
        return JSON.parse(cachedData) as T;
      }

      console.log(`[Cache] MISS: ${key}. Consultando base de datos...`);
    } catch (error) {
      logger.error('cache.get.error', 'system', 'global', error as Error);
    }

    const data = await fetchFn();

    try {
      if (data !== null && data !== undefined) {
        await redisConnection.set(key, JSON.stringify(data), 'EX', ttl);
      }
    } catch (error) {
      logger.error('cache.set.error', 'system', 'global', error as Error);
    }

    return data;
  }

  /**
   * Invalida una clave o un patrón de claves.
   */
  async invalidate(key: string): Promise<void> {
    try {
      await redisConnection.del(key);
      console.log(`[Cache] INVALIDATED: ${key}`);
    } catch (error) {
      logger.error('cache.del.error', 'system', 'global', error as Error);
    }
  }

  /**
   * Invalida las estadísticas del dashboard para un tenant específico.
   */
  async invalidateDashboardStats(tenantId: string): Promise<void> {
    const key = this.generateKey(tenantId, 'dashboard', 'stats');
    await this.invalidate(key);
  }

  /**
   * Genera una clave estructurada para multi-tenancy.
   */
  generateKey(tenantId: string, module: string, identifier: string): string {
    return `tenant:{${tenantId}}:${module}:${identifier}`;
  }
}

export const cacheService = new CacheService();
