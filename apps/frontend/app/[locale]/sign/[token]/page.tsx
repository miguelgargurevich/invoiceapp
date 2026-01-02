'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CheckCircle, AlertCircle, Clock, FileText, Building2 } from 'lucide-react';
import { Button, Card, LoadingPage } from '@/components/common';
import { useToast } from '@/contexts/ToastContext';
import SignatureCanvas from '@/components/signature/SignatureCanvas';
import { InvoicePreview } from '@/components/invoice';
import api from '@/lib/api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface SignatureRequestData {
  id: string;
  documentType: string;
  signerEmail: string;
  signerName: string | null;
  expiresAt: string;
  status: string;
  empresa: {
    nombre: string;
    logoUrl: string | null;
    email: string | null;
  };
  factura?: {
    id: string;
    serie: string;
    numero: string;
    fechaEmision: string;
    subtotal: number;
    igv: number;
    total: number;
    cliente: {
      razonSocial: string;
      numeroDocumento: string;
      tipoDocumento: string;
      direccion?: string;
      email: string;
    };
    detalles: Array<{
      id: string;
      descripcion: string;
      cantidad: number;
      precioUnitario: number;
      descuento: number;
      subtotal: number;
      igv: number;
      total: number;
      producto?: {
        codigo: string;
        nombre: string;
      };
    }>;
  };
  proforma?: {
    id: string;
    serie: string;
    numero: string;
    fechaEmision: string;
    subtotal: number;
    igv: number;
    total: number;
    cliente: {
      razonSocial: string;
      numeroDocumento: string;
      tipoDocumento: string;
      direccion?: string;
      email: string;
    };
    detalles: Array<{
      id: string;
      descripcion: string;
      cantidad: number;
      precioUnitario: number;
      descuento: number;
      subtotal: number;
      igv: number;
      total: number;
      producto?: {
        codigo: string;
        nombre: string;
      };
    }>;
  };
  signature?: {
    id: string;
    signatureImageUrl: string;
    signerName: string;
    signerEmail: string;
    signedAt: string;
  };
}

