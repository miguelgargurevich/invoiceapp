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
  locale = 'en'
}) {
  const signingUrl = `${baseUrl}/${locale}/sign/${token}`;
  const expiresDate = new Date(expiresAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const documentType = document.serie?.startsWith('F') ? 'Invoice' : 'Proposal';
  const documentNumber = `${document.serie}-${document.numero}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
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
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
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
            color: #3b82f6;
            font-size: 24px;
            font-weight: 700;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 16px 40px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
            box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);
          }
          .cta-button:hover {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          }
          .info-box {
            background-color: #eff6ff;
            border-left: 4px solid #3b82f6;
            padding: 15px 20px;
            margin: 25px 0;
            border-radius: 4px;
          }
          .info-title {
            color: #1e40af;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 8px;
          }
          .info-list {
            color: #1e40af;
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
            color: #3b82f6;
            text-decoration: none;
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
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            ${empresa.logoUrl ? `<img src="${empresa.logoUrl}" alt="${empresa.nombre}" class="logo">` : ''}
            <h1 class="header-title">Signature Request</h1>
          </div>

          <!-- Content -->
          <div class="content">
            <p class="greeting">Hello ${signerName || 'there'},</p>
            
            <p class="message">
              <strong>${empresa.nombre}</strong> has requested your electronic signature 
              for the following document. Your signature is required to complete this transaction.
            </p>

            <!-- Document Info -->
            <div class="document-box">
              <div class="document-label">${documentType}</div>
              <div class="document-number">${documentNumber}</div>
              <div class="document-amount">$${document.total.toFixed(2)}</div>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center;">
              <a href="${signingUrl}" class="cta-button">
                📝 Sign Document Now
              </a>
            </div>

            <!-- Expires Notice -->
            <div class="expires-notice">
              <p class="expires-text">
                ⏰ This signature request expires on <strong>${expiresDate}</strong>
              </p>
            </div>

            <!-- Info Box -->
            <div class="info-box">
              <div class="info-title">What to expect:</div>
              <ul class="info-list">
                <li>The signing process takes less than 2 minutes</li>
                <li>You can sign on any device (mobile-friendly)</li>
                <li>Your signature is legally binding and secure</li>
                <li>You'll receive a confirmation email after signing</li>
              </ul>
            </div>

            <p class="message" style="margin-top: 30px;">
              If you have any questions or concerns, please contact ${empresa.nombre} directly 
              ${empresa.email ? `at <a href="mailto:${empresa.email}" style="color: #3b82f6;">${empresa.email}</a>` : ''}.
            </p>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p class="footer-text">
              This electronic signature request is compliant with the U.S. Electronic Signatures in Global 
              and National Commerce Act (ESIGN) and the Uniform Electronic Transactions Act (UETA).
            </p>
            <p class="footer-text" style="margin-top: 15px;">
              © ${new Date().getFullYear()} ${empresa.nombre}. All rights reserved.
            </p>
            <p class="footer-text" style="margin-top: 10px; font-size: 11px;">
              If you're having trouble clicking the button, copy and paste this URL into your browser:<br>
              <a href="${signingUrl}" class="footer-link">${signingUrl}</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const result = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: signerEmail,
      subject: `Signature Required: ${documentType} ${documentNumber}`,
      html: htmlContent,
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
 * Send signature confirmation email to both client and business owner
 */
async function sendSignatureConfirmationEmail({
  signerEmail,
  signerName,
  document,
  empresa,
  signedPdfUrl,
  signedAt,
  locale = 'en'
}) {
  const documentType = document.serie?.startsWith('F') ? 'Invoice' : 'Proposal';
  const documentNumber = `${document.serie}-${document.numero}`;
  const signedDate = new Date(signedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
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
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            padding: 40px 20px;
            text-align: center;
          }
          .success-icon {
            font-size: 48px;
            margin-bottom: 10px;
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
          .download-button {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            text-align: center;
            margin: 20px 0;
            box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);
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
          @media only screen and (max-width: 600px) {
            .content {
              padding: 30px 20px;
            }
            .header {
              padding: 30px 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <div class="success-icon">✅</div>
            <h1 class="header-title">Document Signed Successfully</h1>
          </div>

          <!-- Content -->
          <div class="content">
            <p class="greeting">Hello ${signerName || 'there'},</p>
            
            <p class="message">
              Your signature has been successfully recorded and the document has been completed.
            </p>

            <!-- Success Box -->
            <div class="success-box">
              <div class="success-title">Signature Confirmed</div>
              <div class="success-details">Signed on ${signedDate}</div>
              <div class="success-details">Signer: ${signerName}</div>
            </div>

            <!-- Document Info -->
            <div class="document-box">
              <div class="document-label">${documentType}</div>
              <div class="document-number">${documentNumber}</div>
            </div>

            ${signedPdfUrl ? `
              <div style="text-align: center;">
                <a href="${signedPdfUrl}" class="download-button">
                  📄 Download Signed Document
                </a>
              </div>
            ` : ''}

            <p class="message" style="margin-top: 30px;">
              A copy of the signed document has been saved for your records. 
              If you need any assistance, please contact ${empresa.nombre} 
              ${empresa.email ? `at <a href="mailto:${empresa.email}" style="color: #3b82f6;">${empresa.email}</a>` : ''}.
            </p>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p class="footer-text">
              This is a legally binding electronic signature compliant with the ESIGN Act and UETA.
            </p>
            <p class="footer-text" style="margin-top: 15px;">
              © ${new Date().getFullYear()} ${empresa.nombre}. All rights reserved.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    // Send to signer
    const signerResult = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: signerEmail,
      subject: `Confirmation: ${documentType} ${documentNumber} Signed`,
      html: htmlContent,
      replyTo: empresa.email || undefined,
    });

    console.log('Signature confirmation email sent to signer:', signerResult);

    // Send notification to business owner
    if (empresa.email) {
      const ownerHtml = htmlContent.replace(
        `Hello ${signerName || 'there'},`,
        `Hello,`
      ).replace(
        'Your signature has been successfully recorded and the document has been completed.',
        `<strong>${signerName}</strong> has signed ${documentType} ${documentNumber}.`
      );

      const ownerResult = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: empresa.email,
        subject: `Signed: ${documentType} ${documentNumber} by ${signerName}`,
        html: ownerHtml,
      });

      console.log('Signature notification sent to owner:', ownerResult);
    }

    return signerResult;
  } catch (error) {
    console.error('Error sending signature confirmation email:', error);
    throw error;
  }
}

module.exports = {
  sendEmail,
  sendInvoiceEmail,
  sendProformaEmail,
  sendSignatureRequestEmail,
  sendSignatureConfirmationEmail,
};
