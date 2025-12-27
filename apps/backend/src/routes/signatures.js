const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const { sendSignatureRequestEmail, sendSignatureConfirmationEmail } = require('../services/emailService');

const prisma = new PrismaClient();

// POST /api/signatures/request - Create signature request
router.post('/request', async (req, res) => {
  try {
    const { documentType, documentId, signerEmail, signerName } = req.body;
    const userId = req.user?.id;

    if (!documentType || !documentId || !signerEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['INVOICE', 'PROFORMA'].includes(documentType)) {
      return res.status(400).json({ error: 'Invalid document type' });
    }

    // Verify document exists and get empresa
    let document;
    let empresaId;
    
    if (documentType === 'INVOICE') {
      document = await prisma.factura.findUnique({
        where: { id: documentId },
        include: { empresa: true }
      });
    } else {
      document = await prisma.proforma.findUnique({
        where: { id: documentId },
        include: { empresa: true }
      });
    }

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    empresaId = document.empresaId;

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Expires in 7 days
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Create signature request
    const signatureRequest = await prisma.signatureRequest.create({
      data: {
        token,
        documentType,
        documentId,
        signerEmail,
        signerName: signerName || null,
        status: 'PENDING',
        expiresAt,
        requestedBy: userId || 'system',
        empresaId,
        sentAt: new Date()
      }
    });

    // Send email notification
    try {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      console.log('📧 Attempting to send signature request email...');
      console.log('📧 Config:', {
        to: signerEmail,
        baseUrl,
        token: token.substring(0, 10) + '...',
        hasResendKey: !!process.env.RESEND_API_KEY,
        fromEmail: process.env.RESEND_FROM_EMAIL
      });
      
      await sendSignatureRequestEmail({
        signerEmail,
        signerName: signerName || signerEmail,
        token,
        document,
        empresa: document.empresa,
        expiresAt,
        baseUrl,
        locale: 'en' // TODO: Get from request or user preferences
      });
      
      console.log('✅ Signature request email sent successfully to:', signerEmail);
    } catch (emailError) {
      console.error('❌ Failed to send signature request email:', emailError);
      console.error('❌ Email error details:', emailError.message);
      // Don't fail the request if email fails, just log it
    }

    res.json({
      success: true,
      id: signatureRequest.id,
      token: signatureRequest.token,
      expiresAt: signatureRequest.expiresAt,
      signingUrl: `/sign/${token}`
    });

  } catch (error) {
    console.error('Error creating signature request:', error);
    res.status(500).json({ error: 'Failed to create signature request' });
  }
});

// GET /api/signatures/validate/:token - Validate token and get document
router.get('/validate/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const signatureRequest = await prisma.signatureRequest.findUnique({
      where: { token },
      include: {
        empresa: {
          select: {
            nombre: true,
            logoUrl: true,
            email: true
          }
        },
        factura: {
          include: {
            cliente: true,
            detalles: true
          }
        },
        proforma: {
          include: {
            cliente: true,
            detalles: true
          }
        },
        signature: true
      }
    });

    if (!signatureRequest) {
      return res.status(404).json({ error: 'Invalid signature request' });
    }

    // Check if already signed
    if (signatureRequest.status === 'SIGNED') {
      return res.status(400).json({ 
        error: 'Document already signed',
        signedAt: signatureRequest.signature?.signedAt 
      });
    }

    // Check if expired
    if (new Date() > signatureRequest.expiresAt) {
      // Update status to expired
      await prisma.signatureRequest.update({
        where: { id: signatureRequest.id },
        data: { status: 'EXPIRED' }
      });
      return res.status(400).json({ error: 'Signature request expired' });
    }

    // Check if cancelled
    if (signatureRequest.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Signature request cancelled' });
    }

    // Mark as viewed (first time)
    if (!signatureRequest.viewedAt) {
      await prisma.signatureRequest.update({
        where: { id: signatureRequest.id },
        data: { viewedAt: new Date() }
      });
    }

    // Get the document
    const document = signatureRequest.documentType === 'INVOICE' 
      ? signatureRequest.factura 
      : signatureRequest.proforma;

    res.json({
      success: true,
      signatureRequest: {
        id: signatureRequest.id,
        documentType: signatureRequest.documentType,
        signerEmail: signatureRequest.signerEmail,
        signerName: signatureRequest.signerName,
        expiresAt: signatureRequest.expiresAt
      },
      empresa: signatureRequest.empresa,
      document: {
        id: document.id,
        serie: document.serie,
        numero: document.numero,
        fechaEmision: document.fechaEmision,
        subtotal: document.subtotal,
        igv: document.igv,
        total: document.total,
        cliente: document.cliente,
        detalles: document.detalles
      }
    });

  } catch (error) {
    console.error('Error validating token:', error);
    res.status(500).json({ error: 'Failed to validate token' });
  }
});

