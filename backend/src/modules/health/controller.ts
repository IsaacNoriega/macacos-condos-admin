import { Request, Response } from 'express';
import mongoose from 'mongoose';

/**
 * Controlador de Salud del Sistema (Health Check)
 * 
 * Este endpoint es crítico para el cumplimiento del requisito RNF-DISP-001 (Alta Disponibilidad).
 * Permite que componentes de infraestructura, como el Azure Application Gateway o el orquestador de Railway,
 * realicen 'Health Probes' constantes. 
 * 
 * Un fallo en este endpoint provocará que el balanceador de carga retire esta instancia del grupo 
 * de rotación, garantizando que el tráfico solo llegue a nodos sanos y permitiendo alcanzar 
 * el objetivo de disponibilidad del 99%.
 */
export const checkHealth = async (req: Request, res: Response) => {
  try {
    /**
     * Estados de Mongoose:
     * 0: desconectado
     * 1: conectado
     * 2: conectando
     * 3: desconectando
     */
    const dbStatus = mongoose.connection.readyState;
    const isDbConnected = dbStatus === 1;

    const healthData = {
      status: isDbConnected ? 'OK' : 'unhealthy',
      dbStatus: getDbStatusString(dbStatus),
      uptime: process.uptime(), // Tiempo en segundos desde el inicio del proceso
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    };

    if (!isDbConnected) {
      // Retornamos 503 si la base de datos no está lista, lo que indica 
      // que el servicio no puede procesar peticiones de negocio correctamente.
      return res.status(503).json(healthData);
    }

    // Retorno exitoso para indicar que el nodo está operativo
    return res.status(200).json(healthData);
  } catch (err: any) {
    return res.status(500).json({
      status: 'error',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Mapea el código numérico de readyState de Mongoose a un string legible.
 */
function getDbStatusString(state: number): string {
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized'
  };
  return states[state] || 'unknown';
}
