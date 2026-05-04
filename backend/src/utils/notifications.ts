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
  connectionTimeout: 5000, // 5 segundos
  greetingTimeout: 5000,
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
    if (process.env.SMTP_HOST === 'smtp.ethereal.email') {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    logger.error('email.error', 'system', 'global', error as Error);
    return false;
  }
};

export const sendWelcomeEmail = async (
  email: string,
  name: string,
  tenantIdentifier: string
) => {
  const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/login`;

  const mailOptions = {
    from: `"Macacos Condos" <${process.env.SMTP_USER || 'noreply@macacos.com'}>`,
    to: email,
    subject: 'Bienvenido a Macacos Condos',
    html: `
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
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.log('email.welcome.sent', 'system', 'global', { messageId: info.messageId, email });
    return true;
  } catch (error) {
    logger.error('email.welcome.error', 'system', 'global', error as Error);
    return false;
  }
};

export const sendSMS = async (phone: string, message: string) => {
  // Placeholder para servicio de SMS (ej: Twilio)
  logger.log('sms.sending_placeholder', 'system', 'global', { phone, message });
  console.log(`[SMS a ${phone}]: ${message}`);
  return true;
};
