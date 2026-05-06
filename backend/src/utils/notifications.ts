
import { EmailClient } from '@azure/communication-email';
import { SmsClient } from '@azure/communication-sms';
import logger from './logger';

// 1. Configuración de Azure (Producción/Cloud)
const AZURE_CONNECTION_STRING = process.env.AZURE_COMMUNICATION_CONNECTION_STRING || '';
const AZURE_SENDER = process.env.AZURE_SENDER_EMAIL || 'donotreply@macacos.com';

const PROD_URL = 'https://delightful-bay-02eed360f.2.azurestaticapps.net';

const sendMailInternal = async (to: string, subject: string, html: string) => {
  if (!AZURE_CONNECTION_STRING) {
    logger.error('email.azure.config_missing', 'system', 'global', new Error('Azure Communication connection string is missing'));
    return false;
  }

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
    return false;
  }
};

/**
 * Genera el envoltorio HTML premium para los correos
 */
const getPremiumTemplate = (title: string, content: string, buttonText: string, buttonUrl: string) => `
  <div style="background-color: #fdfcf9; padding: 40px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
      <!-- Header -->
      <tr>
        <td style="padding: 40px 40px 20px 40px; text-align: center;">
          <img src="${PROD_URL}/logo.png" alt="Macacos" width="60" style="margin-bottom: 20px;">
          <h1 style="color: #0f172a; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.02em;">${title}</h1>
        </td>
      </tr>
      <!-- Body -->
      <tr>
        <td style="padding: 0 40px 40px 40px; color: #475569; font-size: 16px; line-height: 1.6; text-align: center;">
          ${content}
          <div style="margin-top: 35px;">
            <a href="${buttonUrl}" style="background-color: #0f172a; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; transition: background-color 0.3s;">
              ${buttonText}
            </a>
          </div>
        </td>
      </tr>
      <!-- Footer -->
      <tr>
        <td style="padding: 30px 40px; background-color: #f8fafc; color: #94a3b8; font-size: 12px; text-align: center; border-top: 1px solid #f1f5f9;">
          <p style="margin: 0 0 10px 0;">Este es un mensaje automático de la plataforma Macacos Condos.</p>
          <p style="margin: 0;">© 2026 Macacos · Hecho con cariño en CDMX</p>
        </td>
      </tr>
    </table>
  </div>
`;

export const buildResetEmail = (name: string, token: string, tenantIdentifier: string) => {
  const resetUrl = `${PROD_URL}/reset-password?token=${token}`; 
  const content = `
    <p>Hola, <strong>${name}</strong>.</p>
    <p>Has solicitado restablecer tu contraseña para el condominio <strong>${tenantIdentifier}</strong>.</p>
    <p>Para continuar, haz clic en el botón de abajo y define tu nueva clave de acceso.</p>
  `;
  return getPremiumTemplate('Recuperación de cuenta', content, 'Restablecer contraseña', resetUrl);
};

export const buildWelcomeEmail = (name: string, tenantIdentifier: string, token?: string, email?: string) => {
  const activationUrl = token 
    ? `${PROD_URL}/reset-password?token=${token}`
    : `${PROD_URL}/login`;
    
  const buttonText = token ? 'Activar mi cuenta' : 'Ir a la plataforma';
  const content = `
    <p>¡Bienvenido a bordo, <strong>${name}</strong>!</p>
    <p>Has sido registrado como residente en el condominio <strong>${tenantIdentifier}</strong>.</p>
    <p>Ya tienes acceso a la plataforma para gestionar tus pagos, reportes de mantenimiento y reservaciones de amenidades.</p>
    <p style="margin-top: 20px; font-size: 14px; color: #64748b;">
      ${email ? `Tu usuario es: <strong>${email}</strong><br>` : ''}
      Identificador de condominio: <strong>${tenantIdentifier}</strong>
    </p>
  `;
  return getPremiumTemplate('Bienvenido a Macacos', content, buttonText, activationUrl);
};

export const buildReceiptEmail = (name: string, amount: number, tenantName: string, receiptUrl: string) => {
  const content = `
    <p>Hola, <strong>${name}</strong>.</p>
    <p>Tu pago por un monto de <strong>$${amount.toLocaleString()} MXN</strong> en <strong>${tenantName}</strong> ha sido procesado exitosamente.</p>
    <p>Ya puedes descargar tu recibo oficial haciendo clic en el botón de abajo.</p>
  `;
  return getPremiumTemplate('Tu recibo de pago está listo', content, 'Descargar Recibo', receiptUrl);
};

export const buildNewChargeEmail = (name: string, amount: number, concept: string, dueDate: string) => {
  const portalUrl = `${PROD_URL}/payments`;
  const content = `
    <p>Hola, <strong>${name}</strong>.</p>
    <p>Se ha generado un nuevo cargo en tu cuenta por concepto de: <strong>${concept}</strong>.</p>
    <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: left;">
      <p style="margin: 0 0 10px 0;"><strong>Monto:</strong> $${amount.toLocaleString()} MXN</p>
      <p style="margin: 0;"><strong>Fecha límite:</strong> ${dueDate}</p>
    </div>
    <p>Puedes realizar tu pago a través de la plataforma haciendo clic en el botón de abajo.</p>
  `;
  return getPremiumTemplate('Nuevo cargo generado', content, 'Ir a pagar', portalUrl);
};

export const sendResetPasswordEmail = async (
  email: string,
  name: string,
  token: string,
  tenantIdentifier: string
) => {
  const html = buildResetEmail(name, token, tenantIdentifier);
  return sendMailInternal(email, 'Recuperación de contraseña', html);
};

export const sendWelcomeEmail = async (
  email: string,
  name: string,
  tenantIdentifier: string,
  token?: string
) => {
  const html = buildWelcomeEmail(name, tenantIdentifier, token, email);
  return sendMailInternal(email, 'Bienvenido a Macacos Condos', html);
};

export const sendReceiptEmail = async (
  email: string,
  name: string,
  amount: number,
  tenantName: string,
  receiptUrl: string
) => {
  const html = buildReceiptEmail(name, amount, tenantName, receiptUrl);
  return sendMailInternal(email, 'Tu recibo de pago - Macacos Condos', html);
};

export const sendNewChargeEmail = async (
  email: string,
  name: string,
  amount: number,
  concept: string,
  dueDate: string
) => {
  const html = buildNewChargeEmail(name, amount, concept, dueDate);
  return sendMailInternal(email, 'Nuevo cargo generado - Macacos Condos', html);
};

export const sendSMS = async (phone: string, message: string) => {
  if (AZURE_CONNECTION_STRING) {
    try {
      const smsClient = new SmsClient(AZURE_CONNECTION_STRING);
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
  return true;
};
