import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import logger from '../../utils/logger';
import { AppError, toError } from '../../utils/httpError';
import { createUserInTenant, findUserByEmailInTenant, findUsersByEmail, updateUserPasswordByResetToken } from '../users/service';
import { findTenantByIdentifier, findTenantById } from '../tenants/service';
import { sendResetPasswordEmail } from '../../utils/notifications';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role, tenantId } = req.body;
    if (!name || !email || !password || !role || !tenantId) {
      throw new AppError('Faltan campos obligatorios', 400);
    }
    const exists = await findUserByEmailInTenant(email, tenantId);
    if (exists) {
      throw new AppError('El email ya está registrado en este tenant', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUserInTenant({ name, email, password: hashedPassword, role }, tenantId);
    logger.log('auth.register', String(user._id), String(user.tenantId), { email: user.email, role: user.role });
    res.status(201).json({ success: true, user: { ...user.toObject(), password: undefined } });
  } catch (err: unknown) {
    logger.error('auth.register.error', 'anonymous', req.body?.tenantId || 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error en registro', 400, { cause: toError(err).message }));
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, tenantIdentifier } = req.body;

    if (!tenantIdentifier) {
      throw new AppError('Se requiere el identificador del condominio', 400);
    }

    const tenant = await findTenantByIdentifier(tenantIdentifier);
    if (!tenant) {
      throw new AppError('Condominio no encontrado', 404);
    }

    const user = await findUserByEmailInTenant(email, String(tenant._id));
    if (!user) {
      throw new AppError('Usuario no encontrado en este condominio', 401);
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new AppError('Credenciales inválidas', 401);
    }

    const token = jwt.sign(
      { id: user._id, tenantId: user.tenantId, role: user.role, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '12h' }
    );
    logger.log('auth.login', String(user._id), String(user.tenantId), { email: user.email, role: user.role });
    res.json({ success: true, token, user: { ...user.toObject(), password: undefined } });
  } catch (err: unknown) {
    logger.error('auth.login.error', 'anonymous', 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error en login', 400, { cause: toError(err).message }));
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, tenantId, tenantIdentifier } = req.body;
    
    let targetTenantId = tenantId;
    let identifier = '';

    if (tenantIdentifier) {
      const tenant = await findTenantByIdentifier(tenantIdentifier);
      if (!tenant) {
        throw new AppError('Condominio no encontrado', 404);
      }
      targetTenantId = String(tenant._id);
      identifier = tenant.identifier;
    } else if (tenantId) {
      const tenant = await findTenantById(tenantId);
      identifier = tenant?.identifier || 'condominio';
    }

    if (!targetTenantId) {
      throw new AppError('Se requiere el identificador del condominio', 400);
    }

    const user = await findUserByEmailInTenant(email, targetTenantId);
    if (!user) {
      throw new AppError('Usuario no encontrado en este condominio', 404);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    user.resetPasswordToken = tokenHash;
    user.resetPasswordExpires = expiresAt;
    await user.save();

    sendResetPasswordEmail(user.email, user.name, rawToken, identifier)
      .catch(err => logger.error('email.forgot.deferred.error', String(user._id), String(user.tenantId), err));

    logger.log('auth.forgotPassword', String(user._id), String(user.tenantId), { email: user.email });

    res.json({
      success: true,
      message: 'Se ha enviado un correo con las instrucciones para restablecer tu contraseña',
      ...(process.env.NODE_ENV !== 'production' ? { resetToken: rawToken, expiresAt: expiresAt.toISOString() } : {}),
    });
  } catch (err: unknown) {
    logger.error('auth.forgotPassword.error', 'anonymous', 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error en recuperación', 400, { cause: toError(err).message }));
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = req.body;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await updateUserPasswordByResetToken(tokenHash, hashedPassword);
    if (!user) {
      throw new AppError('Token inválido o expirado', 400);
    }

    logger.log('auth.resetPassword', String(user._id), String(user.tenantId), { email: user.email });
    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (err: unknown) {
    logger.error('auth.resetPassword.error', 'anonymous', 'global', toError(err));
    next(err instanceof AppError ? err : new AppError('Error al restablecer contraseña', 400, { cause: toError(err).message }));
  }
};
