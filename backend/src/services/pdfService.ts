import puppeteer from 'puppeteer';
import { createHash } from 'crypto';
import { uploadReceiptToAzure } from '../config/azureBlob';
import { toError } from '../utils/httpError';
import logger from '../utils/logger';

export interface ReceiptData {
  payment: any;
  charge: any;
  tenant: any;
}

/**
 * Servicio para la generación de recibos PDF utilizando Puppeteer (HTML-to-PDF).
 * Proporciona un diseño premium, minimalista y alta estabilidad en producción.
 */
export const generatePaymentReceipt = async (data: ReceiptData): Promise<string> => {
  const { payment, charge, tenant } = data;
  const paymentIdStr = String(payment._id);
  const tenantIdStr = String(tenant._id || tenant.id);
  
  // Sello digital de autenticidad (SHA-256)
  const digitalSeal = createHash('sha256')
    .update(`${paymentIdStr}-${payment.amount}-${payment.createdAt}`)
    .digest('hex')
    .toUpperCase()
    .substring(0, 32);

  const amountFormatted = new Number(payment.amount).toLocaleString('es-MX', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  });

  const dateFormatted = new Date(payment.paymentDate || payment.createdAt).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  // Plantilla HTML con diseño inspirado en Apple / Minimalista
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
            
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                margin: 0;
                padding: 40px;
                color: #1d1d1f;
                line-height: 1.5;
            }
            .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 60px;
            }
            .tenant-info h1 {
                margin: 0;
                font-size: 24px;
                font-weight: 700;
                letter-spacing: -0.5px;
            }
            .tenant-info p {
                margin: 5px 0;
                color: #86868b;
                font-size: 14px;
            }
            .receipt-label {
                font-weight: 700;
                color: #86868b;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .folio-section {
                display: flex;
                justify-content: space-between;
                margin-bottom: 40px;
                padding-bottom: 20px;
                border-bottom: 1px solid #f5f5f7;
            }
            .item-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 60px;
            }
            .item-table th {
                text-align: left;
                font-size: 12px;
                color: #86868b;
                padding-bottom: 10px;
                border-bottom: 2px solid #1d1d1f;
            }
            .item-table td {
                padding: 20px 0;
                border-bottom: 1px solid #f5f5f7;
            }
            .amount {
                text-align: right;
                font-weight: 600;
            }
            .total-section {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                margin-bottom: 80px;
            }
            .total-row {
                display: flex;
                justify-content: space-between;
                width: 250px;
                margin-bottom: 10px;
            }
            .total-main {
                font-size: 32px;
                font-weight: 700;
                margin-top: 10px;
            }
            .footer {
                margin-top: 100px;
                font-size: 10px;
                color: #86868b;
            }
            .seal-box {
                background: #f5f5f7;
                padding: 15px;
                border-radius: 8px;
                font-family: monospace;
                word-break: break-all;
                margin-top: 10px;
            }
            .badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 20px;
                background: #e8f5e9;
                color: #2e7d32;
                font-size: 12px;
                font-weight: 600;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="tenant-info">
                <h1>${tenant.name.toUpperCase()}</h1>
                <p>${tenant.address || 'Condominio Residencial'}</p>
            </div>
            <div style="text-align: right">
                <div class="receipt-label">Recibo de Pago</div>
                <div class="badge">PAGO COMPLETADO</div>
            </div>
        </div>

        <div class="folio-section">
            <div>
                <div class="receipt-label">Folio de Operación</div>
                <div style="font-weight: 600; font-size: 18px; margin-top: 5px;">#${paymentIdStr.substring(18).toUpperCase()}</div>
            </div>
            <div style="text-align: right">
                <div class="receipt-label">Fecha de Pago</div>
                <div style="font-weight: 600; font-size: 18px; margin-top: 5px;">${dateFormatted}</div>
            </div>
        </div>

        <table class="item-table">
            <thead>
                <tr>
                    <th>CONCEPTO / DESCRIPCIÓN</th>
                    <th style="text-align: right">MONTO</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <div style="font-weight: 600">${charge.description || 'Cuota de Mantenimiento'}</div>
                        <div style="color: #86868b; font-size: 12px; margin-top: 4px;">Referencia: ${paymentIdStr}</div>
                    </td>
                    <td class="amount">$${amountFormatted} ${payment.currency || 'MXN'}</td>
                </tr>
            </tbody>
        </table>

        <div class="total-section">
            <div class="total-row">
                <span style="color: #86868b">Subtotal</span>
                <span>$${amountFormatted}</span>
            </div>
            <div class="total-row">
                <span style="color: #86868b">Impuestos / Otros</span>
                <span>$0.00</span>
            </div>
            <div class="total-row total-main">
                <span>Total</span>
                <span>$${amountFormatted}</span>
            </div>
        </div>

        <div class="footer">
            <div class="receipt-label">Sello Digital de Autenticidad</div>
            <div class="seal-box">${digitalSeal}</div>
            <p style="margin-top: 30px; text-align: center;">Este documento es un comprobante oficial de pago generado por Macacos Condos Admin.</p>
        </div>
    </body>
    </html>
  `;

  let browser;
  try {
    // Lanzar navegador en modo headless
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Generar PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px'
      }
    });

    await browser.close();

    // Subir a Azure
    const uploadResult = await uploadReceiptToAzure(pdfBuffer, tenantIdStr, paymentIdStr);
    
    logger.log('pdf.generated.successfully', 'system', tenantIdStr, { paymentId: paymentIdStr });
    
    return uploadResult.url;

  } catch (err) {
    if (browser) await browser.close();
    logger.error('pdf.generation.failed', 'system', tenantIdStr, toError(err));
    throw err;
  }
};