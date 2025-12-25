const { Resend } = require('resend');

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const fromName = process.env.RESEND_FROM_NAME || 'Invoice App';

/**
 * Send an email using Resend
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body (optional)
 * @param {Array} options.attachments - Attachments array (optional)
 * @returns {Promise<Object>} - Resend API response
 */
async function sendEmail({ to, subject, text, html, attachments = [] }) {
  try {
    const emailData = {
      from: `${fromName} <${fromEmail}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      text,
    };

    if (html) {
      emailData.html = html;
    }

    if (attachments.length > 0) {
      emailData.attachments = attachments;
    }

    const response = await resend.emails.send(emailData);
    
    console.log('Email sent successfully:', response);
    return response;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Send invoice email with PDF attachment
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.message - Custom message
 * @param {Object} options.factura - Invoice data
 * @param {Object} options.empresa - Company data
 * @param {Buffer} options.pdfBuffer - PDF file buffer (optional)
 * @returns {Promise<Object>} - Resend API response
 */
async function sendInvoiceEmail({ to, subject, message, factura, empresa, pdfBuffer }) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .header h1 { margin: 0; color: #1a1a1a; font-size: 24px; }
        .invoice-info { background-color: #fff; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .invoice-number { font-size: 20px; font-weight: bold; color: #2563eb; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
        .info-label { color: #666; }
        .info-value { font-weight: 500; }
        .total { font-size: 24px; font-weight: bold; color: #1a1a1a; }
        .message { white-space: pre-wrap; margin-bottom: 20px; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${empresa?.nombre || 'Invoice App'}</h1>
          ${empresa?.ruc ? `<p style="margin: 5px 0 0 0; color: #666;">RUC: ${empresa.ruc}</p>` : ''}
        </div>
        
        <div class="message">${message.replace(/\n/g, '<br>')}</div>
        
        <div class="invoice-info">
          <div class="invoice-number">Factura ${factura.serie}-${String(factura.numero).padStart(6, '0')}</div>
          <div style="margin-top: 15px;">
            <div class="info-row">
              <span class="info-label">Cliente:</span>
              <span class="info-value">${factura.cliente?.nombre || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Documento:</span>
              <span class="info-value">${factura.cliente?.tipoDocumento || ''} ${factura.cliente?.documento || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Fecha de Emisión:</span>
              <span class="info-value">${new Date(factura.fechaEmision).toLocaleDateString('es-PE')}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Fecha de Vencimiento:</span>
              <span class="info-value">${factura.fechaVencimiento ? new Date(factura.fechaVencimiento).toLocaleDateString('es-PE') : 'N/A'}</span>
            </div>
            <div class="info-row" style="border-bottom: none; margin-top: 10px;">
              <span class="info-label">Total:</span>
              <span class="total">S/ ${parseFloat(factura.total).toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>Este correo ha sido enviado automáticamente desde Invoice App.</p>
          ${empresa?.email ? `<p>Para cualquier consulta: ${empresa.email}</p>` : ''}
        </div>
      </div>
    </body>
    </html>
  `;

  const attachments = [];
  
  if (pdfBuffer) {
    attachments.push({
      filename: `Factura-${factura.serie}-${factura.numero}.pdf`,
      content: pdfBuffer,
    });
  }

  return sendEmail({
    to,
    subject,
    text: message,
    html: htmlContent,
    attachments,
  });
}

/**
 * Send proforma email with PDF attachment
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.message - Custom message
 * @param {Object} options.proforma - Proforma data
 * @param {Object} options.empresa - Company data
 * @param {Buffer} options.pdfBuffer - PDF file buffer (optional)
 * @returns {Promise<Object>} - Resend API response
 */
async function sendProformaEmail({ to, subject, message, proforma, empresa, pdfBuffer }) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #e0f2fe; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #0284c7; }
        .header h1 { margin: 0; color: #0369a1; font-size: 24px; }
        .proforma-info { background-color: #fff; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .proforma-number { font-size: 20px; font-weight: bold; color: #0284c7; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
        .info-label { color: #666; }
        .info-value { font-weight: 500; }
        .total { font-size: 24px; font-weight: bold; color: #0369a1; }
        .message { white-space: pre-wrap; margin-bottom: 20px; }
        .validity { background-color: #fef3c7; padding: 12px; border-radius: 8px; margin-bottom: 20px; color: #92400e; font-size: 14px; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${empresa?.nombre || 'Invoice App'}</h1>
          ${empresa?.ruc ? `<p style="margin: 5px 0 0 0; color: #0369a1;">RUC: ${empresa.ruc}</p>` : ''}
        </div>
        
        <div class="message">${message.replace(/\n/g, '<br>')}</div>
        
        <div class="proforma-info">
          <div class="proforma-number">Proforma ${proforma.serie}-${String(proforma.numero).padStart(6, '0')}</div>
          <div style="margin-top: 15px;">
            <div class="info-row">
              <span class="info-label">Cliente:</span>
              <span class="info-value">${proforma.cliente?.nombre || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Documento:</span>
              <span class="info-value">${proforma.cliente?.tipoDocumento || ''} ${proforma.cliente?.documento || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Fecha de Emisión:</span>
              <span class="info-value">${new Date(proforma.fechaEmision).toLocaleDateString('es-PE')}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Válido hasta:</span>
              <span class="info-value">${proforma.fechaValidez ? new Date(proforma.fechaValidez).toLocaleDateString('es-PE') : 'N/A'}</span>
            </div>
            <div class="info-row" style="border-bottom: none; margin-top: 10px;">
              <span class="info-label">Total:</span>
              <span class="total">S/ ${parseFloat(proforma.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div class="validity">
          ⚠️ Esta proforma/cotización es válida hasta el ${proforma.fechaValidez ? new Date(proforma.fechaValidez).toLocaleDateString('es-PE') : 'fecha indicada'}. 
          Este documento no tiene valor fiscal.
        </div>
        
        <div class="footer">
          <p>Este correo ha sido enviado automáticamente desde Invoice App.</p>
          ${empresa?.email ? `<p>Para cualquier consulta: ${empresa.email}</p>` : ''}
        </div>
      </div>
    </body>
    </html>
  `;

  const attachments = [];
  
  if (pdfBuffer) {
    attachments.push({
      filename: `Proforma-${proforma.serie}-${proforma.numero}.pdf`,
      content: pdfBuffer,
    });
  }

  return sendEmail({
    to,
    subject,
    text: message,
    html: htmlContent,
    attachments,
  });
}

module.exports = {
  sendEmail,
  sendInvoiceEmail,
  sendProformaEmail,
};
