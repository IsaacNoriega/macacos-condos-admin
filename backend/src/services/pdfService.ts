import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { createHash } from 'crypto';
import { uploadReceiptToAzure } from '../config/azureBlob';
import { toError } from '../utils/httpError';
import logger from '../utils/logger';
import path from 'path';

/**
 * IMPORTACIÓN ROBUSTA: Maneja el envoltorio .default que a veces 
 * genera la compilación de TypeScript en entornos Node.js.
 */
const PdfMake = require('pdfmake');
const PdfPrinter = PdfMake.default || PdfMake;

/**
 * CONFIGURACIÓN DE FUENTES: Railway requiere rutas físicas absolutas.
 * Se utilizan las fuentes Roboto incluidas por defecto en la librería.
 */
const fonts = {
  Roboto: {
    normal: path.join(process.cwd(), 'node_modules/pdfmake/fonts/Roboto-Regular.ttf'),
    bold: path.join(process.cwd(), 'node_modules/pdfmake/fonts/Roboto-Medium.ttf'),
    italics: path.join(process.cwd(), 'node_modules/pdfmake/fonts/Roboto-Italic.ttf'),
    bolditalics: path.join(process.cwd(), 'node_modules/pdfmake/fonts/Roboto-MediumItalic.ttf')
  }
};

let printer: any;

try {
  // Verificamos que sea un constructor antes de inicializar
  if (typeof PdfPrinter === 'function') {
    printer = new PdfPrinter(fonts);
  } else {
    throw new Error('El módulo importado de pdfmake no es un constructor válido.');
  }
} catch (error) {
  console.error('❌ Error crítico al inicializar PdfPrinter:', error);
}

export interface ReceiptData {
  payment: any;
  charge: any;
  tenant: any;
}

/**
 * Servicio para la generación de recibos PDF con diseño minimalista.
 */
export const generatePaymentReceipt = async (data: ReceiptData): Promise<string> => {
  if (!printer) {
    throw new Error('El servicio de PDF no está inicializado (PdfPrinter es undefined).');
  }

  const { payment, charge, tenant } = data;
  const paymentIdStr = String(payment._id);
  const tenantIdStr = String(tenant._id || tenant.id);
  
  // Sello digital de autenticidad (SHA-256)
  const digitalSeal = createHash('sha256')
    .update(`${paymentIdStr}-${payment.amount}-${payment.createdAt}`)
    .digest('hex')
    .toUpperCase()
    .substring(0, 32);

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [60, 60, 60, 60],
    content: [
      {
        columns: [
          { text: String(tenant.name).toUpperCase(), style: 'tenantName', width: '*' },
          { text: 'RECIBO DE PAGO', style: 'headerTitle', alignment: 'right', width: 'auto' }
        ]
      },
      { text: String(tenant.address || 'Domicilio del Condominio'), style: 'tenantAddress', margin: [0, 4, 0, 40] },
      {
        columns: [
          {
            stack: [
              { text: 'FOLIO DE OPERACIÓN', style: 'label' },
              { text: `#${paymentIdStr.substring(18).toUpperCase()}`, style: 'value' },
            ]
          },
          {
            stack: [
              { text: 'FECHA DE EMISIÓN', style: 'label' },
              { text: new Date(payment.paymentDate || payment.createdAt).toLocaleDateString('es-MX'), style: 'value' },
            ],
            alignment: 'right'
          }
        ]
      },
      { canvas: [{ type: 'line', x1: 0, y1: 20, x2: 475, y2: 20, lineWidth: 0.5, lineColor: '#E5E5E7' }] },
      {
        margin: [0, 40, 0, 0],
        table: {
          widths: ['*', 'auto'],
          body: [
            [
              { text: 'CONCEPTO', style: 'tableHeader' },
              { text: 'MONTO', style: 'tableHeader', alignment: 'right' }
            ],
            [
              { text: String(charge.description || 'Cuota de Mantenimiento'), style: 'tableCell', margin: [0, 10] },
              { text: `$${Number(payment.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })} ${String(payment.currency || 'MXN').toUpperCase()}`, style: 'tableCell', alignment: 'right', margin: [0, 10] }
            ]
          ]
        },
        layout: 'noBorders'
      },
      { canvas: [{ type: 'line', x1: 0, y1: 10, x2: 475, y2: 10, lineWidth: 1, lineColor: '#000000' }] },
      {
        margin: [0, 20, 0, 0],
        columns: [
          { text: '', width: '*' },
          {
            width: 'auto',
            stack: [
              {
                columns: [
                  { text: 'TOTAL PAGADO', style: 'totalLabel', width: 100 },
                  { text: `$${Number(payment.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, style: 'totalValue', alignment: 'right', width: 100 }
                ]
              }
            ]
          }
        ]
      },
      {
        margin: [0, 80, 0, 0],
        stack: [
          { text: 'SELLO DIGITAL DE AUTENTICIDAD', style: 'label' },
          { text: digitalSeal, style: 'digitalSeal' }
        ]
      },
      {
        text: 'Este documento es un comprobante oficial de pago emitido por el sistema Macacos Condos Administration.',
        style: 'footer',
        margin: [0, 40, 0, 0],
        alignment: 'center'
      }
    ],
    styles: {
      tenantName: { fontSize: 14, bold: true, color: '#1D1D1F' },
      headerTitle: { fontSize: 10, bold: true, color: '#86868B' },
      tenantAddress: { fontSize: 9, color: '#86868B' },
      label: { fontSize: 8, bold: true, color: '#86868B', margin: [0, 0, 0, 4] },
      value: { fontSize: 11, bold: true, color: '#1D1D1F' },
      tableHeader: { fontSize: 8, bold: true, color: '#86868B' },
      tableCell: { fontSize: 10, color: '#1D1D1F' },
      totalLabel: { fontSize: 10, bold: true, color: '#1D1D1F' },
      totalValue: { fontSize: 18, bold: true, color: '#1D1D1F' },
      digitalSeal: { fontSize: 7, color: '#86868B', margin: [0, 4, 0, 0] },
      footer: { fontSize: 8, color: '#86868B' }
    },
    defaultStyle: { font: 'Roboto' }
  };

  return new Promise((resolve, reject) => {
    try {
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks: Buffer[] = [];
      
      pdfDoc.on('data', (chunk: any) => chunks.push(chunk));
      pdfDoc.on('end', async () => {
        try {
          const result = Buffer.concat(chunks);
          const uploadResult = await uploadReceiptToAzure(result, tenantIdStr, paymentIdStr);
          resolve(uploadResult.url);
        } catch (uploadError: unknown) {
          logger.error('pdfService.upload.error', tenantIdStr, 'system', toError(uploadError));
          reject(uploadError);
        }
      });
      
      pdfDoc.on('error', (err: any) => reject(err));
      pdfDoc.end();
    } catch (err) {
      reject(err);
    }
  });
};