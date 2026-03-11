import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Error de validacion',
      errors: errors.array().map((error) => ({ field: error.type === 'field' ? error.path : 'request', message: error.msg })),
    });
  }

  next();
};

export default validateRequest;