// POST /api/signatures/submit - Submit signature
router.post('/submit', async (req, res) => {
  try {
    const { 
      token, 
      signatureDataUrl, 
      consentGiven, 
      consentText,
      ipAddress,
      userAgent,
      deviceType 
    } = req.body;

    if (!token || !signatureDataUrl || !consentGiven) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find signature request
    const signatureRequest = await prisma.signatureRequest.findUnique({
      where: { token },
      include: {
        factura: true,
        proforma: true,
        empresa: true
      }
    });

    if (!signatureRequest) {
      return res.status(404).json({ error: 'Invalid signature request' });
    }

    // Validate status
    if (signatureRequest.status !== 'PENDING') {
      return res.status(400).json({ error: 'Signature request is not pending' });
    }

    // Check expiration
    if (new Date() > signatureRequest.expiresAt) {
      return res.status(400).json({ error: 'Signature request expired' });
    }

    // TODO: Upload signature image to Supabase Storage
    const signatureImageUrl = `/signatures/${token}-signature.png`;
    
    // TODO: Generate signed PDF with pdf-lib
    const document = signatureRequest.documentType === 'INVOICE' 
      ? signatureRequest.factura 
      : signatureRequest.proforma;
    const signedPdfUrl = `/signed-documents/${document.serie}-${document.numero}-signed.pdf`;

    // Create signature record
    const signature = await prisma.signature.create({
      data: {
        signatureRequestId: signatureRequest.id,
        signatureImageUrl,
        signedPdfUrl,
        signerName: signatureRequest.signerName || 'Unknown',
        signerEmail: signatureRequest.signerEmail,
        signedAt: new Date(),
        consentGiven,
        consentText: consentText || 'I agree to electronically sign this document.',
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        deviceType: deviceType || null
      }
    });

    // Update signature request status
    await prisma.signatureRequest.update({
      where: { id: signatureRequest.id },
      data: { status: 'SIGNED' }
    });

    // Send confirmation emails
    try {
      const document = signatureRequest.documentType === 'INVOICE' 
        ? signatureRequest.factura 
        : signatureRequest.proforma;
      
      await sendSignatureConfirmationEmail({
        signerEmail: signature.signerEmail,
        signerName: signature.signerName,
        document,
        empresa: signatureRequest.empresa,
        signedPdfUrl: signature.signedPdfUrl,
        signedAt: signature.signedAt,
        locale: 'en' // TODO: Get from request or user preferences
      });
      console.log('Signature confirmation emails sent successfully');
    } catch (emailError) {
      console.error('Failed to send signature confirmation emails:', emailError);
      // Don't fail the request if email fails, just log it
    }

    res.json({
      success: true,
      signature: {
        id: signature.id,
        signedAt: signature.signedAt,
        signedPdfUrl: signature.signedPdfUrl
      }
    });

  } catch (error) {
    console.error('Error submitting signature:', error);
    res.status(500).json({ error: 'Failed to submit signature' });
  }
});

// GET /api/signatures/status/:token - Get signature status
router.get('/status/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const signatureRequest = await prisma.signatureRequest.findUnique({
      where: { token },
      include: {
        signature: {
          select: {
            id: true,
            signedAt: true,
            signedPdfUrl: true
          }
        }
      }
    });

    if (!signatureRequest) {
      return res.status(404).json({ error: 'Invalid signature request' });
    }

    res.json({
      status: signatureRequest.status,
      expiresAt: signatureRequest.expiresAt,
      viewedAt: signatureRequest.viewedAt,
      signature: signatureRequest.signature
    });

  } catch (error) {
    console.error('Error checking status:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

module.exports = router;
