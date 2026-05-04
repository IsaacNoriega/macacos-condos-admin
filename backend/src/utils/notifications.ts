import nodemailer from 'nodemailer';
import { EmailClient } from '@azure/communication-email';
import { SmsClient } from '@azure/communication-sms';
import logger from './logger';

// 1. Configuración de Azure (Producción/Cloud)
const AZURE_CONNECTION_STRING = process.env.AZURE_COMMUNICATION_CONNECTION_STRING || '';
const AZURE_SENDER = process.env.AZURE_SENDER_EMAIL || 'donotreply@macacos.com';

// 2. Configuración de Nodemailer (Fallback para desarrollo local)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  connectionTimeout: 5000,
  greetingTimeout: 5000,
});

/**
 * Envía un correo usando Azure Communication Services o Nodemailer como fallback.
 */
const sendMailInternal = async (to: string, subject: string, html: string) => {
  // Si tenemos Azure configurado, lo usamos
  if (AZURE_CONNECTION_STRING) {
    try {
      const emailClient = new EmailClient(AZURE_CONNECTION_STRING);
      const message = {
        senderAddress: AZURE_SENDER,
        content: { subject, html },
        recipients: { to: [{ address: to }] },
      };

      const poller = await emailClient.beginSend(message);
      const result = await poller.pollUntilDone();
      logger.log('email.azure.sent', 'system', 'global', { messageId: result.id, to });
      return true;
    } catch (error) {
      logger.error('email.azure.error', 'system', 'global', error as Error);
      // No retornamos false aquí, intentamos el fallback si es posible
    }
  }

  // Fallback a Nodemailer
  try {
    const info = await transporter.sendMail({
      from: `"Macacos Condos" <${process.env.SMTP_USER || 'noreply@macacos.com'}>`,
      to,
      subject,
      html,
    });
    logger.log('email.nodemailer.sent', 'system', 'global', { messageId: info.messageId, to });
    
    if (process.env.SMTP_HOST === 'smtp.ethereal.email') {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    return true;
  } catch (error) {
    logger.error('email.nodemailer.error', 'system', 'global', error as Error);
    return false;
  }
};

export const sendResetPasswordEmail = async (
  email: string,
  name: string,
  token: string,
  tenantIdentifier: string
) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/reset-password?token=${token}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #333;">Hola, ${name}</h2>
      <p>Has solicitado restablecer tu contraseña para el condominio <strong>${tenantIdentifier}</strong>.</p>
      <p>Haz clic en el siguiente botón para elegir una nueva contraseña:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Restablecer Contraseña</a>
      </div>
      <p>O copia y pega este enlace en tu navegador:</p>
      <p style="color: #666; font-size: 12px;">${resetUrl}</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 12px; color: #999;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
      <p style="font-size: 12px; color: #999;">Tu identificador de condominio es: <strong>${tenantIdentifier}</strong></p>
    </div>
  `;

  return sendMailInternal(email, 'Recuperación de contraseña', html);
};

export const sendWelcomeEmail = async (
  email: string,
  name: string,
  tenantIdentifier: string
) => {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/login`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #333;">¡Bienvenido, ${name}!</h2>
      <p>Has sido registrado como residente en el condominio <strong>${tenantIdentifier}</strong>.</p>
      <p>Ya puedes acceder a la plataforma para gestionar tus pagos, reportes de mantenimiento y reservaciones.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Acceder a la plataforma</a>
      </div>
      <p>Para ingresar, necesitarás:</p>
      <ul>
        <li><strong>Identificador de condominio:</strong> ${tenantIdentifier}</li>
        <li><strong>Tu correo electrónico:</strong> ${email}</li>
      </ul>
      <p>Si olvidaste tu contraseña, puedes usar la opción "¿Olvidó su contraseña?" en la pantalla de inicio de sesión.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 12px; color: #999;">Este es un correo automático, por favor no respondas a este mensaje.</p>
    </div>
  `;

  return sendMailInternal(email, 'Bienvenido a Macacos Condos', html);
};

export const sendSMS = async (phone: string, message: string) => {
  if (AZURE_CONNECTION_STRING) {
    try {
      const smsClient = new SmsClient(AZURE_CONNECTION_STRING);
      // Azure requiere que el número de remitente esté registrado
      const SENDER_PHONE = process.env.AZURE_SENDER_PHONE || '+1234567890';
      
      const sendResults = await smsClient.send({
        from: SENDER_PHONE,
        to: [phone],
        message: message
      });

      for (const res of sendResults) {
        if (res.successful) {
          logger.log('sms.azure.sent', 'system', 'global', { messageId: res.messageId, to: phone });
        } else {
          logger.error('sms.azure.error', 'system', 'global', new Error(res.errorMessage));
        }
      }
      return true;
    } catch (error) {
      logger.error('sms.azure.client.error', 'system', 'global', error as Error);
    }
  }

  // Placeholder si no hay Azure
  logger.log('sms.placeholder', 'system', 'global', { phone, message });
  console.log(`[SMS Placeholder a ${phone}]: ${message}`);
  return true;
};
