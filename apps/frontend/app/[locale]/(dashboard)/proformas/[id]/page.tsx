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
  Camera,
  Users,
  Package,
  Briefcase,
  HardHat,
  DollarSign,
  Calendar,
  Receipt,
  Edit2,
  MessageSquare,
  MapPin,
  CreditCard
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  Button,
  Card,
  Badge,
  SkeletonDetailPage,
  ConfirmDialog,
  Modal,
  DatePicker,
} from '@/components/common';
import {
  ProformaPrintPreviewModal,
  ProformaSendEmailModal,
  ProformaPreview,
} from '@/components/proforma';
import { JobPhotosGallery } from '@/components/job';
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

interface JobPhoto {
  id: string;
  url: string;
  descripcion?: string;
  fecha: string;
  orden: number;
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
  facturasGeneradas?: Array<{
    id: string;
    serie: string;
    numero: number;
    estado: string;
  }>;
}

export default function ProformaDetailPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  const t = useTranslations('quotes');
  const tCommon = useTranslations('common');
  const tJobSummary = useTranslations('jobSummary');
  const router = useRouter();
  const { empresa } = useAuth();
  const { formatCurrency } = useCurrency();
  const { showSuccess, showError } = useToast();

  const [proforma, setProforma] = useState<Proforma | null>(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [showPhotosGallery, setShowPhotosGallery] = useState(false);
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
  const [isEditObservationsOpen, setIsEditObservationsOpen] = useState(false);
  const [editingObservations, setEditingObservations] = useState(false);
  const [observacionesEdit, setObservacionesEdit] = useState('');
  const [isEditDatesOpen, setIsEditDatesOpen] = useState(false);
  const [editingDates, setEditingDates] = useState(false);
  const [fechaEmisionEdit, setFechaEmisionEdit] = useState<Date | null>(null);
  const [fechaValidezEdit, setFechaValidezEdit] = useState<Date | null>(null);
  const [isEditJobInfoOpen, setIsEditJobInfoOpen] = useState(false);
  const [editingJobInfo, setEditingJobInfo] = useState(false);
  const [jobInfoEdit, setJobInfoEdit] = useState({ jobName: '', jobLocation: '', workDescription: '', telefonoTrabajo: '' });
  const [isEditPaymentTermsOpen, setIsEditPaymentTermsOpen] = useState(false);
  const [editingPaymentTerms, setEditingPaymentTerms] = useState(false);
  const [paymentTermsEdit, setPaymentTermsEdit] = useState('');
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProforma();
    loadPhotos();
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

  const loadPhotos = async () => {
    try {
      const response = await api.get(`/job-photos/proforma/${id}`);
      setPhotos((response as any).data || response || []);
    } catch (error) {
      console.error('Error loading photos:', error);
      setPhotos([]);
    }
  };

  const handleDirectDownloadPDF = async () => {
    if (!pdfRef.current || !proforma) return;

    try {
      setDownloadingPdf(true);
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
      showError(error.response?.data?.error || 'Failed to request signature');
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
      
      showSuccess('Email sent successfully!');
    } catch (error: any) {
      console.error('Error sending email:', error);
      showError(error.response?.data?.error || 'Failed to send email');
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
  
  const handleOpenEditDates = () => {
    if (!proforma) return;
    setFechaEmisionEdit(new Date(proforma.fechaEmision));
    setFechaValidezEdit(new Date(proforma.fechaValidez));
    setIsEditDatesOpen(true);
  };

  const handleSaveDates = async () => {
    if (!proforma || !fechaEmisionEdit || !fechaValidezEdit) return;

    if (fechaEmisionEdit > fechaValidezEdit) {
      showError('Valid until date must be after issue date');
      return;
    }

    try {
      setEditingDates(true);
      await api.put(`/proformas/${proforma.id}/dates`, {
        fechaEmision: fechaEmisionEdit.toISOString(),
        fechaValidez: fechaValidezEdit.toISOString(),
      });
      
      showSuccess(t('updateSuccess') || 'Dates updated successfully');
      setIsEditDatesOpen(false);
      loadProforma();
    } catch (error: any) {
      console.error('Error updating dates:', error);
      showError(error.response?.data?.error || 'Failed to update dates');
    } finally {
      setEditingDates(false);
    }
  };

  const handleOpenEditObservations = () => {
    if (!proforma) return;
    setObservacionesEdit(proforma.observaciones || '');
    setIsEditObservationsOpen(true);
  };

  const handleSaveObservations = async () => {
    if (!proforma) return;

    try {
      setEditingObservations(true);
      await api.put(`/proformas/${proforma.id}/observations`, {
        observaciones: observacionesEdit,
      });
      
      showSuccess(t('updateSuccess') || 'Observations updated successfully');
      setIsEditObservationsOpen(false);
      loadProforma();
    } catch (error: any) {
      console.error('Error updating observations:', error);
      showError(error.response?.data?.error || 'Failed to update observations');
    } finally {
      setEditingObservations(false);
    }
  };

  const handleOpenEditJobInfo = () => {
    if (!proforma) return;
    setJobInfoEdit({
      jobName: proforma.jobName || '',
      jobLocation: proforma.jobLocation || '',
      workDescription: proforma.workDescription || '',
      telefonoTrabajo: proforma.telefonoTrabajo || ''
    });
    setIsEditJobInfoOpen(true);
  };

  const handleSaveJobInfo = async () => {
    if (!proforma) return;

    try {
      setEditingJobInfo(true);
      await api.put(`/proformas/${proforma.id}/job-info`, jobInfoEdit);
      
      showSuccess(t('updateSuccess') || 'Job information updated successfully');
      setIsEditJobInfoOpen(false);
      loadProforma();
    } catch (error: any) {
      console.error('Error updating job info:', error);
      showError(error.response?.data?.error || 'Failed to update job information');
    } finally {
      setEditingJobInfo(false);
    }
  };

  const handleOpenEditPaymentTerms = () => {
    if (!proforma) return;
    setPaymentTermsEdit(proforma.paymentTerms || '');
    setIsEditPaymentTermsOpen(true);
  };

  const handleSavePaymentTerms = async () => {
    if (!proforma) return;

    try {
      setEditingPaymentTerms(true);
      await api.put(`/proformas/${proforma.id}/payment-terms`, {
        paymentTerms: paymentTermsEdit,
      });
      
      showSuccess(t('updateSuccess') || 'Payment terms updated successfully');
      setIsEditPaymentTermsOpen(false);
      loadProforma();
    } catch (error: any) {
      console.error('Error updating payment terms:', error);
      showError(error.response?.data?.error || 'Failed to update payment terms');
    } finally {
      setEditingPaymentTerms(false);
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
    return <SkeletonDetailPage />;
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
            onClick={() => router.push(`/${locale}/proformas`)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{tJobSummary('proposal')}</span>
            </div>
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
              {proforma.signatureStatus === 'SIGNED' && (
                <Badge variant="success">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {t('signed')}
                </Badge>
              )}
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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowPhotosGallery(true)}
          >
            <Camera className="w-4 h-4 mr-1" />
            {t('jobPhotos')} ({photos.length})
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
                ? t('requestingSignature') 
                : proforma.signatureStatus === 'PENDING' 
                  ? t('resendSignature')
                  : t('requestSignature')
              }
            </Button>
          )}
          {/* {canConvert && (
            <Button size="sm" onClick={() => setIsConvertDialogOpen(true)}>
              <FileText className="w-4 h-4 mr-1" />
              {t('convertToInvoice')}
            </Button>
          )} */}
          {proforma.estado === 'facturada' && proforma.facturasGeneradas && proforma.facturasGeneradas.length > 0 && (
            <Button size="sm" onClick={() => router.push(`/${locale}/facturas/${proforma.facturasGeneradas![0].id}`)}>
              <FileText className="w-4 h-4 mr-1" />
              {t('viewInvoice')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client info */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  {t('jobInformation')}
                </h2>
                {proforma.estado !== 'facturada' && proforma.estado !== 'convertida' && (
                  <button
                    onClick={handleOpenEditJobInfo}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    title="Edit job information"
                  >
                    <Edit2 className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>
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
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <HardHat className="w-5 h-5" />
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
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  {t('paymentTerms')}
                </h2>
                {proforma.estado !== 'facturada' && proforma.estado !== 'convertida' && (
                  <button
                    onClick={handleOpenEditPaymentTerms}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    title="Edit payment terms"
                  >
                    <Edit2 className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{proforma.paymentTerms}</p>
            </Card>
          )}

          {/* Conditions */}
          {proforma.condiciones && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t('conditions')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{proforma.condiciones}</p>
            </Card>
          )}

          {/* Observations */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t('observations')}
              </h2>
              {proforma.estado !== 'INVOICED' && proforma.estado !== 'CANCELLED' && (
                <button
                  onClick={handleOpenEditObservations}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                  title="Edit observations"
                >
                  <Edit2 className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>
            {proforma.observaciones ? (
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{proforma.observaciones}</p>
            ) : (
              <p className="text-gray-400 dark:text-gray-500 italic text-sm">
                {t('observationsPlaceholder') || 'No observations'}
              </p>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {t('dates')}
              </h2>
              {proforma.estado !== 'facturada' && proforma.estado !== 'convertida' && (
                <button
                  onClick={handleOpenEditDates}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                  title="Edit dates"
                >
                  <Edit2 className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>
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
          title={signatureRequestModal.emailSent ? t('signatureRequestSent') : t('requestSignature')}
          subtitle={signatureRequestModal.emailSent ? 'Signature request has been sent successfully' : 'Get this proposal signed digitally'}
          icon={PenLine}
          iconColor={signatureRequestModal.emailSent ? 'success' : 'primary'}
          size="lg"
        >
          <div className="text-center">
            {/* Success Icon - Only show if email sent */}
            {signatureRequestModal.emailSent && (
              <>
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/20 mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                {/* Email Info */}
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  {t('emailSentTo')} <span className="font-medium text-gray-900 dark:text-gray-100">{signatureRequestModal.email}</span>
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
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('signNow')}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('openSignaturePanel')}</p>
                  </div>
                </div>
                <Button
                  onClick={() => window.open(signatureRequestModal.signingUrl, '_blank')}
                  className="w-full"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {t('openSignaturePanelButton')}
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
                  <span className="bg-white dark:bg-gray-800 px-3 text-gray-500 dark:text-gray-400">{t('orSendToClient')}</span>
                </div>
              </div>
            )}

            {/* URL Box */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 text-left">
                {t('signingUrl')}
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
                      {t('copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      {t('copyLink')}
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
                  {t('share')}
                </Button>
              </div>
            </div>

            {/* Info Message */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-left">
              <div className="flex gap-3">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <p className="font-medium mb-1">{t('signatureOptions')}</p>
                  <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                    <li>• {t('signNowOption')}</li>
                    <li>• {t('sendToClientOption')}</li>
                    <li>• {t('linkExpiresIn')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Dates Modal */}
      <Modal
        isOpen={isEditDatesOpen}
        onClose={() => !editingDates && setIsEditDatesOpen(false)}
        title={t('dates')}
        subtitle="Update proposal issue and validity dates"
        icon={Calendar}
        size="md"
      >
        <div className="space-y-5">
          {/* Date Fields */}
          <div className="bg-gradient-to-br from-gray-50 to-slate-50/50 dark:from-gray-800/50 dark:to-slate-800/30 rounded-xl p-5 border border-gray-100 dark:border-gray-800">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t('issueDate')}
                </label>
                <DatePicker
                  value={fechaEmisionEdit}
                  onChange={(date) => setFechaEmisionEdit(date)}
                  disabled={editingDates}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t('validUntil')}
                </label>
                <DatePicker
                  value={fechaValidezEdit}
                  onChange={(date) => setFechaValidezEdit(date)}
                  disabled={editingDates}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsEditDatesOpen(false)}
              disabled={editingDates}
              className="flex-1 h-11"
            >
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleSaveDates}
              disabled={editingDates || !fechaEmisionEdit || !fechaValidezEdit}
              className="flex-1 h-11 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black"
            >
              {editingDates ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {tCommon('saving')}
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  {tCommon('save')}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Job Information Modal */}
      <Modal
        isOpen={isEditJobInfoOpen}
        onClose={() => !editingJobInfo && setIsEditJobInfoOpen(false)}
        title={t('jobInformation')}
        subtitle="Update job details and work description"
        icon={Briefcase}
        size="md"
      >
        <div className="space-y-5">
          {/* Job Fields */}
          <div className="bg-gradient-to-br from-gray-50 to-slate-50/50 dark:from-gray-800/50 dark:to-slate-800/30 rounded-xl p-5 border border-gray-100 dark:border-gray-800">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t('jobName')}
                </label>
                <input
                  type="text"
                  value={jobInfoEdit.jobName}
                  onChange={(e) => setJobInfoEdit({ ...jobInfoEdit, jobName: e.target.value })}
                  disabled={editingJobInfo}
                  placeholder={t('jobName')}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-600 focus:border-transparent transition-all placeholder:text-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t('jobLocation')}
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={jobInfoEdit.jobLocation}
                    onChange={(e) => setJobInfoEdit({ ...jobInfoEdit, jobLocation: e.target.value })}
                    disabled={editingJobInfo}
                    placeholder={t('jobLocation')}
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-600 focus:border-transparent transition-all placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t('jobPhone')}
                </label>
                <input
                  type="text"
                  value={jobInfoEdit.telefonoTrabajo}
                  onChange={(e) => setJobInfoEdit({ ...jobInfoEdit, telefonoTrabajo: e.target.value })}
                  disabled={editingJobInfo}
                  placeholder={t('jobPhone')}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-600 focus:border-transparent transition-all placeholder:text-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t('workDescription')}
                </label>
                <textarea
                  value={jobInfoEdit.workDescription}
                  onChange={(e) => setJobInfoEdit({ ...jobInfoEdit, workDescription: e.target.value })}
                  disabled={editingJobInfo}
                  placeholder={t('workDescription')}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-600 focus:border-transparent resize-none transition-all placeholder:text-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsEditJobInfoOpen(false)}
              disabled={editingJobInfo}
              className="flex-1 h-11"
            >
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleSaveJobInfo}
              disabled={editingJobInfo}
              className="flex-1 h-11 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black"
            >
              {editingJobInfo ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {tCommon('saving')}
                </>
              ) : (
                <>
                  <Briefcase className="w-4 h-4 mr-2" />
                  {tCommon('save')}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Payment Terms Modal */}
      <Modal
        isOpen={isEditPaymentTermsOpen}
        onClose={() => !editingPaymentTerms && setIsEditPaymentTermsOpen(false)}
        title={t('paymentTerms')}
        subtitle="Define payment conditions and schedule"
        icon={CreditCard}
        size="md"
      >
        <div className="space-y-5">
          {/* Textarea Field */}
          <div className="bg-gradient-to-br from-gray-50 to-slate-50/50 dark:from-gray-800/50 dark:to-slate-800/30 rounded-xl p-5 border border-gray-100 dark:border-gray-800">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('paymentTerms')}
            </label>
            <textarea
              value={paymentTermsEdit}
              onChange={(e) => setPaymentTermsEdit(e.target.value)}
              disabled={editingPaymentTerms}
              placeholder={t('paymentTerms')}
              rows={6}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-600 focus:border-transparent resize-none transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsEditPaymentTermsOpen(false)}
              disabled={editingPaymentTerms}
              className="flex-1 h-11"
            >
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleSavePaymentTerms}
              disabled={editingPaymentTerms}
              className="flex-1 h-11 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black"
            >
              {editingPaymentTerms ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {tCommon('saving')}
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  {tCommon('save')}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Observations Modal */}
      <Modal
        isOpen={isEditObservationsOpen}
        onClose={() => !editingObservations && setIsEditObservationsOpen(false)}
        title={t('observations')}
        subtitle="Add notes or special instructions"
        icon={MessageSquare}
        size="md"
      >
        <div className="space-y-5">
          {/* Textarea Field */}
          <div className="bg-gradient-to-br from-gray-50 to-slate-50/50 dark:from-gray-800/50 dark:to-slate-800/30 rounded-xl p-5 border border-gray-100 dark:border-gray-800">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('observations')}
            </label>
            <textarea
              value={observacionesEdit}
              onChange={(e) => setObservacionesEdit(e.target.value)}
              disabled={editingObservations}
              placeholder={t('observationsPlaceholder')}
              rows={5}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-600 focus:border-transparent resize-none transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsEditObservationsOpen(false)}
              disabled={editingObservations}
              className="flex-1 h-11"
            >
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleSaveObservations}
              disabled={editingObservations}
              className="flex-1 h-11 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black"
            >
              {editingObservations ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {tCommon('saving')}
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {tCommon('save')}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

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

      {/* Photos Gallery Modal */}
      {showPhotosGallery && (
        <Modal 
          isOpen={showPhotosGallery} 
          onClose={() => setShowPhotosGallery(false)}
          title={t('jobPhotos')}
          subtitle="View and manage photos for this job"
          icon={Camera}
          size="full"
        >
          <JobPhotosGallery
            proformaId={id}
            photos={photos}
            onPhotosChange={loadPhotos}
            clientInfo={{
              razonSocial: proforma.cliente.razonSocial,
              numeroDocumento: proforma.cliente.numeroDocumento,
              direccion: proforma.cliente.direccion,
              email: proforma.cliente.email,
            }}
            invoiceInfo={{
              numero: proforma.numero,
              serie: proforma.serie,
              fechaEmision: proforma.fechaEmision,
            }}
            onClose={() => setShowPhotosGallery(false)}
          />
        </Modal>
      )}

      {/* Hidden PDF Generator */}
      <div className="fixed -left-[9999px] -top-[9999px]">
        <ProformaPreview ref={pdfRef} proforma={proforma} empresa={empresa} />
      </div>
    </div>
  );
}
