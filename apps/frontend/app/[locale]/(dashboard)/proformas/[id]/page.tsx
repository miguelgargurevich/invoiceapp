'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Printer,
  Download,
  Mail,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  PenLine,
  Copy,
  Send,
  ExternalLink,
  Share2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Button,
  Card,
  Badge,
  LoadingPage,
  ConfirmDialog,
  Modal,
} from '@/components/common';
import {
  ProformaPrintPreviewModal,
  ProformaSendEmailModal,
  ProformaPreview,
} from '@/components/proforma';
import { formatDate } from '@/lib/utils';
import { useCurrency } from '@/lib/hooks/useCurrency';
import api from '@/lib/api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface DetalleProforma {
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
}

interface Proforma {
  id: string;
  numero: string;
  serie: string;
  cliente: {
    id: string;
    razonSocial: string;
    numeroDocumento: string;
    tipoDocumento: string;
    direccion?: string;
    email?: string;
  };
  fechaEmision: string;
  fechaValidez: string;
  subtotal: number;
  igv: number;
  total: number;
  descuento: number;
  estado: string;
  observaciones?: string;
  condiciones?: string;
  // Contractor proposal fields
  jobName?: string;
  jobLocation?: string;
  workDescription?: string;
  paymentTerms?: string;
  arquitectoNombre?: string;
  fechaPlanos?: string;
  telefonoTrabajo?: string;
  diasValidez?: number;
  detalles: DetalleProforma[];
  signatureStatus?: 'PENDING' | 'SIGNED' | 'EXPIRED' | 'CANCELLED' | null;
  signatureRequest?: any;
}

