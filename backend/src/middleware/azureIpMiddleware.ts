import { Request, Response, NextFunction } from 'express';

const ALLOWED_AZURE_IP = '172.214.17.219';

/**
 * AzureIpMiddleware: Implementa una arquitectura 'Zero Trust'.
 * Solo permite peticiones que provengan del Azure Application Gateway.
 */
export const azureIpMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Bonus: Bypass automático en desarrollo
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  // Railway actúa como proxy, la IP del Gateway debería estar en x-forwarded-for.
  // Sin embargo, Railway también puede pasar su propia IP de red interna.
  // Verificamos el header estándar.
  const forwardedFor = req.headers['x-forwarded-for'] as string;
  
  // Obtenemos la IP más cercana (que debería ser el Gateway si está configurado para apuntar directo a Railway)
  const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : req.socket.remoteAddress;

  if (clientIp !== ALLOWED_AZURE_IP) {
    console.warn(`[Security Alert] Access blocked from unauthorized IP: ${clientIp}`);
    
    return res.status(403).json({
      success: false,
      message: 'Access Denied: This server only accepts requests through the authorized Azure Gateway.',
      error: 'Unauthorized_Origin',
      timestamp: new Date().toISOString()
    });
  }

  next();
};
