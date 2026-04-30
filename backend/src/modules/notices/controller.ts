import { Request, Response, NextFunction } from 'express';
import NoticeService from './service';
import { AppError } from '../../utils/httpError';

export const getNotices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let tenantId = req.tenantId;
    if (req.user?.role === 'superadmin' && req.query.tenantId) {
      tenantId = req.query.tenantId as string;
    }

    if (!tenantId && req.user?.role !== 'superadmin') {
      throw new AppError('Tenant ID missing', 400);
    }

    const notices = await NoticeService.getAllByTenant(tenantId);
    res.status(200).json({ success: true, notices });
  } catch (error) {
    next(error);
  }
};

export const createNotice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let tenantId = req.tenantId;
    if (req.user?.role === 'superadmin' && req.body.tenantId) {
      tenantId = req.body.tenantId;
    }

    if (!tenantId) throw new AppError('Tenant ID missing', 400);

    const { title, content, category } = req.body;
    
    const notice = await NoticeService.create({
      tenantId: tenantId as any,
      authorId: req.user?.id as any,
      authorName: req.user?.name || 'Administración',
      title,
      content,
      category,
    });

    res.status(201).json({ success: true, notice });
  } catch (error) {
    next(error);
  }
};

export const updateNotice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, content, category } = req.body;

    const notice = await NoticeService.update(id as string, { title, content, category });
    if (!notice) throw new AppError('Notice not found', 404);

    res.status(200).json({ success: true, notice });
  } catch (error) {
    next(error);
  }
};

export const deleteNotice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const success = await NoticeService.delete(id as string);
    if (!success) throw new AppError('Notice not found', 404);

    res.status(200).json({ success: true, message: 'Notice deleted' });
  } catch (error) {
    next(error);
  }
};
