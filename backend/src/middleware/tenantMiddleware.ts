import { Request, Response, NextFunction } from 'express';

// Extiende la interfaz Request para incluir tenantId
declare module 'express-serve-static-core' {
  interface Request {
    tenantId?: string;
    user?: any;
  }
}

const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract tenantId from JWT token (from authMiddleware)
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      if (req.method === 'POST' && req.path === '/proofs') {
        req.tenantId = req.user?.tenantId || 'global';
        return next();
      }

      // Superadmins may be global (no tenantId claim); controllers resolve
      // the target tenant from the request body/query when needed.
      if (req.user?.role === 'superadmin') {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'No tenantId found in token',
      });
    }

    // Attach tenantId to request for use in queries
    req.tenantId = tenantId;

    next();
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Error in tenant middleware',
      error: error.message,
    });
  }
};

export default tenantMiddleware;
