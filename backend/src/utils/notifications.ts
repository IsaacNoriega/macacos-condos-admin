import nodemailer from 'nodemailer';
import logger from './logger';

// Configuración de nodemailer (usar variables de entorno en producción)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

export const sendResetPasswordEmail = async (
  email: string,
  name: string,
  token: string,
  tenantIdentifier: string
) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/reset-password?token=${token}`;

  const mailOptions = {
    from: `"Macacos Condos" <${process.env.SMTP_USER || 'noreply@macacos.com'}>`,
    to: email,
    subject: 'Recuperación de contraseña',
    html: `
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
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.log('email.sent', 'system', 'global', { messageId: info.messageId, email });
    
    // Si estamos en desarrollo y usamos Ethereal, mostrar la URL de previsualización
    if (info.host === 'smtp.ethereal.email') {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    logger.error('email.error', 'system', 'global', error as Error);
    return false;
  }
};

export const sendSMS = async (phone: string, message: string) => {
  // Placeholder para servicio de SMS (ej: Twilio)
  logger.log('sms.sending_placeholder', 'system', 'global', { phone, message });
  console.log(`[SMS a ${phone}]: ${message}`);
  return true;
};
