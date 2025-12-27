'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Printer,
  Download,
  Mail,
  CreditCard,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  PenLine,
  Copy,
  Send,
  ExternalLink,
  Calendar,
  Edit2,  Share2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  Button,
  Card,
  Badge,
  Modal,
  Input,
  LoadingPage,
  ConfirmDialog,
  DatePicker,
} from '@/components/common';
import { PrintPreviewModal, SendEmailModal, InvoicePreview } from '@/components/invoice';
import { formatDate } from '@/lib/utils';
import { useCurrency } from '@/lib/hooks/useCurrency';
import api from '@/lib/api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface DetalleFactura {
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

interface PagoFactura {
  id: string;
  fecha: string;
  monto: number;
  metodoPago: string;
  referencia?: string;
  notas?: string;
}

interface Factura {
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
  fechaVencimiento: string;
  subtotal: number;
  igv: number;
  total: number;
  descuento: number;
  estado: string;
  montoPendiente: number;
  observaciones?: string;
  detalles: DetalleFactura[];
  pagos: PagoFactura[];
  signatureStatus?: 'PENDING' | 'SIGNED' | 'EXPIRED' | 'CANCELLED' | null;
  signatureRequest?: any;
}

export default function FacturaDetailPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  const t = useTranslations('invoices');
  const router = useRouter();
  const { empresa } = useAuth();
  const { formatCurrency } = useCurrency();
  const { showSuccess, showError, showWarning } = useToast();

  const [factura, setFactura] = useState<Factura | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [isSendEmailOpen, setIsSendEmailOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [requestingSignature, setRequestingSignature] = useState(false);
  const [signatureRequestModal, setSignatureRequestModal] = useState<{
    isOpen: boolean;
    signingUrl: string;
    email: string;
    emailSent: boolean;
  }>({ isOpen: false, signingUrl: '', email: '', emailSent: false });
  const [urlCopied, setUrlCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [isEditDatesOpen, setIsEditDatesOpen] = useState(false);
  const [editingDates, setEditingDates] = useState(false);
  const [fechaEmisionEdit, setFechaEmisionEdit] = useState<Date | null>(null);
  const [fechaVencimientoEdit, setFechaVencimientoEdit] = useState<Date | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const [paymentData, setPaymentData] = useState({
    monto: '',
    metodoPago: 'TRANSFERENCIA',
    referencia: '',
    notas: '',
  });
  const [savingPayment, setSavingPayment] = useState(false);

  useEffect(() => {
    loadFactura();
  }, [id]);

  const loadFactura = async () => {
    try {
      setLoading(true);
      const response: any = await api.get(`/facturas/${id}`);
      setFactura(response);
    } catch (error) {
      console.error('Error loading factura:', error);
      // Mock data for development
      setFactura({
        id: '1',
        numero: '000156',
        serie: 'F001',
        cliente: {
          id: '1',
          razonSocial: 'Empresa ABC S.A.C.',
          numeroDocumento: '20123456789',
          tipoDocumento: 'RUC',
          direccion: 'Av. Principal 123, Lima',
          email: 'contacto@empresaabc.com',
        },
        fechaEmision: new Date().toISOString(),
        fechaVencimiento: new Date(Date.now() + 30 * 86400000).toISOString(),
        subtotal: 2076.27,
        igv: 373.73,
        total: 2450.00,
        descuento: 0,
        estado: 'EMITIDA',
        montoPendiente: 2450.00,
        observaciones: 'Factura por servicios de consultoría',
        detalles: [
          {
            id: '1',
            descripcion: 'Servicio de Consultoría',
            cantidad: 10,
            precioUnitario: 150.00,
            descuento: 0,
            subtotal: 1271.19,
            igv: 228.81,
            total: 1500.00,
            producto: { codigo: 'PROD001', nombre: 'Servicio de Consultoría' },
          },
          {
            id: '2',
            descripcion: 'Capacitación',
            cantidad: 5,
            precioUnitario: 190.00,
            descuento: 0,
            subtotal: 805.08,
            igv: 144.92,
            total: 950.00,
            producto: { codigo: 'PROD003', nombre: 'Capacitación' },
          },
        ],
        pagos: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterPayment = async () => {
    if (!factura || !paymentData.monto) return;

    try {
      setSavingPayment(true);
      await api.post(`/facturas/${factura.id}/pagos`, {
        monto: parseFloat(paymentData.monto),
        metodoPago: paymentData.metodoPago,
        referencia: paymentData.referencia || null,
        notas: paymentData.notas || null,
      });
      
      setIsPaymentModalOpen(false);
      setPaymentData({
        monto: '',
        metodoPago: 'TRANSFERENCIA',
        referencia: '',
        notas: '',
      });
      loadFactura();
    } catch (error) {
      console.error('Error registering payment:', error);
    } finally {
      setSavingPayment(false);
    }
  };

  const handleRequestSignature = async () => {
    if (!factura) return;

    try {
      setRequestingSignature(true);
      
      let token;
      
      // If signature is already pending, reuse existing token
      if (factura.signatureStatus === 'PENDING' && factura.signatureRequest?.token) {
        token = factura.signatureRequest.token;
      } else {
        // Create new signature request
        const response: any = await api.post('/signatures/request', {
          documentType: 'INVOICE',
          documentId: factura.id,
          signerEmail: factura.cliente.email || '',
          signerName: factura.cliente.razonSocial,
          sendEmail: false, // Don't send email yet
        });
        token = response.token;
      }

      // Show modal with signing URL (email not sent yet)
      const signingUrl = `${window.location.origin}/${locale}/sign/${token}`;
      setSignatureRequestModal({
        isOpen: true,
        signingUrl,
        email: factura.cliente.email || '',
        emailSent: false
      });
      
      // Reload to show signature status
      if (factura.signatureStatus !== 'PENDING') {
        loadFactura();
      }
    } catch (error: any) {
      console.error('Error requesting signature:', error);
      showError(error.response?.data?.error || 'Failed to request signature');
    } finally {
      setRequestingSignature(false);
    }
  };

  const handleSendSignatureEmail = async () => {
    if (!factura || !signatureRequestModal.signingUrl) return;

    try {
      setSendingEmail(true);
      
      // Extract token from URL
      const token = signatureRequestModal.signingUrl.split('/').pop();
      
      await api.post(`/signatures/${token}/send-email`, {
        signerEmail: factura.cliente.email || '',
        signerName: factura.cliente.razonSocial,
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
        title: `Signature Request - Invoice ${factura?.serie}-${factura?.numero}`,
        text: `Please sign this invoice for ${factura?.cliente.razonSocial}`,
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
  const handleCancelInvoice = async () => {
    if (!factura) return;

    try {
      await api.put(`/facturas/${factura.id}/anular`);
      setIsCancelDialogOpen(false);
      loadFactura();
    } catch (error) {
      console.error('Error cancelling invoice:', error);
    }
  };

  const handleOpenEditDates = () => {
    if (!factura) return;
    setFechaEmisionEdit(new Date(factura.fechaEmision));
    setFechaVencimientoEdit(new Date(factura.fechaVencimiento));
    setIsEditDatesOpen(true);
  };

  const handleSaveDates = async () => {
    if (!factura || !fechaEmisionEdit || !fechaVencimientoEdit) return;

    if (fechaEmisionEdit > fechaVencimientoEdit) {
      showWarning('Due date must be after issue date');
      return;
    }

    try {
      setEditingDates(true);
      await api.put(`/facturas/${factura.id}/dates`, {
        fechaEmision: fechaEmisionEdit.toISOString(),
        fechaVencimiento: fechaVencimientoEdit.toISOString(),
      });
      
      showSuccess('Dates updated successfully');
      setIsEditDatesOpen(false);
      loadFactura();
    } catch (error: any) {
      console.error('Error updating dates:', error);
      showError(error.response?.data?.error || 'Failed to update dates');
    } finally {
      setEditingDates(false);
    }
  };

  const handleDirectDownloadPDF = async () => {
    if (!pdfRef.current || !factura) return;

    try {
      setDownloadingPdf(true);
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
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

      pdf.save(`Factura-${factura.serie}-${factura.numero}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; icon: React.ReactNode }> = {
      PAGADA: { variant: 'success', icon: <CheckCircle className="w-4 h-4" /> },
      EMITIDA: { variant: 'info', icon: <Clock className="w-4 h-4" /> },
      PENDIENTE: { variant: 'warning', icon: <Clock className="w-4 h-4" /> },
      VENCIDA: { variant: 'danger', icon: <XCircle className="w-4 h-4" /> },
      ANULADA: { variant: 'neutral', icon: <XCircle className="w-4 h-4" /> },
    };
    return config[status] || { variant: 'neutral' as const, icon: null };
  };

  if (loading) {
    return <LoadingPage />;
  }

  if (!factura) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('notFound')}</p>
        <Button className="mt-4" onClick={() => router.back()}>
          {t('goBack')}
        </Button>
      </div>
    );
  }

  const statusConfig = getStatusBadge(factura.estado);

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
                {factura.serie}-{factura.numero}
              </h1>
              <Badge variant={statusConfig.variant}>
                <span className="flex items-center gap-1">
                  {statusConfig.icon}
                  {factura.estado}
                </span>
              </Badge>
              {factura.signatureStatus === 'SIGNED' && (
                <Badge variant="success">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Signed
                </Badge>
              )}
              {factura.signatureStatus === 'PENDING' && (
                <Badge variant="warning">
                  <Clock className="w-3 h-3 mr-1" />
                  Signature Pending
                </Badge>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {t('issuedOn', { date: formatDate(factura.fechaEmision) })}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsPrintPreviewOpen(true)}>
            <Printer className="w-4 h-4 mr-1" />
            {t('print')}
          </Button>
          {factura.cliente.email && factura.estado !== 'ANULADA' && factura.signatureStatus !== 'SIGNED' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRequestSignature}
              disabled={requestingSignature}
            >
              <PenLine className="w-4 h-4 mr-1" />
              {requestingSignature ? 'Loading...' : factura.signatureStatus === 'PENDING' ? 'Resend Signature' : 'Request Signature'}
            </Button>
          )}
          {factura.estado !== 'PAGADA' && factura.estado !== 'ANULADA' && (
            <Button size="sm" onClick={() => {
              setPaymentData({ ...paymentData, monto: (factura.montoPendiente || 0).toString() });
              setIsPaymentModalOpen(true);
            }}>
              <CreditCard className="w-4 h-4 mr-1" />
              {t('registerPayment')}
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
              {t('clientInfo')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('client')}</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {factura.cliente.razonSocial}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">{t('document')}</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {factura.cliente.tipoDocumento}: {factura.cliente.numeroDocumento}
                </p>
              </div>
              {factura.cliente.direccion && (
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('address')}</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {factura.cliente.direccion}
                  </p>
                </div>
              )}
              {factura.cliente.email && (
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('email')}</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {factura.cliente.email}
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
                      {t('description')}
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
                  {factura.detalles.map((detalle) => (
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
              {factura.detalles.map((detalle) => (
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

          {/* Payments */}
          {factura.pagos.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('payments')}
              </h2>
              <div className="space-y-3">
                {factura.pagos.map((pago) => (
                  <div
                    key={pago.id}
                    className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(pago.monto)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(pago.fecha)} • {pago.metodoPago}
                        {pago.referencia && ` • ${pago.referencia}`}
                      </p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Observations */}
          {factura.observaciones && (
            <Card>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t('observations')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">{factura.observaciones}</p>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('summary')}
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('subtotal')}</span>
                <span>{formatCurrency(factura.subtotal)}</span>
              </div>
              {factura.descuento > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('discount')}</span>
                  <span className="text-red-500">-{formatCurrency(factura.descuento)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">IGV (18%)</span>
                <span>{formatCurrency(factura.igv)}</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold">{t('total')}</span>
                  <span className="text-xl font-bold text-primary-600">
                    {formatCurrency(factura.total)}
                  </span>
                </div>
              </div>
              {factura.montoPendiente > 0 && factura.estado !== 'ANULADA' && (
                <div className="flex justify-between text-orange-600 pt-2">
                  <span className="font-medium">{t('pending')}</span>
                  <span className="font-bold">{formatCurrency(factura.montoPendiente)}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Dates */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t('dates')}
              </h2>
              {factura.estado !== 'ANULADA' && (
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
                <span>{formatDate(factura.fechaEmision)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('dueDate')}</span>
                <span>{formatDate(factura.fechaVencimiento)}</span>
              </div>
            </div>
          </Card>

          {/* Actions */}
          {factura.estado !== 'ANULADA' && (
            <Card className="!p-4">
              <div className="space-y-2">
                {factura.montoPendiente > 0 && (
                  <Button
                    className="w-full"
                    onClick={() => {
                      setPaymentData({ ...paymentData, monto: factura.montoPendiente.toString() });
                      setIsPaymentModalOpen(true);
                    }}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {t('registerPayment')}
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => setIsCancelDialogOpen(true)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {t('cancelInvoice')}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={t('registerPayment')}
      >
        <div className="space-y-4">
          <Input
            label={t('amount')}
            type="number"
            step="0.01"
            value={paymentData.monto}
            onChange={(e) => setPaymentData({ ...paymentData, monto: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('paymentMethod')}
            </label>
            <select
              value={paymentData.metodoPago}
              onChange={(e) => setPaymentData({ ...paymentData, metodoPago: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            >
              <option value="TRANSFERENCIA">{t('transfer')}</option>
              <option value="EFECTIVO">{t('cash')}</option>
              <option value="TARJETA">{t('card')}</option>
              <option value="CHEQUE">{t('check')}</option>
            </select>
          </div>
          <Input
            label={t('reference')}
            value={paymentData.referencia}
            onChange={(e) => setPaymentData({ ...paymentData, referencia: e.target.value })}
            placeholder={t('referencePlaceholder')}
          />
          <Input
            label={t('notes')}
            value={paymentData.notas}
            onChange={(e) => setPaymentData({ ...paymentData, notas: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleRegisterPayment} disabled={savingPayment}>
              {savingPayment ? t('saving') : t('save')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel Confirmation */}
      <ConfirmDialog
        isOpen={isCancelDialogOpen}
        onClose={() => setIsCancelDialogOpen(false)}
        onConfirm={handleCancelInvoice}
        title={t('cancelInvoiceTitle')}
        message={t('cancelInvoiceMessage')}
        confirmLabel={t('confirm')}
        variant="danger"
      />

      {/* Print Preview Modal */}
      <PrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        factura={factura}
        empresa={empresa}
      />

      {/* Send Email Modal */}
      <SendEmailModal
        isOpen={isSendEmailOpen}
        onClose={() => setIsSendEmailOpen(false)}
        factura={factura}
      />

      {/* Signature Request Modal */}
      <Modal
        isOpen={signatureRequestModal.isOpen}
        onClose={() => {
          setSignatureRequestModal({ isOpen: false, signingUrl: '', email: '', emailSent: false });
          setUrlCopied(false);
        }}
        title={signatureRequestModal.emailSent ? "Signature Request Sent!" : "Share Signature Link"}
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
                    Copy
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
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6 text-left">
            <div className="flex gap-3">
              <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p className="font-medium mb-1">What happens next?</p>
                <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  <li>• The client will receive an email with the signing link</li>
                  <li>• They can sign the document on any device (mobile-friendly)</li>
                  <li>• You'll receive a notification when they complete the signature</li>
                  <li>• The link expires in 7 days</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {!signatureRequestModal.emailSent ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSignatureRequestModal({ isOpen: false, signingUrl: '', email: '', emailSent: false });
                    setUrlCopied(false);
                  }}
                  disabled={sendingEmail}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  onClick={handleSendSignatureEmail}
                  disabled={sendingEmail || !signatureRequestModal.email}
                  className="flex-1"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sendingEmail ? 'Sending...' : 'Send Email'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => window.open(signatureRequestModal.signingUrl, '_blank')}
                  className="flex-1"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Preview Link
                </Button>
                <Button
                  onClick={() => {
                    setSignatureRequestModal({ isOpen: false, signingUrl: '', email: '', emailSent: false });
                    setUrlCopied(false);
                  }}
                  className="flex-1"
                >
                  Done
                </Button>
              </>
            )}
          </div>
        </div>
      </Modal>

      {/* Edit Dates Modal */}
      <Modal
        isOpen={isEditDatesOpen}
        onClose={() => !editingDates && setIsEditDatesOpen(false)}
        title="Edit Invoice Dates"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Issue Date
            </label>
            <DatePicker
              value={fechaEmisionEdit}
              onChange={(date) => setFechaEmisionEdit(date)}
              disabled={editingDates}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Due Date
            </label>
            <DatePicker
              value={fechaVencimientoEdit}
              onChange={(date) => setFechaVencimientoEdit(date)}
              disabled={editingDates}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsEditDatesOpen(false)}
              disabled={editingDates}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveDates}
              disabled={editingDates || !fechaEmisionEdit || !fechaVencimientoEdit}
              className="flex-1"
            >
              <Calendar className="w-4 h-4 mr-2" />
              {editingDates ? 'Saving...' : 'Save Dates'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Hidden PDF Generator */}
      <div className="fixed -left-[9999px] -top-[9999px]">
        <InvoicePreview ref={pdfRef} factura={factura} empresa={empresa} />
      </div>
    </div>
  );
}
