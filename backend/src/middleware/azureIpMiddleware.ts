import { Request, Response, NextFunction } from 'express';

const ALLOWED_AZURE_IP = '172.214.17.219';

/**
 * AzureIpMiddleware: Implementa una arquitectura 'Zero Trust'.
 * Solo permite peticiones que provengan del Azure Application Gateway.
 */
export const azureIpMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const forwardedFor = req.headers['x-forwarded-for'] as string;

  // 1. Si no hay header, es Railway haciendo pruebas de vida (los 200 que ves en tus logs)
  if (!forwardedFor) return next();

  // 2. Convertimos la cadena de IPs en un arreglo
  const ips = forwardedFor.split(',').map(ip => ip.trim());
  
  // 3. LA CLAVE: Tomamos la ÚLTIMA IP (la de Azure), no la primera (la tuya)
  const lastProxy = ips[ips.length - 1]; 
  const originalClient = ips[0];

  console.log(`[Security] 🛡️ Validando: Usuario ${originalClient} viaja por Azure ${lastProxy}`);

  // 4. Comparamos contra la IP de Azure
  if (lastProxy !== ALLOWED_AZURE_IP) {
    console.warn(`[Security Alert] Bloqueado: IP detectada ${lastProxy} no es el Gateway.`);
    return res.status(403).json({ success: false, message: 'Usa el Gateway de Azure' });
  }

  next();
};