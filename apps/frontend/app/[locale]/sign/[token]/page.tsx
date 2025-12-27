'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CheckCircle, AlertCircle, Clock, FileText, Building2 } from 'lucide-react';
import { Button, Card, LoadingPage } from '@/components/common';
import SignatureCanvas from '@/components/signature/SignatureCanvas';
import { InvoicePreview } from '@/components/invoice';
import api from '@/lib/api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface SignatureRequestData {
  signatureRequest: {
    id: string;
    documentType: string;
    signerEmail: string;
    signerName: string | null;
    expiresAt: string;
  };
  empresa: {
    nombre: string;
    logoUrl: string | null;
    email: string | null;
  };
  document: {
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
}

export default function SignDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('signature');
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
      const response = await api.get(`/signatures/validate/${token}`) as SignatureRequestData;
      setData(response);
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
      alert('Please sign the document and accept the terms');
      return;
    }

    try {
      setSubmitting(true);
      setGeneratingPdf(true);
      
      // Generate PDF with signature
      let signedPdfBase64 = null;
      if (pdfRef.current) {
        const canvas = await html2canvas(pdfRef.current, {
          scale: 1.5, // Reduced from 2 to decrease file size
          useCORS: true,
          logging: false,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.85); // Use JPEG with 85% quality
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
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        const imgY = 0;

        pdf.addImage(
          imgData,
          'JPEG',
          imgX,
          imgY,
          imgWidth * ratio,
          imgHeight * ratio,
          undefined,
          'FAST' // Use fast compression
        );

        // Convert PDF to base64
        signedPdfBase64 = pdf.output('datauristring');
      }
      
      setGeneratingPdf(false);
      
      // Get client info for audit trail
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipResponse.json();

      await api.post('/signatures/submit', {
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
      alert(err.response?.data?.error || 'Failed to submit signature');
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
            Invalid Request
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <Button onClick={() => router.push('/')}>Go to Home</Button>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Document Signed Successfully!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You will receive a confirmation email with the signed document.
          </p>
          <Button onClick={() => router.push('/')}>Done</Button>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const expiresAt = new Date(data.signatureRequest.expiresAt);
  const daysUntilExpiry = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            {data.empresa.logoUrl && (
              <img 
                src={data.empresa.logoUrl} 
                alt={data.empresa.nombre}
                className="w-16 h-16 object-contain"
              />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {data.empresa.nombre}
                </h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                has requested your signature for the following document:
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {data.signatureRequest.documentType === 'INVOICE' ? 'Invoice' : 'Proposal'}{' '}
                  {data.document.serie}-{data.document.numero}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Amount: ${Number(data.document.total).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Date: {new Date(data.document.fechaEmision).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>
              Expires in {daysUntilExpiry} {daysUntilExpiry === 1 ? 'day' : 'days'}
            </span>
          </div>
        </Card>

        {/* Signature Canvas */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Sign Here
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Please sign using your finger (on touch devices) or mouse
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
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                I agree to electronically sign this document and understand that my electronic 
                signature is legally binding and has the same effect as a handwritten signature.
                I consent to conduct this transaction electronically.
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
              {generatingPdf ? 'Generating PDF...' : submitting ? 'Submitting...' : 'Submit Signature'}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </Card>

        {/* Legal Notice */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 px-4">
          <p>
            This electronic signature is compliant with the U.S. Electronic Signatures in Global 
            and National Commerce Act (ESIGN) and the Uniform Electronic Transactions Act (UETA).
          </p>
        </div>
      </div>

      {/* Hidden PDF Generator */}
      <div className="fixed -left-[9999px] -top-[9999px]">
        <InvoicePreview 
          ref={pdfRef} 
          factura={{
            id: data.document.id,
            numero: data.document.numero,
            serie: data.document.serie,
            cliente: data.document.cliente,
            fechaEmision: data.document.fechaEmision,
            fechaVencimiento: data.document.fechaEmision, // Use same date if not provided
            estado: 'EMITIDA',
            montoPendiente: 0,
            descuento: 0,
            subtotal: data.document.subtotal,
            igv: data.document.igv,
            total: data.document.total,
            observaciones: undefined,
            detalles: data.document.detalles || [],
            signatureRequest: {
              signature: {
                signatureImageUrl: signatureData || '',
                signerName: data.signatureRequest.signerName || data.signatureRequest.signerEmail,
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
