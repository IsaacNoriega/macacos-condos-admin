import { Request, Response } from 'express';
import Payment from './model';

export const getAllPayments = async (req: Request, res: Response) => {
  try {
    const payments = await Payment.find({ tenantId: req.tenantId });
    res.json({ success: true, payments });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Error al obtener pagos', error: err.message });
  }
};

export const createPayment = async (req: Request, res: Response) => {
  try {
    const payment = new Payment({ ...req.body, tenantId: req.tenantId });
    await payment.save();
    res.status(201).json({ success: true, payment });
  } catch (err: any) {
    res.status(400).json({ success: false, message: 'Error al registrar pago', error: err.message });
  }
};

export const updatePayment = async (req: Request, res: Response) => {
  try {
    const payment = await Payment.findOneAndUpdate({ _id: req.params.id, tenantId: req.tenantId }, req.body, { new: true });
    if (!payment) return res.status(404).json({ success: false, message: 'Pago no encontrado' });
    res.json({ success: true, payment });
  } catch (err: any) {
    res.status(400).json({ success: false, message: 'Error al actualizar pago', error: err.message });
  }
};

export const deletePayment = async (req: Request, res: Response) => {
  try {
    const payment = await Payment.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!payment) return res.status(404).json({ success: false, message: 'Pago no encontrado' });
    res.json({ success: true, message: 'Pago eliminado' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: 'Error al eliminar pago', error: err.message });
  }
};
