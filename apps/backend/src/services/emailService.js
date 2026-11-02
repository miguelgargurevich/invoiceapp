const { Resend } = require('resend');
const { colorDeMarca, colorParaTextoBlanco, tintar } = require('../planes/marca');

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const fromName = process.env.RESEND_FROM_NAME || 'Facturo';

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
      automaticEmail: 'Este correo ha sido enviado automáticamente desde Facturo.',
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
      automaticEmail: 'This email has been sent automatically from Facturo.',
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
    console.log('📤 Preparing email:', {
      to,
      subject,
      from: `${fromName} <${fromEmail}>`,
      hasHtml: !!html,
      attachmentsCount: attachments.length
    });

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

    console.log('📨 Sending via Resend API...');
    const response = await resend.emails.send(emailData);
    
    console.log('✅ Email sent successfully:', response);
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
  const acento = colorParaTextoBlanco(colorDeMarca(empresa));
  
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
        .invoice-number { font-size: 20px; font-weight: bold; color: ${acento}; }
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
          <h1>${empresa?.nombre || 'Facturo'}</h1>
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
  const acento = colorParaTextoBlanco(colorDeMarca(empresa));
  const tinte = tintar(colorDeMarca(empresa), 0.9);
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: ${tinte}; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid ${acento}; }
        .header h1 { margin: 0; color: ${acento}; font-size: 24px; }
        .proforma-info { background-color: #fff; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .proforma-number { font-size: 20px; font-weight: bold; color: ${acento}; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
        .info-label { color: #666; }
        .info-value { font-weight: 500; }
        .total { font-size: 24px; font-weight: bold; color: ${acento}; }
        .message { white-space: pre-wrap; margin-bottom: 20px; }
        .validity { background-color: #fef3c7; padding: 12px; border-radius: 8px; margin-bottom: 20px; color: #92400e; font-size: 14px; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${empresa?.nombre || 'Facturo'}</h1>
          ${empresa?.ruc ? `<p style="margin: 5px 0 0 0; color: ${acento};">RUC: ${empresa.ruc}</p>` : ''}
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

/**
 * Correos de firma digital (español, Perú). Comparten diseño y estilos.
 */

function escaparHtml(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function tipoDocumentoFirma(document) {
  return document.serie?.startsWith('F') ? 'Factura' : 'Proforma';
}

function fechaFirma(fecha, conHora = false) {
  return new Date(fecha).toLocaleDateString('es-PE', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...(conHora ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

function montoFirma(document) {
  const simbolo = document.moneda === 'USD' ? 'US$' : 'S/';
  return `${simbolo} ${Number(document.total).toFixed(2)}`;
}

function saludoFirma(nombre) {
  return nombre ? `Hola ${escaparHtml(nombre)},` : 'Hola,';
}

function estilosFirma(acento) {
  return `
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f3f4f6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background-color: ${acento};
      padding: 40px 20px;
      text-align: center;
    }
    .logo {
      max-width: 150px;
      height: auto;
      margin-bottom: 20px;
    }
    .header-title {
      color: #ffffff;
      font-size: 24px;
      font-weight: 600;
      margin: 0;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #111827;
      margin-bottom: 20px;
      font-weight: 500;
    }
    .message {
      color: #4b5563;
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 30px;
    }
    .document-box {
      background-color: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin: 30px 0;
    }
    .document-label {
      color: #6b7280;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .document-number {
      color: #111827;
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .document-amount {
      color: #111827;
      font-size: 24px;
      font-weight: 700;
    }
    .cta-button {
      display: inline-block;
      background: ${acento};
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 40px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      text-align: center;
      margin: 20px 0;
    }
    .success-box {
      background-color: #d1fae5;
      border: 2px solid #10b981;
      border-radius: 8px;
      padding: 20px;
      margin: 30px 0;
      text-align: center;
    }
    .success-title {
      color: #065f46;
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .success-details {
      color: #047857;
      font-size: 14px;
      margin: 5px 0;
    }
    .expires-notice {
      background-color: #fef3c7;
      border: 1px solid #fbbf24;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 20px 0;
      text-align: center;
    }
    .expires-text {
      color: #92400e;
      font-size: 13px;
      margin: 0;
    }
    .info-box {
      background-color: #f9fafb;
      border-left: 4px solid #6b7280;
      padding: 15px 20px;
      margin: 25px 0;
      border-radius: 4px;
    }
    .info-title {
      color: #374151;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .info-list {
      color: #4b5563;
      font-size: 13px;
      line-height: 1.8;
      margin: 0;
      padding-left: 20px;
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer-text {
      color: #6b7280;
      font-size: 13px;
      line-height: 1.6;
      margin: 5px 0;
    }
    .footer-link {
      color: #374151;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 30px 20px;
      }
      .header {
        padding: 30px 20px;
      }
      .cta-button {
        display: block;
        padding: 14px 20px;
      }
    }
  `;
}

function plantillaFirma({ acento, cabecera, cuerpo, pie }) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>${estilosFirma(acento)}</style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${cabecera}
          </div>
          <div class="content">
            ${cuerpo}
          </div>
          <div class="footer">
            ${pie}
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Send signature request email to client
 */
async function sendSignatureRequestEmail({
  signerEmail,
  signerName,
  token,
  document,
  empresa,
  expiresAt,
  baseUrl,
  locale = 'es'
}) {
  const acento = colorParaTextoBlanco(colorDeMarca(empresa));
  const signingUrl = `${baseUrl}/${locale}/sign/${token}`;
  const tipo = tipoDocumentoFirma(document);
  const numero = `${document.serie}-${document.numero}`;
  const nombreEmpresa = escaparHtml(empresa.nombre);

  const cabecera = `
            ${empresa.logoUrl ? `<img src="${empresa.logoUrl}" alt="${nombreEmpresa}" class="logo">` : ''}
            <h1 class="header-title">Solicitud de firma</h1>`;

  const cuerpo = `
            <p class="greeting">${saludoFirma(signerName)}</p>
            <p class="message">
              <strong>${nombreEmpresa}</strong> te pide tu firma electrónica para el siguiente documento.
              Tu firma es necesaria para completar la operación.
            </p>

            <div class="document-box">
              <div class="document-label">${tipo}</div>
              <div class="document-number">${numero}</div>
              <div class="document-amount">${montoFirma(document)}</div>
            </div>

            <div style="text-align: center;">
              <a href="${signingUrl}" class="cta-button">Firmar documento</a>
            </div>

            <div class="expires-notice">
              <p class="expires-text">
                Esta solicitud vence el <strong>${fechaFirma(expiresAt)}</strong>
              </p>
            </div>

            <div class="info-box">
              <div class="info-title">Qué debes saber:</div>
              <ul class="info-list">
                <li>Firmar toma menos de 2 minutos</li>
                <li>Puedes firmar desde cualquier dispositivo, también desde el celular</li>
                <li>Tu firma queda registrada con la fecha, la hora y la dirección IP desde la que firmaste</li>
                <li>Recibirás un correo de confirmación al firmar</li>
              </ul>
            </div>

            <p class="message" style="margin-top: 30px;">
              Si tienes alguna consulta, escribe directamente a ${nombreEmpresa}
              ${empresa.email ? `a <a href="mailto:${empresa.email}" style="color: ${acento};">${empresa.email}</a>` : ''}.
            </p>`;

  const pie = `
            <p class="footer-text">
              © ${new Date().getFullYear()} ${nombreEmpresa}. Todos los derechos reservados.
            </p>
            <p class="footer-text" style="margin-top: 10px; font-size: 11px;">
              Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
              <a href="${signingUrl}" class="footer-link">${signingUrl}</a>
            </p>`;

  try {
    const result = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: signerEmail,
      subject: `Firma requerida: ${tipo} ${numero}`,
      html: plantillaFirma({ acento, cabecera, cuerpo, pie }),
      replyTo: empresa.email || undefined,
    });

    console.log('Signature request email sent:', result);
    return result;
  } catch (error) {
    console.error('Error sending signature request email:', error);
    throw error;
  }
}

/**
 * Confirmación de firma: una plantilla para el firmante y otra para el dueño.
 */
function htmlConfirmacionFirma({ acento, empresa, tipo, numero, saludo, mensaje, nombreFirmante, fechaFirmado, urlPdf }) {
  const nombreEmpresa = escaparHtml(empresa.nombre);

  const cabecera = `
            <h1 class="header-title">Documento firmado</h1>`;

  const cuerpo = `
            <p class="greeting">${saludo}</p>
            <p class="message">${mensaje}</p>

            <div class="success-box">
              <div class="success-title">Firma confirmada</div>
              <div class="success-details">Firmado el ${fechaFirmado}</div>
              <div class="success-details">Firmante: ${escaparHtml(nombreFirmante)}</div>
            </div>

            <div class="document-box">
              <div class="document-label">${tipo}</div>
              <div class="document-number">${numero}</div>
            </div>

            ${urlPdf ? `
            <div style="text-align: center;">
              <a href="${urlPdf}" class="cta-button">Descargar documento firmado</a>
            </div>` : ''}

            <p class="message" style="margin-top: 30px;">
              ${urlPdf
                ? 'Se guardó una copia del documento firmado.'
                : 'La firma quedó registrada. El documento firmado estará disponible en breve.'}
              Si necesitas ayuda, escribe a ${nombreEmpresa}
              ${empresa.email ? `a <a href="mailto:${empresa.email}" style="color: ${acento};">${empresa.email}</a>` : ''}.
            </p>`;

  const pie = `
            <p class="footer-text">
              © ${new Date().getFullYear()} ${nombreEmpresa}. Todos los derechos reservados.
            </p>`;

  return plantillaFirma({ acento, cabecera, cuerpo, pie });
}

/**
 * Send signature confirmation email to both client and business owner
 */
async function sendSignatureConfirmationEmail({
  signerEmail,
  signerName,
  document,
  empresa,
  signedPdfUrl,
  signedAt,
  locale = 'es'
}) {
  const acento = colorParaTextoBlanco(colorDeMarca(empresa));
  const tipo = tipoDocumentoFirma(document);
  const numero = `${document.serie}-${document.numero}`;
  const nombreFirmante = signerName || signerEmail;
  const fechaFirmado = fechaFirma(signedAt, true);

  const datosComunes = { acento, empresa, tipo, numero, nombreFirmante, fechaFirmado, urlPdf: signedPdfUrl };
  const htmlFirmante = htmlConfirmacionFirma({
    ...datosComunes,
    saludo: saludoFirma(signerName),
    mensaje: 'Tu firma quedó registrada y el documento está completo.',
  });
  const htmlDueno = htmlConfirmacionFirma({
    ...datosComunes,
    saludo: 'Hola,',
    mensaje: `<strong>${escaparHtml(nombreFirmante)}</strong> firmó la ${tipo} ${numero}.`,
  });

  try {
    // Al firmante
    const signerResult = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: signerEmail,
      subject: `Confirmación: firmaste la ${tipo} ${numero}`,
      html: htmlFirmante,
      replyTo: empresa.email || undefined,
    });

    console.log('Signature confirmation email sent to signer:', signerResult);

    // Aviso al dueño
    if (empresa.email) {
      const ownerResult = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: empresa.email,
        subject: `Firmado: ${tipo} ${numero} por ${nombreFirmante}`,
        html: htmlDueno,
      });

      console.log('Signature notification sent to owner:', ownerResult);
    }

    return signerResult;
  } catch (error) {
    console.error('Error sending signature confirmation email:', error);
    throw error;
  }
}

/**
 * Send invoice creation notification email to client
 * @param {Object} options - Email options
 * @param {Object} options.factura - Invoice data with cliente
 * @param {Object} options.empresa - Company data
 * @param {string} options.locale - Language locale (es or en)
 * @returns {Promise<Object>} - Resend API response
 */
async function sendInvoiceCreationEmail({ factura, empresa, locale = 'es' }) {
  const t = getTranslations(locale);
  const acento = colorParaTextoBlanco(colorDeMarca(empresa));
  
  const clientEmail = factura.cliente?.email;
  if (!clientEmail) {
    console.log('No client email found, skipping invoice creation email');
    return null;
  }

  const subject = locale === 'es' 
    ? `Nueva factura ${factura.serie}-${String(factura.numero).padStart(6, '0')}` 
    : `New invoice ${factura.serie}-${String(factura.numero).padStart(6, '0')}`;

  const message = locale === 'es'
    ? `Estimado/a ${factura.cliente.nombre},\n\nSe ha generado una nueva factura a su nombre.\n\nPor favor revise los detalles a continuación.`
    : `Dear ${factura.cliente.nombre},\n\nA new invoice has been generated in your name.\n\nPlease review the details below.`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: ${acento}; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 24px; }
        .invoice-info { background-color: #fff; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .invoice-number { font-size: 20px; font-weight: bold; color: ${acento}; margin-bottom: 15px; }
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
          <h1>${empresa?.nombre || 'Facturo'}</h1>
          ${empresa?.ruc ? `<p style="margin: 5px 0 0 0;">${locale === 'es' ? 'RUC' : 'Tax ID'}: ${empresa.ruc}</p>` : ''}
        </div>
        
        <div class="message">${message.replace(/\n/g, '<br>')}</div>
        
        <div class="invoice-info">
          <div class="invoice-number">${t.invoice} ${factura.serie}-${String(factura.numero).padStart(6, '0')}</div>
          <div class="info-row">
            <span class="info-label">${t.issueDate}:</span>
            <span class="info-value">${new Date(factura.fechaEmision).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-PE')}</span>
          </div>
          ${factura.fechaVencimiento ? `
          <div class="info-row">
            <span class="info-label">${t.dueDate}:</span>
            <span class="info-value">${new Date(factura.fechaVencimiento).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-PE')}</span>
          </div>
          ` : ''}
          <div class="info-row" style="border-bottom: none; margin-top: 10px;">
            <span class="info-label">${t.total}:</span>
            <span class="total">${empresa?.moneda === 'USD' ? '$' : 'S/'} ${parseFloat(factura.total).toFixed(2)}</span>
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

  return sendEmail({
    to: clientEmail,
    subject,
    text: message,
    html: htmlContent,
  });
}

/**
 * Send payment confirmation email to client
 * @param {Object} options - Email options
 * @param {Object} options.pago - Payment data
 * @param {Object} options.factura - Invoice data with cliente
 * @param {Object} options.empresa - Company data
 * @param {string} options.locale - Language locale (es or en)
 * @returns {Promise<Object>} - Resend API response
 */
async function sendPaymentConfirmationEmail({ pago, factura, empresa, locale = 'es' }) {
  const t = getTranslations(locale);
  
  const clientEmail = factura.cliente?.email;
  if (!clientEmail) {
    console.log('No client email found, skipping payment confirmation email');
    return null;
  }

  const subject = locale === 'es' 
    ? `Pago recibido - Factura ${factura.serie}-${String(factura.numero).padStart(6, '0')}` 
    : `Payment received - Invoice ${factura.serie}-${String(factura.numero).padStart(6, '0')}`;

  const message = locale === 'es'
    ? `Estimado/a ${factura.cliente.nombre},\n\nHemos recibido su pago. Gracias por su puntualidad.`
    : `Dear ${factura.cliente.nombre},\n\nWe have received your payment. Thank you for your promptness.`;

  const paymentMethodLabels = {
    es: {
      TRANSFERENCIA: 'Transferencia bancaria',
      EFECTIVO: 'Efectivo',
      TARJETA: 'Tarjeta',
      CHEQUE: 'Cheque',
    },
    en: {
      TRANSFERENCIA: 'Bank transfer',
      EFECTIVO: 'Cash',
      TARJETA: 'Card',
      CHEQUE: 'Check',
    }
  };

  const metodoPagoLabel = paymentMethodLabels[locale][pago.metodoPago] || pago.metodoPago;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #22c55e; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 24px; }
        .payment-info { background-color: #f0fdf4; border: 2px solid #22c55e; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .checkmark { font-size: 48px; text-align: center; margin-bottom: 10px; }
        .invoice-number { font-size: 18px; font-weight: bold; color: #166534; margin-bottom: 15px; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #dcfce7; }
        .info-label { color: #166534; }
        .info-value { font-weight: 500; }
        .amount-paid { font-size: 28px; font-weight: bold; color: #22c55e; text-align: center; margin: 20px 0; }
        .message { white-space: pre-wrap; margin-bottom: 20px; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${empresa?.nombre || 'Facturo'}</h1>
          ${empresa?.ruc ? `<p style="margin: 5px 0 0 0;">${locale === 'es' ? 'RUC' : 'Tax ID'}: ${empresa.ruc}</p>` : ''}
        </div>
        
        <div class="message">${message.replace(/\n/g, '<br>')}</div>
        
        <div class="payment-info">
          <div class="checkmark">✅</div>
          <div class="invoice-number">${t.invoice} ${factura.serie}-${String(factura.numero).padStart(6, '0')}</div>
          
          <div class="amount-paid">${empresa?.moneda === 'USD' ? '$' : 'S/'} ${parseFloat(pago.monto).toFixed(2)}</div>
          
          <div class="info-row">
            <span class="info-label">${locale === 'es' ? 'Fecha de pago' : 'Payment date'}:</span>
            <span class="info-value">${new Date(pago.fecha).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-PE')}</span>
          </div>
          <div class="info-row">
            <span class="info-label">${locale === 'es' ? 'Método de pago' : 'Payment method'}:</span>
            <span class="info-value">${metodoPagoLabel}</span>
          </div>
          ${pago.referencia ? `
          <div class="info-row">
            <span class="info-label">${locale === 'es' ? 'Referencia' : 'Reference'}:</span>
            <span class="info-value">${pago.referencia}</span>
          </div>
          ` : ''}
          <div class="info-row" style="border-bottom: none;">
            <span class="info-label">${locale === 'es' ? 'Total factura' : 'Invoice total'}:</span>
            <span class="info-value">${empresa?.moneda === 'USD' ? '$' : 'S/'} ${parseFloat(factura.total).toFixed(2)}</span>
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

  return sendEmail({
    to: clientEmail,
    subject,
    text: message,
    html: htmlContent,
  });
}

module.exports = {
  sendEmail,
  sendInvoiceEmail,
  sendProformaEmail,
  sendSignatureRequestEmail,
  sendSignatureConfirmationEmail,
  sendInvoiceCreationEmail,
  sendPaymentConfirmationEmail,
};
