import { Request, Response, NextFunction } from 'express';

const ALLOWED_AZURE_IP = '172.214.17.219';

/**
 * AzureIpMiddleware: Implementa una arquitectura 'Zero Trust'.
 * Solo permite peticiones que provengan del Azure Application Gateway.
 */
export const azureIpMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const forwardedFor = req.headers['x-forwarded-for'] as string;
  const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : req.socket.remoteAddress;

  // Log de auditoría para verificar ejecución en tiempo real
  console.log(`[Security] 🛡️ Guard Ejecutándose | IP: ${clientIp} | Env: ${process.env.NODE_ENV}`);

  // Bonus: Bypass automático en desarrollo y pruebas para evitar bloqueos locales
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return next();
  }

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
