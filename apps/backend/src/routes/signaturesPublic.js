const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const { sendSignatureConfirmationEmail } = require('../services/emailService');

console.log('🔐 signaturesPublic.js loaded - version 2');

const prisma = new PrismaClient();

// Initialize Supabase client
let supabase = null;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log('✅ Supabase client initialized for signatures');
} else {
  console.warn('⚠️ Supabase not configured - signatures will be stored as base64');
}

// GET /api/signatures/public/validate/:token - Validate token and get document (PUBLIC)
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

    // Check if expired (only if not already signed)
    if (signatureRequest.status !== 'SIGNED' && new Date() > signatureRequest.expiresAt) {
      return res.status(400).json({ error: 'Signature request has expired' });
    }

    // Return document data (including already signed documents)
    // The frontend will handle displaying already signed documents differently
    res.json(signatureRequest);
  } catch (error) {
    console.error('Error validating signature request:', error);
    res.status(500).json({ error: 'Failed to validate signature request' });
  }
});

// POST /api/signatures/public/submit - Submit signature (PUBLIC)
router.post('/submit', async (req, res) => {
  try {
    const { 
      token, 
      signatureDataUrl, 
      signedPdfDataUrl,
      consentGiven,
      consentText,
      ipAddress,
      userAgent,
      deviceType
    } = req.body;

    if (!token || !signatureDataUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate signature request
    const signatureRequest = await prisma.signatureRequest.findUnique({
      where: { token },
      include: {
        factura: true,
        proforma: true,
        empresa: {
          select: {
            nombre: true,
            email: true
          }
        }
      }
    });

    if (!signatureRequest) {
      return res.status(404).json({ error: 'Invalid signature request' });
    }

    console.log('[SIGNATURE] Request status:', signatureRequest.status, 'ID:', signatureRequest.id);

    if (signatureRequest.status === 'SIGNED') {
      return res.status(400).json({ error: 'Document already signed' });
    }

    if (new Date() > signatureRequest.expiresAt) {
      return res.status(400).json({ error: 'Signature request has expired' });
    }

    // Check if signature already exists for this request (handles inconsistent state)
    const existingSignature = await prisma.signature.findUnique({
      where: { signatureRequestId: signatureRequest.id }
    });

    console.log('[SIGNATURE] Existing signature:', existingSignature ? 'YES' : 'NO');

    if (existingSignature) {
      // If signature exists but status is not SIGNED, fix the inconsistency
      console.log('[SIGNATURE] Fixing inconsistent state - updating request to SIGNED');
      await prisma.signatureRequest.update({
        where: { id: signatureRequest.id },
        data: { 
          status: 'SIGNED'
        }
      });
      
      // Return success since signature already exists
      return res.json({ 
        success: true, 
        message: 'Document was already signed',
        signature: existingSignature
      });
    }

    let signatureImageUrl = signatureDataUrl;

    // Upload signature to Supabase if available
    if (supabase && signatureDataUrl.startsWith('data:image')) {
      try {
        const base64Data = signatureDataUrl.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `${signatureRequest.empresaId}/signatures/${token}_${Date.now()}.png`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, buffer, {
            contentType: 'image/png',
            upsert: false
          });

        if (uploadError) {
          console.error('Error uploading signature to Supabase:', uploadError);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('logos')
            .getPublicUrl(fileName);
          
          signatureImageUrl = publicUrlData.publicUrl;
          console.log('✅ Signature uploaded to Supabase:', signatureImageUrl);
        }
      } catch (error) {
        console.error('Error processing signature upload:', error);
        // Continue with base64 if upload fails
      }
    }

    // Create signature record
    const signature = await prisma.signature.create({
      data: {
        signatureRequestId: signatureRequest.id,
        signatureImageUrl: signatureImageUrl,
        signerName: signatureRequest.signerName,
        signerEmail: signatureRequest.signerEmail,
        ipAddress: ipAddress || req.ip || req.connection.remoteAddress,
        userAgent: userAgent,
        deviceType: deviceType,
        consentGiven: consentGiven,
        consentText: consentText,
        signedAt: new Date()
      }
    });

    // Update signature request status
    await prisma.signatureRequest.update({
      where: { id: signatureRequest.id },
      data: { 
        status: 'SIGNED'
      }
    });

    // Update document status
    if (signatureRequest.documentType === 'INVOICE' && signatureRequest.factura) {
      await prisma.factura.update({
        where: { id: signatureRequest.factura.id },
        data: { 
          signatureStatus: 'SIGNED',
          firmaCliente: signatureImageUrl
        }
      });
    } else if (signatureRequest.documentType === 'PROFORMA' && signatureRequest.proforma) {
      await prisma.proforma.update({
        where: { id: signatureRequest.proforma.id },
        data: { 
          signatureStatus: 'SIGNED',
          firmaCliente: signatureImageUrl
        }
      });
    }

    // Send confirmation email
    try {
      await sendSignatureConfirmationEmail({
        to: signatureRequest.signerEmail,
        signerName: signatureRequest.signerName,
        documentType: signatureRequest.documentType,
        documentNumber: signatureRequest.factura?.numero || signatureRequest.proforma?.numero,
        companyName: signatureRequest.empresa.nombre
      });
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    res.json({ 
      success: true, 
      message: 'Signature submitted successfully',
      signature 
    });
  } catch (error) {
    console.error('Error submitting signature:', error);
    console.error('Error details:', error.message, error.code);
    res.status(500).json({ error: 'Failed to submit signature', details: error.message });
  }
});

// GET /api/signatures/public/status/:token - Check signature status (PUBLIC)
router.get('/status/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const signatureRequest = await prisma.signatureRequest.findUnique({
      where: { token },
      select: {
        id: true,
        status: true,
        signedAt: true,
        expiresAt: true,
        documentType: true,
        signature: {
          select: {
            signerName: true,
            signedAt: true
          }
        }
      }
    });

    if (!signatureRequest) {
      return res.status(404).json({ error: 'Invalid signature request' });
    }

    res.json(signatureRequest);
  } catch (error) {
    console.error('Error checking signature status:', error);
    res.status(500).json({ error: 'Failed to check signature status' });
  }
});

module.exports = router;