export default function SignDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('signature');
  const { showWarning, showError } = useToast();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SignatureRequestData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/signatures/public/validate/${token}`) as SignatureRequestData;
      setData(response);
      
      // If document is already signed, show success state
      if (response.status === 'SIGNED') {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid or expired signature request');
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureChange = (dataUrl: string | null) => {
    setSignatureData(dataUrl);
  };

  const handleSubmit = async () => {
    if (!signatureData || !consentGiven) {
      showWarning('Please sign the document and accept the terms');
      return;
    }

    try {
      setSubmitting(true);
      setGeneratingPdf(true);
      
      // Generate PDF with signature
      let signedPdfBase64 = null;
      if (pdfRef.current) {
        // Wait for fonts to load
        await document.fonts.ready;
        
        // Adjust scale based on device pixel ratio
        const dpr = window.devicePixelRatio || 1;
        const adjustedScale = 2.5 / Math.max(dpr, 1);
        
        const canvas = await html2canvas(pdfRef.current, {
          scale: adjustedScale,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/png', 1.0); // Use PNG with maximum quality
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
          compress: true, // Enable PDF compression
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        
        // Calculate dimensions maintaining aspect ratio
        const ratio = pdfWidth / imgWidth;
        const scaledWidth = imgWidth * ratio;
        const scaledHeight = imgHeight * ratio;

        // If image is taller than page, we need to split it
        let position = 0;
        let remainingHeight = scaledHeight;

        while (remainingHeight > 0) {
          if (position > 0) {
            pdf.addPage();
          }

          const pageHeight = Math.min(pdfHeight, remainingHeight);
          
          pdf.addImage(
            imgData,
            'PNG',
            0,
            -position,
            scaledWidth,
            scaledHeight,
            undefined,
            'SLOW' // Use slow compression for better quality
          );

          position += pdfHeight;
          remainingHeight -= pdfHeight;
        }

        // Convert PDF to base64
        signedPdfBase64 = pdf.output('datauristring');
      }
      
      setGeneratingPdf(false);
      
      // Get client info for audit trail
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipResponse.json();

      await api.post('/signatures/public/submit', {
        token,
        signatureDataUrl: signatureData,
        signedPdfDataUrl: signedPdfBase64,
        consentGiven,
        consentText: 'I agree to electronically sign this document and understand that my signature is legally binding.',
        ipAddress: ip,
        userAgent: navigator.userAgent,
        deviceType: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
      });

      setSuccess(true);
    } catch (err: any) {
      console.error('Error submitting signature:', err);
      showError(err.response?.data?.error || 'Failed to submit signature');
      setGeneratingPdf(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingPage />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('invalidRequest')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <Button onClick={() => router.push('/')}>{t('cancel')}</Button>
        </Card>
      </div>
    );
  }

  if (success) {
    const documentUrl = data?.documentType === 'INVOICE' 
      ? `/facturas/${data?.factura?.id}` 
      : `/proformas/${data?.proforma?.id}`;
    
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {t('documentSignedSuccessfully')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            {data?.signature?.signedAt 
              ? t('signedOn', { date: new Date(data.signature.signedAt).toLocaleDateString() })
              : t('confirmationEmailSent')}
          </p>
          {data?.signature?.signerName && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
              {t('signedBy', { name: data.signature.signerName })}
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <Button onClick={() => router.push(documentUrl)}>
              {t('viewDocument')}
            </Button>
            <Button variant="outline" onClick={() => router.push('/')}>
              {t('done')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const expiresAt = new Date(data.expiresAt);
  const daysUntilExpiry = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 px-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <Card className="p-4">
          <div className="flex items-start gap-3">
            {data.empresa.logoUrl ? (
              <img 
                src={data.empresa.logoUrl} 
                alt={data.empresa.nombre}
                className="w-16 h-16 object-contain"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                <Building2 className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {data.empresa.nombre}
                </h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('hasRequestedSignature')}
              </p>
            </div>
          </div>

          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 grid grid-cols-2 gap-4">
                {/* Left Column - Invoice & Client */}
                <div className="space-y-1">
                  <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    {data.documentType === 'INVOICE' ? t('invoice') : t('proposal')}{' '}
                    {(data.factura || data.proforma)?.serie}-{(data.factura || data.proforma)?.numero}
                  </div>
                  
                  {/* Client Information - Compact */}
                  <div className="text-xs">
                    <span className="font-medium text-gray-500 dark:text-gray-400">{t('client')} </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {(data.factura || data.proforma)?.cliente.razonSocial}
                    </span>
                    <div className="text-gray-600 dark:text-gray-400 mt-0.5">
                      {(data.factura || data.proforma)?.cliente.tipoDocumento}: {(data.factura || data.proforma)?.cliente.numeroDocumento}
                      {(data.factura || data.proforma)?.cliente.direccion && (
                        <div className="mt-0.5">{(data.factura || data.proforma)?.cliente.direccion}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Amount & Date */}
                <div className="space-y-1 text-right">
                  <div className="text-xs">
                    <div className="text-gray-600 dark:text-gray-400">{t('amount')}</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      ${Number((data.factura || data.proforma)?.total).toFixed(2)}
                    </div>
                  </div>
                  <div className="text-xs">
                    <div className="text-gray-600 dark:text-gray-400">{t('issueDate')}</div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {new Date((data.factura || data.proforma)?.fechaEmision || '').toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>
              {t('expiresInDays', { days: daysUntilExpiry })}
            </span>
          </div>
        </Card>

        {/* Signature Canvas */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t('signHere')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('signInstructions')}
          </p>
          
          <SignatureCanvas 
            onSignatureChange={handleSignatureChange}
            disabled={submitting}
          />

          {/* Consent */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                disabled={submitting}
                className="mt-0.5 w-5 h-5 min-w-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t('consentText')}
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <div className="mt-6 flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={!signatureData || !consentGiven || submitting}
              className="flex-1"
            >
              {generatingPdf ? t('generatingPdf') : submitting ? t('submitting') : t('submitSignature')}
            </Button>
          </div>
        </Card>

        {/* Legal Notice */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 px-4">
          <p>
            {t('legalNotice')}
          </p>
        </div>
      </div>

      {/* Hidden PDF Generator */}
      <div className="fixed -left-[9999px] -top-[9999px]">
        <InvoicePreview 
          ref={pdfRef} 
          factura={{
            id: (data.factura || data.proforma)?.id || '',
            numero: (data.factura || data.proforma)?.numero || '',
            serie: (data.factura || data.proforma)?.serie || '',
            cliente: (data.factura || data.proforma)?.cliente || {} as any,
            fechaEmision: (data.factura || data.proforma)?.fechaEmision || '',
            fechaVencimiento: (data.factura || data.proforma)?.fechaEmision || '', // Use same date if not provided
            estado: 'EMITIDA',
            montoPendiente: 0,
            descuento: 0,
            subtotal: (data.factura || data.proforma)?.subtotal || 0,
            igv: (data.factura || data.proforma)?.igv || 0,
            total: (data.factura || data.proforma)?.total || 0,
            observaciones: undefined,
            detalles: (data.factura || data.proforma)?.detalles || [],
            signatureRequest: {
              signature: {
                signatureImageUrl: signatureData || '',
                signerName: data.signerName || data.signerEmail,
                signedAt: new Date().toISOString()
              }
            }
          } as any}
          empresa={{
            ...data.empresa,
            id: '',
            ruc: ''
          } as any}
        />
      </div>
    </div>
  );
}