export default function ProformaDetailPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  const t = useTranslations('quotes');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { empresa } = useAuth();
  const { formatCurrency } = useCurrency();

  const [proforma, setProforma] = useState<Proforma | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [isSendEmailOpen, setIsSendEmailOpen] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [converting, setConverting] = useState(false);
  const [requestingSignature, setRequestingSignature] = useState(false);
  const [signatureRequestModal, setSignatureRequestModal] = useState<{
    isOpen: boolean;
    signingUrl: string;
    email: string;
    emailSent: boolean;
  }>({ isOpen: false, signingUrl: '', email: '', emailSent: false });
  const [urlCopied, setUrlCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProforma();
  }, [id]);

  const loadProforma = async () => {
    try {
      setLoading(true);
      const response: any = await api.get(`/proformas/${id}`);
      
      // Map API response to our interface
      const data = response.data || response;
      setProforma({
        ...data,
        cliente: {
          id: data.cliente?.id,
          razonSocial: data.cliente?.razonSocial || data.cliente?.nombreComercial || data.cliente?.nombre,
          numeroDocumento: data.cliente?.numeroDocumento || data.cliente?.documento,
          tipoDocumento: data.cliente?.tipoDocumento || 'RUC',
          direccion: data.cliente?.direccion,
          email: data.cliente?.email,
        },
        fechaValidez: data.fechaValidez || data.fechaVencimiento,
      });
    } catch (error) {
      console.error('Error loading proforma:', error);
      // Mock data for development
      setProforma({
        id: '1',
        numero: '000042',
        serie: 'P001',
        cliente: {
          id: '1',
          razonSocial: 'Empresa Demo S.A.C.',
          numeroDocumento: '20123456789',
          tipoDocumento: 'RUC',
          direccion: 'Av. Principal 123, Lima',
          email: 'contacto@empresademo.com',
        },
        fechaEmision: new Date().toISOString(),
        fechaValidez: new Date(Date.now() + 30 * 86400000).toISOString(),
        subtotal: 1694.92,
        igv: 305.08,
        total: 2000.00,
        descuento: 0,
        estado: 'pendiente',
        observaciones: 'Cotización por servicios de consultoría',
        condiciones: 'Pago a 30 días después de la aprobación.\nPrecios válidos por 30 días.',
        detalles: [
          {
            id: '1',
            descripcion: 'Servicio de Consultoría - Fase 1',
            cantidad: 8,
            precioUnitario: 150.00,
            descuento: 0,
            subtotal: 1016.95,
            igv: 183.05,
            total: 1200.00,
            producto: { codigo: 'CONS001', nombre: 'Consultoría' },
          },
          {
            id: '2',
            descripcion: 'Capacitación al Personal',
            cantidad: 4,
            precioUnitario: 200.00,
            descuento: 0,
            subtotal: 677.97,
            igv: 122.03,
            total: 800.00,
            producto: { codigo: 'CAP001', nombre: 'Capacitación' },
          },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDirectDownloadPDF = async () => {
    if (!pdfRef.current || !proforma) return;

    try {
      setDownloadingPdf(true);
      // Wait for fonts to load
      await document.fonts.ready;
      
      const canvas = await html2canvas(pdfRef.current, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: pdfRef.current.scrollWidth,
        windowHeight: pdfRef.current.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
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
        'PNG',
        imgX,
        imgY,
        imgWidth * ratio,
        imgHeight * ratio
      );

      pdf.save(`Proforma-${proforma.serie}-${proforma.numero}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setDownloadingPdf(false);
    }
  };
  const handleRequestSignature = async () => {
    if (!proforma) return;

    try {
      setRequestingSignature(true);
      
      let token;
      
      // If signature is already pending, reuse existing token
      if (proforma.signatureStatus === 'PENDING' && proforma.signatureRequest?.token) {
        token = proforma.signatureRequest.token;
      } else {
        // Create new signature request
        // Use placeholder email if client doesn't have one
        const signerEmail = proforma.cliente.email || 'no-email@placeholder.com';
        
        const response: any = await api.post('/signatures/request', {
          documentType: 'PROFORMA',
          documentId: proforma.id,
          signerEmail: signerEmail,
          signerName: proforma.cliente.razonSocial,
          sendEmail: false, // Don't send email yet
        });
        token = response.token;
      }

      // Show modal with signing URL (email not sent yet)
      const signingUrl = `${window.location.origin}/${locale}/sign/${token}`;
      setSignatureRequestModal({
        isOpen: true,
        signingUrl,
        email: proforma.cliente.email || '',
        emailSent: false
      });
      
      // Reload to show signature status
      if (proforma.signatureStatus !== 'PENDING') {
        loadProforma();
      }
    } catch (error: any) {
      console.error('Error requesting signature:', error);
      alert(error.response?.data?.error || 'Failed to request signature');
    } finally {
      setRequestingSignature(false);
    }
  };

  const handleSendSignatureEmail = async () => {
    if (!proforma || !signatureRequestModal.signingUrl) return;

    try {
      setSendingEmail(true);
      
      // Extract token from URL
      const token = signatureRequestModal.signingUrl.split('/').pop();
      
      await api.post(`/signatures/${token}/send-email`, {
        signerEmail: proforma.cliente.email || '',
        signerName: proforma.cliente.razonSocial,
      });

      // Update modal to show email sent
      setSignatureRequestModal(prev => ({
        ...prev,
        emailSent: true
      }));
      
      alert('Email sent successfully!');
    } catch (error: any) {
      console.error('Error sending email:', error);
      alert(error.response?.data?.error || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleShareLink = async () => {
    try {
      const shareData = {
        title: `Signature Request - Proposal ${proforma?.serie}-${proforma?.numero}`,
        text: `Please sign this proposal for ${proforma?.cliente.razonSocial}`,
        url: signatureRequestModal.signingUrl,
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(signatureRequestModal.signingUrl);
        setUrlCopied(true);
        setTimeout(() => setUrlCopied(false), 2000);
      }
    } catch (error: any) {
      // User cancelled or error occurred
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
    }
  };
  const handleConvertToInvoice = async () => {
    if (!proforma) return;

    try {
      setConverting(true);
      const response: any = await api.post(`/proformas/${proforma.id}/convertir-factura`);
      setIsConvertDialogOpen(false);
      router.push(`/${locale}/facturas/${response.factura?.id || response.data?.factura?.id}`);
    } catch (error) {
      console.error('Error converting to invoice:', error);
    } finally {
      setConverting(false);
    }
  };

  const handleDelete = async () => {
    if (!proforma) return;

    try {
      await api.delete(`/proformas/${proforma.id}`);
      setIsDeleteDialogOpen(false);
      router.push(`/${locale}/proformas`);
    } catch (error) {
      console.error('Error deleting proforma:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; icon: React.ReactNode }> = {
      aprobada: { variant: 'success', icon: <CheckCircle className="w-4 h-4" /> },
      pendiente: { variant: 'warning', icon: <Clock className="w-4 h-4" /> },
      rechazada: { variant: 'danger', icon: <XCircle className="w-4 h-4" /> },
      convertida: { variant: 'info', icon: <FileText className="w-4 h-4" /> },
      facturada: { variant: 'info', icon: <FileText className="w-4 h-4" /> },
      vencida: { variant: 'neutral', icon: <AlertTriangle className="w-4 h-4" /> },
    };
    return config[status] || { variant: 'neutral' as const, icon: null };
  };

  if (loading) {
    return <LoadingPage />;
  }

  if (!proforma) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('notFound')}</p>
        <Button className="mt-4" onClick={() => router.back()}>
          {tCommon('back')}
        </Button>
      </div>
    );
  }

  const statusConfig = getStatusBadge(proforma.estado);
  const canConvert = proforma.estado === 'pendiente' || proforma.estado === 'aprobada';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {proforma.serie}-{proforma.numero}
              </h1>
              <Badge variant={statusConfig.variant}>
                <span className="flex items-center gap-1">
                  {statusConfig.icon}
                  {t(`statuses.${proforma.estado}`)}
                </span>
              </Badge>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {t('issuedOn', { date: formatDate(proforma.fechaEmision) })}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsPrintPreviewOpen(true)}>
            <Printer className="w-4 h-4 mr-1" />
            {t('print')}
          </Button>
          {proforma.estado !== 'ANULADA' && proforma.signatureStatus !== 'SIGNED' && (
            <Button 
              size="sm" 
              onClick={handleRequestSignature}
              disabled={requestingSignature}
              variant="outline"
            >
              <PenLine className="w-4 h-4 mr-1" />
              {requestingSignature 
                ? t('requesting...') 
                : proforma.signatureStatus === 'PENDING' 
                  ? t('resendSignature')
                  : t('requestSignature')
              }
            </Button>
          )}
          {canConvert && (
            <Button size="sm" onClick={() => setIsConvertDialogOpen(true)}>
              <FileText className="w-4 h-4 mr-1" />
              {t('convertToInvoice')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client info */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('client')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('client')}</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {proforma.cliente.razonSocial}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('document')}</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {proforma.cliente.numeroDocumento ? (
                    proforma.cliente.tipoDocumento !== 'OTHER'
                      ? `${proforma.cliente.tipoDocumento}: ${proforma.cliente.numeroDocumento}`
                      : proforma.cliente.numeroDocumento
                  ) : '-'}
                </p>
              </div>
              {proforma.cliente.direccion && (
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('address')}</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {proforma.cliente.direccion}
                  </p>
                </div>
              )}
              {proforma.cliente.email && (
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Email</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {proforma.cliente.email}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Line items */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('items')}
            </h2>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 text-xs font-medium text-gray-500 uppercase">
                      {t('product')}
                    </th>
                    <th className="text-center py-3 text-xs font-medium text-gray-500 uppercase w-20">
                      {t('qty')}
                    </th>
                    <th className="text-right py-3 text-xs font-medium text-gray-500 uppercase w-28">
                      {t('price')}
                    </th>
                    <th className="text-right py-3 text-xs font-medium text-gray-500 uppercase w-28">
                      {t('subtotal')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {proforma.detalles.map((detalle) => (
                    <tr key={detalle.id}>
                      <td className="py-3">
                        <div>
                          {detalle.producto && (
                            <span className="text-xs text-gray-500 block">
                              {detalle.producto.codigo}
                            </span>
                          )}
                          <span className="text-gray-900 dark:text-gray-100">
                            {detalle.descripcion}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-center text-gray-600 dark:text-gray-400">
                        {detalle.cantidad}
                      </td>
                      <td className="py-3 text-right text-gray-600 dark:text-gray-400">
                        {formatCurrency(detalle.precioUnitario)}
                      </td>
                      <td className="py-3 text-right font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(detalle.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {proforma.detalles.map((detalle) => (
                <div
                  key={detalle.id}
                  className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3"
                >
                  <div className="flex justify-between mb-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {detalle.descripcion}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>{detalle.cantidad} x {formatCurrency(detalle.precioUnitario)}</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(detalle.subtotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Job Information */}
          {(proforma.jobName || proforma.jobLocation || proforma.workDescription || proforma.telefonoTrabajo) && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('jobInformation')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {proforma.jobName && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('jobName')}</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {proforma.jobName}
                    </p>
                  </div>
                )}
                {proforma.jobLocation && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('jobLocation')}</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {proforma.jobLocation}
                    </p>
                  </div>
                )}
                {proforma.telefonoTrabajo && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('jobPhone')}</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {proforma.telefonoTrabajo}
                    </p>
                  </div>
                )}
              </div>
              {proforma.workDescription && (
                <div className="mt-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('workDescription')}</span>
                  <p className="mt-1 text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {proforma.workDescription}
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* Contractor Details */}
          {(proforma.arquitectoNombre || proforma.fechaPlanos) && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('contractorDetails')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {proforma.arquitectoNombre && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('architectName')}</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {proforma.arquitectoNombre}
                    </p>
                  </div>
                )}
                {proforma.fechaPlanos && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('plansDate')}</span>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {formatDate(proforma.fechaPlanos)}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Payment Terms */}
          {proforma.paymentTerms && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('paymentTerms')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{proforma.paymentTerms}</p>
            </Card>
          )}

          {/* Conditions */}
          {proforma.condiciones && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('conditions')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{proforma.condiciones}</p>
            </Card>
          )}

          {/* Observations */}
          {proforma.observaciones && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('observations')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">{proforma.observaciones}</p>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('totals')}
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('subtotal')}</span>
                <span>{formatCurrency(proforma.subtotal)}</span>
              </div>
              {proforma.descuento > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('discount')}</span>
                  <span className="text-red-500">-{formatCurrency(proforma.descuento)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('tax')}</span>
                <span>{formatCurrency(proforma.igv)}</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold">{t('total')}</span>
                  <span className="text-xl font-bold text-primary-600">
                    {formatCurrency(proforma.total)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Dates */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('dates')}
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('issueDate')}</span>
                <span>{formatDate(proforma.fechaEmision)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('validUntil')}</span>
                <span>{formatDate(proforma.fechaValidez)}</span>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <Card className="!p-4">
            <div className="space-y-2">
              {canConvert && (
                <Button
                  className="w-full"
                  onClick={() => setIsConvertDialogOpen(true)}
                  disabled={converting}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {converting ? tCommon('loading') : t('convertToInvoice')}
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <XCircle className="w-4 h-4 mr-2" />
                {tCommon('delete')}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Print Preview Modal */}
      <ProformaPrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        proforma={proforma}
        empresa={empresa}
      />

      {/* Send Email Modal */}
      <ProformaSendEmailModal
        isOpen={isSendEmailOpen}
        onClose={() => setIsSendEmailOpen(false)}
        proforma={proforma}
      />

      {/* Signature Request Modal */}
      {signatureRequestModal.isOpen && (
        <Modal
          isOpen={signatureRequestModal.isOpen}
          onClose={() => {
            setSignatureRequestModal({ isOpen: false, signingUrl: '', email: '', emailSent: false });
            setUrlCopied(false);
          }}
          title={signatureRequestModal.emailSent ? "Signature Request Sent!" : "Request Signature"}
          size="lg"
        >
          <div className="text-center">
            {/* Success Icon - Only show if email sent */}
            {signatureRequestModal.emailSent && (
              <>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                {/* Email Info */}
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Email sent to <span className="font-medium text-gray-900 dark:text-gray-100">{signatureRequestModal.email}</span>
                </p>
              </>
            )}

            {/* Sign Now Option - Prominent */}
            {!signatureRequestModal.emailSent && (
              <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4 mb-4 border-2 border-primary-200 dark:border-primary-700">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary-100 dark:bg-primary-800 rounded-lg">
                    <PenLine className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Sign Now</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Open signature panel on this device (iPad, tablet, etc.)</p>
                  </div>
                </div>
                <Button
                  onClick={() => window.open(signatureRequestModal.signingUrl, '_blank')}
                  className="w-full"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Signature Panel
                </Button>
              </div>
            )}

            {/* Divider */}
            {!signatureRequestModal.emailSent && (
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white dark:bg-gray-800 px-3 text-gray-500 dark:text-gray-400">or send to client</span>
                </div>
              </div>
            )}

            {/* URL Box */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 text-left">
                Signing URL
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  readOnly
                  value={signatureRequestModal.signingUrl}
                  className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 font-mono"
                  onClick={(e) => e.currentTarget.select()}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(signatureRequestModal.signingUrl);
                    setUrlCopied(true);
                    setTimeout(() => setUrlCopied(false), 2000);
                  }}
                  className="flex-1"
                >
                  {urlCopied ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy Link
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareLink}
                  className="flex-1"
                >
                  <Share2 className="w-4 h-4 mr-1" />
                  Share
                </Button>
              </div>
            </div>

            {/* Info Message */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-left">
              <div className="flex gap-3">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <p className="font-medium mb-1">Signature options:</p>
                  <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                    <li>• <strong>Sign Now:</strong> Open the signature panel on your current device</li>
                    <li>• <strong>Send to client:</strong> Email the link or share via messaging apps</li>
                    <li>• The link expires in 7 days</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Convert to Invoice Confirmation */}
      <ConfirmDialog
        isOpen={isConvertDialogOpen}
        onClose={() => setIsConvertDialogOpen(false)}
        onConfirm={handleConvertToInvoice}
        title={t('convertToInvoice')}
        message={t('messages.confirmConvert')}
        confirmLabel={t('convertToInvoice')}
        variant="info"
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title={tCommon('delete')}
        message={t('messages.confirmDelete')}
        confirmLabel={tCommon('delete')}
        variant="danger"
      />

      {/* Hidden PDF Generator */}
      <div className="fixed -left-[9999px] -top-[9999px]">
        <ProformaPreview ref={pdfRef} proforma={proforma} empresa={empresa} />
      </div>
    </div>
  );
}
