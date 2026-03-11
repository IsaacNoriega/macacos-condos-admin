import { Request, Response } from 'express';
import User from './model';
import bcrypt from 'bcrypt';
import logger from '../../utils/logger';

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find({ tenantId: req.tenantId }).select('-password');
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Error al obtener usuarios', error: err.message });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findOne({ _id: req.params.id, tenantId: req.tenantId }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Error al obtener usuario', error: err.message });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { password, ...rest } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ ...rest, password: hashedPassword, tenantId: req.tenantId });
    await user.save();
    logger.log('users.create', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { userId: String(user._id), role: user.role });
    res.status(201).json({ success: true, user: { ...user.toObject(), password: undefined } });
  } catch (err: any) {
    logger.error('users.create.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', err);
    res.status(400).json({ success: false, message: 'Error al crear usuario', error: err.message });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const update = { ...req.body };
    if (update.password) {
      update.password = await bcrypt.hash(update.password, 10);
    }
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      update,
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    logger.log('users.update', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { targetUserId: req.params.id });
    res.json({ success: true, user });
  } catch (err: any) {
    logger.error('users.update.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', err);
    res.status(400).json({ success: false, message: 'Error al actualizar usuario', error: err.message });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const user = await User.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    logger.log('users.delete', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', { targetUserId: req.params.id });
    res.json({ success: true, message: 'Usuario eliminado' });
  } catch (err: any) {
    logger.error('users.delete.error', req.user?.id ? String(req.user.id) : 'system', req.tenantId || 'global', err);
    res.status(400).json({ success: false, message: 'Error al eliminar usuario', error: err.message });
  }
};
