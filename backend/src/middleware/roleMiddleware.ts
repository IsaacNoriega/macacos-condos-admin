import { Request, Response, NextFunction } from 'express';

const roleMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const userRole = req.user?.role;

      if (!userRole) {
        return res.status(401).json({
          success: false,
          message: 'User role not found',
        });
      }

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: `This action requires one of these roles: ${allowedRoles.join(', ')}`,
        });
      }

      next();
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: 'Error in role middleware',
        error: error.message,
      });
    }
  };
};

export default roleMiddleware;
