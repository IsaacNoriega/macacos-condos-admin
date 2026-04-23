import { NextFunction, Request, Response } from 'express';
import { AppError, toError } from '../../utils/httpError';
import * as noticeService from './service';

export const createNotice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, title, message } = req.body;
    if (!tenantId || !title || !message) {
      throw new AppError('Faltan datos obligatorios', 400);
    }
    const notice = await noticeService.createNotice({ title, message }, tenantId);
    res.status(201).json({ success: true, notice });
  } catch (err: unknown) {
    next(new AppError('Error al crear aviso', 400, { cause: toError(err).message }));
  }
};

export const getNoticesByTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let tenantId = req.params.tenantId || req.tenantId;
    if (!tenantId) {
      throw new AppError('Tenant no especificado', 400);
    }
    // Asegura que tenantId sea string
    if (Array.isArray(tenantId)) {
      tenantId = tenantId[0];
    }
    const notices = await noticeService.getNoticesByTenant(tenantId);
    res.json({ success: true, notices });
  } catch (err: unknown) {
    next(new AppError('Error al obtener avisos', 400, { cause: toError(err).message }));
  }
};
