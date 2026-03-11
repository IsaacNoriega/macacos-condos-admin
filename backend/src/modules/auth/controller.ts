import { Request, Response } from 'express';
import User from '../users/model';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import logger from '../../utils/logger';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, tenantId } = req.body;
    if (!name || !email || !password || !role || !tenantId) {
      return res.status(400).json({ success: false, message: 'Faltan campos obligatorios' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'El email ya está registrado' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const userData: any = { name, email, password: hashedPassword, role };
    if (tenantId) userData.tenantId = tenantId;
    const user = new User(userData);
    await user.save();
    logger.log('auth.register', String(user._id), String(user.tenantId), { email: user.email, role: user.role });
    res.status(201).json({ success: true, user: { ...user.toObject(), password: undefined } });
  } catch (err: any) {
    logger.error('auth.register.error', 'anonymous', req.body?.tenantId || 'global', err);
    res.status(400).json({ success: false, message: 'Error en registro', error: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    const token = jwt.sign({ id: user._id, tenantId: user.tenantId, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: '12h' });
    logger.log('auth.login', String(user._id), String(user.tenantId), { email: user.email, role: user.role });
    res.json({ success: true, token, user: { ...user.toObject(), password: undefined } });
  } catch (err: any) {
    logger.error('auth.login.error', 'anonymous', 'global', err);
    res.status(400).json({ success: false, message: 'Error en login', error: err.message });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    // Aquí deberías generar un token y enviarlo por email
    logger.log('auth.forgotPassword', String(user._id), String(user.tenantId), { email: user.email });
    res.json({ success: true, message: 'Instrucciones enviadas al correo (simulado)' });
  } catch (err: any) {
    logger.error('auth.forgotPassword.error', 'anonymous', 'global', err);
    res.status(400).json({ success: false, message: 'Error en recuperación', error: err.message });
  }
};
