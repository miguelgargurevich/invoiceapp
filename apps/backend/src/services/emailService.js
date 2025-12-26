const { Resend } = require('resend');

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const fromName = process.env.RESEND_FROM_NAME || 'Invoice App';

/**
 * Get translations based on locale
 * @param {string} locale - Language locale (es or en)
 * @returns {Object} - Translation strings
 */
function getTranslations(locale = 'es') {
  const translations = {
    es: {
      invoice: 'Factura',
      proforma: 'Proforma',
      client: 'Cliente',
      document: 'Documento',
      issueDate: 'Fecha de Emisión',
      dueDate: 'Fecha de Vencimiento',
      validUntil: 'Válido hasta',
      total: 'Total',
      automaticEmail: 'Este correo ha sido enviado automáticamente desde Invoice App.',
      forQuestions: 'Para cualquier consulta',
      proformaValidity: '⚠️ Esta proforma/cotización es válida hasta el',
      noFiscalValue: 'Este documento no tiene valor fiscal.',
    },
    en: {
      invoice: 'Invoice',
      proforma: 'Proposal',
      client: 'Client',
      document: 'Document',
      issueDate: 'Issue Date',
      dueDate: 'Due Date',
      validUntil: 'Valid until',
      total: 'Total',
      automaticEmail: 'This email has been sent automatically from Invoice App.',
      forQuestions: 'For any questions',
      proformaValidity: '⚠️ This proposal/quote is valid until',
      noFiscalValue: 'This document has no fiscal value.',
    }
  };
  
  return translations[locale] || translations.es;
}

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
 * @param {string} options.locale - Language locale (es or en)
 * @returns {Promise<Object>} - Resend API response
 */
async function sendInvoiceEmail({ to, subject, message, factura, empresa, pdfBuffer, locale = 'es' }) {
  const t = getTranslations(locale);
  
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
          <div class="invoice-number">${t.invoice} ${factura.serie}-${String(factura.numero).padStart(6, '0')}</div>
          <div style="margin-top: 15px;">
            <div class="info-row">
              <span class="info-label">${t.client}:</span>
              <span class="info-value">${factura.cliente?.nombre || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">${t.document}:</span>
              <span class="info-value">${factura.cliente?.tipoDocumento || ''} ${factura.cliente?.documento || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">${t.issueDate}:</span>
              <span class="info-value">${new Date(factura.fechaEmision).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-PE')}</span>
            </div>
            <div class="info-row">
              <span class="info-label">${t.dueDate}:</span>
              <span class="info-value">${factura.fechaVencimiento ? new Date(factura.fechaVencimiento).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-PE') : 'N/A'}</span>
            </div>
            <div class="info-row" style="border-bottom: none; margin-top: 10px;">
              <span class="info-label">${t.total}:</span>
              <span class="total">S/ ${parseFloat(factura.total).toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>${t.automaticEmail}</p>
          ${empresa?.email ? `<p>${t.forQuestions}: ${empresa.email}</p>` : ''}
        </div>
      </div>
    </body>
    </html>
  `;

  const attachments = [];
  
  if (pdfBuffer) {
    attachments.push({
      filename: `${t.invoice}-${factura.serie}-${factura.numero}.pdf`,
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
 * @param {string} options.locale - Language locale (es or en)
 * @returns {Promise<Object>} - Resend API response
 */
async function sendProformaEmail({ to, subject, message, proforma, empresa, pdfBuffer, locale = 'es' }) {
  const t = getTranslations(locale);
  
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
          <div class="proforma-number">${t.proforma} ${proforma.serie}-${String(proforma.numero).padStart(6, '0')}</div>
          <div style="margin-top: 15px;">
            <div class="info-row">
              <span class="info-label">${t.client}:</span>
              <span class="info-value">${proforma.cliente?.nombre || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">${t.document}:</span>
              <span class="info-value">${proforma.cliente?.tipoDocumento || ''} ${proforma.cliente?.documento || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">${t.issueDate}:</span>
              <span class="info-value">${new Date(proforma.fechaEmision).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-PE')}</span>
            </div>
            <div class="info-row">
              <span class="info-label">${t.validUntil}:</span>
              <span class="info-value">${proforma.fechaValidez ? new Date(proforma.fechaValidez).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-PE') : 'N/A'}</span>
            </div>
            <div class="info-row" style="border-bottom: none; margin-top: 10px;">
              <span class="info-label">${t.total}:</span>
              <span class="total">S/ ${parseFloat(proforma.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div class="validity">
          ⚠️ ${t.proformaValidity} ${proforma.fechaValidez ? new Date(proforma.fechaValidez).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-PE') : 'fecha indicada'}. 
          ${t.noFiscalValue}
        </div>
        
        <div class="footer">
          <p>${t.automaticEmail}</p>
          ${empresa?.email ? `<p>${t.forQuestions}: ${empresa.email}</p>` : ''}
        </div>
      </div>
    </body>
    </html>
  `;

  const attachments = [];
  
  if (pdfBuffer) {
    attachments.push({
      filename: `${t.proforma}-${proforma.serie}-${proforma.numero}.pdf`,
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
