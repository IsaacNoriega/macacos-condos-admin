import { Job } from 'bullmq';
import { generatePaymentReceipt } from '../services/pdfService';
import { sendWelcomeEmail, sendResetPasswordEmail } from '../utils/notifications';
import Payment from '../modules/payments/model';
import logger from '../utils/logger';

/**
 * Procesador Central de Tareas.
 * Aquí se ejecuta la lógica real fuera del hilo principal de la API.
 */
export const taskProcessor = async (job: Job) => {
  const { name, data } = job;
  const { tenantId } = data;

  logger.log('worker.task.started', 'system', tenantId, { 
    jobId: job.id, 
    taskName: name 
  });

  try {
    switch (name) {
      case 'generate-receipt':
        console.log(`[Worker] Generando recibo para pago: ${data.payment._id}`);
        const receiptUrl = await generatePaymentReceipt(data);
        console.log(`[Worker] PDF generado y subido: ${receiptUrl}`);
        
        const updateResult = await Payment.updateOne({ _id: data.payment._id }, { receiptUrl });
        console.log(`[Worker] Base de datos actualizada: ${updateResult.modifiedCount} documentos modificados`);
        break;

      case 'send-email':
        // data: { type, email, name, ...params }
        if (data.type === 'welcome') {
          await sendWelcomeEmail(data.email, data.name, data.tenantIdentifier, data.token);
        } else if (data.type === 'reset-password') {
          await sendResetPasswordEmail(data.email, data.name, data.token, data.tenantIdentifier);
        }
        break;

      default:
        throw new Error(`Tarea no reconocida: ${name}`);
    }

    logger.log('worker.task.completed', 'system', tenantId, { 
      jobId: job.id, 
      taskName: name 
    });

  } catch (error: any) {
    logger.error('worker.task.error', 'system', tenantId, error);
    throw error; // Lanzar para que BullMQ gestione los reintentos
  }
};
