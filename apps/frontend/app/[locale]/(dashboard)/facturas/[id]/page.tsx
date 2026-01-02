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
  Calendar,
  Edit2,
  FileText,
  Users,
  Package,
  DollarSign,
  Briefcase,
  HardHat,
  MessageSquare,
  ClipboardList,
  Receipt,
  Plus,
  Trash2,
  MapPin
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  Button,
  Card,
  Badge,
  Modal,
  Input,
  SkeletonDetailPage,
  ConfirmDialog,
  DatePicker,
  ActivityTimeline,
} from '@/components/common';
import { createTimelineFromDocument, TimelineEvent } from '@/components/common/ActivityTimeline';
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
  saldoPendiente: number;
  totalPagado: number;
  observaciones?: string;
  orderType?: string;
  jobName?: string;
  jobLocation?: string;
  workDescription?: string;
  paymentTerms?: string;
  totalMaterials?: number;
  totalLabor?: number;
  detalles: DetalleFactura[];
  pagos: PagoFactura[];
  signatureStatus?: 'PENDING' | 'SIGNED' | 'EXPIRED' | 'CANCELLED' | null;
  signatureRequest?: any;
  proformaOrigenId?: string | null;
}

export default function FacturaDetailPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  const t = useTranslations('invoices');
  const tDashboard = useTranslations('dashboard');
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
  const [isEditDatesOpen, setIsEditDatesOpen] = useState(false);
  const [editingDates, setEditingDates] = useState(false);
  const [fechaEmisionEdit, setFechaEmisionEdit] = useState<Date | null>(null);
  const [fechaVencimientoEdit, setFechaVencimientoEdit] = useState<Date | null>(null);
  const [isEditObservationsOpen, setIsEditObservationsOpen] = useState(false);
  const [editingObservations, setEditingObservations] = useState(false);
  const [observacionesEdit, setObservacionesEdit] = useState('');
  const [isEditOrderTypeOpen, setIsEditOrderTypeOpen] = useState(false);
  const [editingOrderType, setEditingOrderType] = useState(false);
  const [orderTypeEdit, setOrderTypeEdit] = useState<string>('');
  const [isEditPaymentSummaryOpen, setIsEditPaymentSummaryOpen] = useState(false);
  const [editingPaymentSummary, setEditingPaymentSummary] = useState(false);
  const [totalMaterialsEdit, setTotalMaterialsEdit] = useState<number>(0);
  const [totalLaborEdit, setTotalLaborEdit] = useState<number>(0);
  const [isEditJobInfoOpen, setIsEditJobInfoOpen] = useState(false);
  const [editingJobInfo, setEditingJobInfo] = useState(false);
  const [showJobMoreOptions, setShowJobMoreOptions] = useState(false);
  const [jobInfoEdit, setJobInfoEdit] = useState({ jobName: '', jobLocation: '', workDescription: '', paymentTerms: '' });
  const [isEditItemsOpen, setIsEditItemsOpen] = useState(false);
  const [editingItems, setEditingItems] = useState(false);
  const [itemsEdit, setItemsEdit] = useState<Array<{
    id: string;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    descuento: number;
  }>>([]);
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
        saldoPendiente: 2450.00,
        totalPagado: 0,
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

    const monto = parseFloat(paymentData.monto);
    
    // Client-side validation
    if (monto <= 0) {
      showError(t('paymentAmountMustBePositive') || 'Payment amount must be greater than 0');
      return;
    }
    
    // Use cents comparison to avoid floating point precision issues
    if (Math.round(monto * 100) > Math.round(factura.saldoPendiente * 100)) {
      showError(`${t('paymentExceedsPending') || 'Amount exceeds pending balance'}: ${formatCurrency(factura.saldoPendiente)}`);
      return;
    }

    try {
      setSavingPayment(true);
      await api.post(`/facturas/${factura.id}/pagos`, {
        monto: monto,
        metodoPago: paymentData.metodoPago,
        referencia: paymentData.referencia || null,
        notas: paymentData.notas || null,
      });
      
      showSuccess(t('paymentRegistered') || 'Payment registered successfully');
      setIsPaymentModalOpen(false);
      setPaymentData({
        monto: '',
        metodoPago: 'TRANSFERENCIA',
        referencia: '',
        notas: '',
      });
      loadFactura();
    } catch (error: any) {
      console.error('Error registering payment:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Error registering payment';
      showError(errorMessage);
    } finally {
      setSavingPayment(false);
    }
  };

  const handleCancelInvoice = async () => {
    if (!factura) return;

    try {
      await api.delete(`/facturas/${factura.id}`);
      showSuccess(t('invoiceCancelled') || 'Invoice cancelled successfully');
      setIsCancelDialogOpen(false);
      loadFactura();
    } catch (error: any) {
      console.error('Error cancelling invoice:', error);
      showError(error.response?.data?.error || 'Failed to cancel invoice');
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

  const handleOpenEditObservations = () => {
    if (!factura) return;
    setObservacionesEdit(factura.observaciones || '');
    setIsEditObservationsOpen(true);
  };

  const handleSaveObservations = async () => {
    if (!factura) return;

    try {
      setEditingObservations(true);
      await api.put(`/facturas/${factura.id}/observations`, {
        observaciones: observacionesEdit,
      });
      
      showSuccess(t('messages.updated') || 'Observations updated successfully');
      setIsEditObservationsOpen(false);
      loadFactura();
    } catch (error: any) {
      console.error('Error updating observations:', error);
      showError(error.response?.data?.error || 'Failed to update observations');
    } finally {
      setEditingObservations(false);
    }
  };

  const handleOpenEditOrderType = () => {
    if (!factura) return;
    setOrderTypeEdit(factura.orderType || '');
    setIsEditOrderTypeOpen(true);
  };

  const handleSaveOrderType = async () => {
    if (!factura) return;

    try {
      setEditingOrderType(true);
      await api.put(`/facturas/${factura.id}/order-type`, {
        orderType: orderTypeEdit || null,
      });
      
      showSuccess('Order type updated successfully');
      setIsEditOrderTypeOpen(false);
      loadFactura();
    } catch (error: any) {
      console.error('Error updating order type:', error);
      showError(error.response?.data?.error || 'Failed to update order type');
    } finally {
      setEditingOrderType(false);
    }
  };

  const handleOpenEditPaymentSummary = () => {
    if (!factura) return;
    const materials = Number(factura.totalMaterials) || 0;
    const labor = Number(factura.totalLabor) || 0;
    // If both are 0, assign the subtotal to labor by default (not total which includes tax)
    if (materials === 0 && labor === 0) {
      setTotalMaterialsEdit(0);
      setTotalLaborEdit(Number(factura.subtotal) || 0);
    } else {
      setTotalMaterialsEdit(materials);
      setTotalLaborEdit(labor);
    }
    setIsEditPaymentSummaryOpen(true);
  };

  const handleSavePaymentSummary = async () => {
    if (!factura) return;

    try {
      setEditingPaymentSummary(true);
      await api.put(`/facturas/${factura.id}/payment-summary`, {
        totalMaterials: totalMaterialsEdit,
        totalLabor: totalLaborEdit,
      });
      
      showSuccess('Payment summary updated successfully');
      setIsEditPaymentSummaryOpen(false);
      loadFactura();
    } catch (error: any) {
      console.error('Error updating payment summary:', error);
      showError(error.response?.data?.error || 'Failed to update payment summary');
    } finally {
      setEditingPaymentSummary(false);
    }
  };

  const handleOpenEditJobInfo = () => {
    if (!factura) return;
    setJobInfoEdit({
      jobName: factura.jobName || '',
      jobLocation: factura.jobLocation || '',
      workDescription: factura.workDescription || '',
      paymentTerms: factura.paymentTerms || ''
    });
    setIsEditJobInfoOpen(true);
  };

  const handleSaveJobInfo = async () => {
    if (!factura) return;

    try {
      setEditingJobInfo(true);
      await api.put(`/facturas/${factura.id}/job-info`, jobInfoEdit);
      
      showSuccess('Job information updated successfully');
      setIsEditJobInfoOpen(false);
      loadFactura();
    } catch (error: any) {
      console.error('Error updating job info:', error);
      showError(error.response?.data?.error || 'Failed to update job information');
    } finally {
      setEditingJobInfo(false);
    }
  };

  const handleOpenEditItems = () => {
    if (!factura) return;
    setItemsEdit(factura.detalles.map(d => ({
      id: d.id,
      descripcion: d.descripcion,
      cantidad: d.cantidad,
      precioUnitario: d.precioUnitario,
      descuento: d.descuento || 0
    })));
    setIsEditItemsOpen(true);
  };

  const handleAddItem = () => {
    setItemsEdit([...itemsEdit, {
      id: `new-${Date.now()}`,
      descripcion: '',
      cantidad: 1,
      precioUnitario: 0,
      descuento: 0
    }]);
  };

  const handleRemoveItem = (index: number) => {
    setItemsEdit(itemsEdit.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: string, value: string | number) => {
    const updated = [...itemsEdit];
    updated[index] = { ...updated[index], [field]: value };
    setItemsEdit(updated);
  };

  const handleSaveItems = async () => {
    if (!factura) return;

    // Validate items
    const validItems = itemsEdit.filter(item => item.descripcion.trim() !== '');
    if (validItems.length === 0) {
      showError(t('messages.itemsRequired') || 'At least one item is required');
      return;
    }

    try {
      setEditingItems(true);
      await api.put(`/facturas/${factura.id}`, {
        detalles: validItems.map(item => ({
          descripcion: item.descripcion,
          cantidad: Number(item.cantidad) || 1,
          precioUnitario: Number(item.precioUnitario) || 0,
          descuento: Number(item.descuento) || 0
        }))
      });
      
      showSuccess(t('messages.itemsUpdated') || 'Items updated successfully');
      setIsEditItemsOpen(false);
      loadFactura();
    } catch (error: any) {
      console.error('Error updating items:', error);
      showError(error.response?.data?.error || 'Failed to update items');
    } finally {
      setEditingItems(false);
    }
  };

  const handleDirectDownloadPDF = async () => {
    if (!pdfRef.current || !factura) return;

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

  const getStatusLabel = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    const labels: Record<string, string> = {
      pagada: t('statusPaid'),
      emitida: t('statusIssued'),
      pendiente: t('statusPending'),
      vencida: t('statusOverdue'),
      anulada: t('statusCancelled'),
    };
    return labels[normalizedStatus] || status;
  };

  if (loading) {
    return <SkeletonDetailPage />;
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
            onClick={() => router.push(`/${locale}/facturas`)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{tDashboard('invoice')}</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {factura.serie}-{factura.numero}
              </h1>
              <Badge variant={statusConfig.variant}>
                <span className="flex items-center gap-1">
                  {statusConfig.icon}
                  {getStatusLabel(factura.estado)}
                </span>
              </Badge>
              {factura.signatureStatus === 'SIGNED' && (
                <Badge variant="success">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {t('signed')}
                </Badge>
              )}
              {factura.signatureStatus === 'PENDING' && (
                <Badge variant="warning">
                  <Clock className="w-3 h-3 mr-1" />
                  {t('signaturePending')}
                </Badge>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {t('issuedOn', { date: formatDate(factura.fechaEmision, locale) })}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-12 text-base" onClick={() => setIsPrintPreviewOpen(true)}>
            <Printer className="w-5 h-5 mr-2" />
            {t('print')}
          </Button>
          {factura.proformaOrigenId && (
            <Button variant="outline" size="sm" onClick={() => router.push(`/${locale}/proformas/${factura.proformaOrigenId}`)}>
              <FileText className="w-4 h-4 mr-1" />
              {t('viewProposal')}
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
                  {factura.cliente.numeroDocumento ? (
                    factura.cliente.tipoDocumento !== 'OTHER' 
                      ? `${factura.cliente.tipoDocumento}: ${factura.cliente.numeroDocumento}`
                      : factura.cliente.numeroDocumento
                  ) : '-'}
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Package className="w-5 h-5" />
                {t('items')}
              </h2>
              {factura.estado !== 'ANULADA' && factura.estado !== 'PAGADA' && (
                <button
                  onClick={handleOpenEditItems}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                  title={t('editItems') || 'Edit items'}
                >
                  <Edit2 className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>
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
                        <span className="text-gray-900 dark:text-gray-100">
                          {detalle.descripcion}
                        </span>
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
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
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
                        {formatDate(pago.fecha)} • {t(`paymentMethods.${pago.metodoPago}`)}
                        {pago.referencia && ` • ${pago.referencia}`}
                      </p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Job Information */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Job Information
              </h2>
              {factura.estado !== 'ANULADA' && (
                <button
                  onClick={handleOpenEditJobInfo}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                  title="Edit job information"
                >
                  <Edit2 className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>
            {(factura.jobName || factura.jobLocation || factura.workDescription || factura.paymentTerms) ? (
              <div className="space-y-3">
                {factura.jobName && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Job Name</p>
                    <p className="text-gray-900 dark:text-gray-100">{factura.jobName}</p>
                  </div>
                )}
                {factura.jobLocation && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Job Location</p>
                    <p className="text-gray-900 dark:text-gray-100">{factura.jobLocation}</p>
                  </div>
                )}
                {factura.workDescription && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Work Description</p>
                    <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{factura.workDescription}</p>
                  </div>
                )}
                {factura.paymentTerms && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Payment Terms</p>
                    <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{factura.paymentTerms}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-400 dark:text-gray-500 italic text-sm">
                No job information set. Click the edit icon to add details.
              </p>
            )}
          </Card>

          {/* Observations */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t('observations')}
              </h2>
              {factura.estado !== 'ANULADA' && (
                <button
                  onClick={handleOpenEditObservations}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                  title="Edit observations"
                >
                  <Edit2 className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>
            {factura.observaciones ? (
              <p className="text-gray-600 dark:text-gray-400">{factura.observaciones}</p>
            ) : (
              <p className="text-gray-400 dark:text-gray-500 italic text-sm">
                {t('observationsPlaceholder') || 'No observations'}
              </p>
            )}
          </Card>

        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Summary */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Payment Summary
              </h2>
              {factura.estado !== 'ANULADA' && (
                <button
                  onClick={handleOpenEditPaymentSummary}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                  title="Edit payment summary"
                >
                  <Edit2 className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Materials</span>
                <span>{formatCurrency(Number(factura.totalMaterials) || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Labor</span>
                <span>{formatCurrency(
                  Number(factura.totalMaterials || 0) === 0 && Number(factura.totalLabor || 0) === 0
                    ? factura.subtotal
                    : (Number(factura.totalLabor) || 0)
                )}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(
                  Number(factura.totalMaterials || 0) === 0 && Number(factura.totalLabor || 0) === 0
                    ? factura.subtotal
                    : Number(factura.totalMaterials || 0) + Number(factura.totalLabor || 0)
                )}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  Tax
                  {empresa?.taxRate && Number(empresa.taxRate) > 0 ? ` (${empresa.taxRate}%)` : ''}
                </span>
                <span>{formatCurrency(factura.igv)}</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                <div className="flex justify-between">
                  <span className="font-semibold">Total Amount</span>
                  <span className="text-xl font-bold text-primary-600">
                    {formatCurrency(factura.total)}
                  </span>
                </div>
              </div>
              {factura.saldoPendiente > 0 && factura.estado !== 'ANULADA' && (
                <div className="flex justify-between text-orange-600 pt-2 border-t border-orange-200 dark:border-orange-800 mt-2">
                  <span className="font-medium">{t('pending')}</span>
                  <span className="font-bold">{formatCurrency(factura.saldoPendiente)}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Order Type */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <HardHat className="w-5 h-5" />
                Order Type
              </h2>
              {factura.estado !== 'ANULADA' && (
                <button
                  onClick={handleOpenEditOrderType}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                  title="Edit order type"
                >
                  <Edit2 className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>
            {factura.orderType ? (
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {factura.orderType === 'day_work' && 'Day Work'}
                    {factura.orderType === 'contract' && 'Contract'}
                    {factura.orderType === 'extra' && 'Extra'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 dark:text-gray-500 italic text-sm">
                No order type set
              </p>
            )}
          </Card>

          {/* Dates */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
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

          {/* Activity Timeline */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('activityTimeline') || 'Activity'}
            </h2>
            <ActivityTimeline 
              events={createTimelineFromDocument({
                createdAt: factura.fechaEmision,
                sentAt: factura.signatureRequest?.sentAt,
                viewedAt: factura.signatureRequest?.viewedAt,
                signedAt: factura.signatureRequest?.signedAt,
                paidAt: factura.estado === 'PAGADA' ? factura.pagos?.[factura.pagos.length - 1]?.fecha : undefined,
                status: factura.estado,
                signerName: factura.signatureRequest?.signerName,
              })}
              currentStatus={factura.estado}
              compact
            />
          </Card>

          {/* Actions */}
          {factura.estado !== 'ANULADA' && (
            <Card className="!p-4">
              <div className="space-y-3">
                {factura.saldoPendiente > 0 && (
                  <Button
                    className="w-full h-12 text-base"
                    onClick={() => {
                      setPaymentData({ ...paymentData, monto: factura.saldoPendiente.toFixed(2) });
                      setIsPaymentModalOpen(true);
                    }}
                  >
                    <CreditCard className="w-5 h-5 mr-2" />
                    {t('registerPayment')}
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full h-12 text-base text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => setIsCancelDialogOpen(true)}
                >
                  <XCircle className="w-5 h-5 mr-2" />
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
        subtitle="Record a payment for this invoice"
        icon={CreditCard}
        iconColor="success"
        size="md"
      >
        <div className="space-y-5">
          {/* Pending Balance Info */}
          {factura && (
            <div className={`rounded-xl p-4 border ${
              factura.saldoPendiente <= 0 
                ? 'bg-gradient-to-br from-green-50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/10 border-green-200 dark:border-green-800'
                : 'bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/10 border-blue-200 dark:border-blue-800'
            }`}>
              <div className="flex justify-between items-center">
                <span className={`text-sm font-medium ${factura.saldoPendiente <= 0 ? 'text-green-700 dark:text-green-300' : 'text-blue-700 dark:text-blue-300'}`}>
                  {t('pendingBalance') || 'Pending Balance'}
                </span>
                <span className={`text-xl font-bold ${factura.saldoPendiente <= 0 ? 'text-green-900 dark:text-green-100' : 'text-blue-900 dark:text-blue-100'}`}>
                  {formatCurrency(factura.saldoPendiente)}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{t('totalInvoice') || 'Total Invoice'}:</span>
                <span className="font-medium">{formatCurrency(factura.total)}</span>
              </div>
              {factura.totalPagado > 0 && (
                <div className="flex justify-between items-center mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>{t('totalPaid') || 'Total Paid'}:</span>
                  <span className="font-medium">{formatCurrency(factura.totalPagado)}</span>
                </div>
              )}
            </div>
          )}
          
          {factura && factura.saldoPendiente <= 0 ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-green-600 dark:text-green-400 font-semibold text-lg">
                {t('invoiceFullyPaid') || 'This invoice is fully paid'}
              </p>
            </div>
          ) : (
            <>
              {/* Amount Field */}
              <div className="bg-gradient-to-br from-gray-50 to-slate-50/50 dark:from-gray-800/50 dark:to-slate-800/30 rounded-xl p-5 border border-gray-100 dark:border-gray-800">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t('amount')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={paymentData.monto}
                    onChange={(e) => setPaymentData({ ...paymentData, monto: e.target.value })}
                    className={`w-full pl-8 pr-24 py-3 border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-600 focus:border-transparent transition-all text-lg font-medium ${
                      paymentData.monto && Math.round(parseFloat(paymentData.monto) * 100) > Math.round((factura?.saldoPendiente || 0) * 100)
                        ? 'border-red-500 text-red-600'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setPaymentData({ ...paymentData, monto: factura?.saldoPendiente?.toFixed(2) || '0' })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-gray-800 dark:bg-gray-600 hover:bg-gray-900 dark:hover:bg-gray-500 px-3 py-1.5 rounded-lg text-white font-medium transition-colors"
                  >
                    {t('payFull') || 'Pay Full'}
                  </button>
                </div>
                {paymentData.monto && Math.round(parseFloat(paymentData.monto) * 100) > Math.round((factura?.saldoPendiente || 0) * 100) && (
                  <p className="mt-2 text-xs text-red-500 font-medium">
                    {t('amountExceedsPending') || 'Amount exceeds pending balance'}
                  </p>
                )}
              </div>
              
              {/* Payment Method Cards */}
              <div className="bg-gradient-to-br from-gray-50 to-slate-50/50 dark:from-gray-800/50 dark:to-slate-800/30 rounded-xl p-5 border border-gray-100 dark:border-gray-800">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  {t('paymentMethod')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'TRANSFERENCIA', label: t('transfer'), icon: '🏦' },
                    { value: 'EFECTIVO', label: t('cash'), icon: '💵' },
                    { value: 'TARJETA', label: t('card'), icon: '💳' },
                    { value: 'CHEQUE', label: t('check'), icon: '📝' },
                  ].map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPaymentData({ ...paymentData, metodoPago: method.value })}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        paymentData.metodoPago === method.value
                          ? 'border-gray-800 dark:border-gray-500 bg-gray-50 dark:bg-gray-800 shadow-sm'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800/50'
                      }`}
                    >
                      <span className="text-2xl">{method.icon}</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Reference & Notes */}
              <div className="bg-gradient-to-br from-gray-50 to-slate-50/50 dark:from-gray-800/50 dark:to-slate-800/30 rounded-xl p-5 border border-gray-100 dark:border-gray-800 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('reference')}
                  </label>
                  <input
                    type="text"
                    value={paymentData.referencia}
                    onChange={(e) => setPaymentData({ ...paymentData, referencia: e.target.value })}
                    placeholder={t('referencePlaceholder')}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-600 focus:border-transparent transition-all placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('notes')}
                  </label>
                  <input
                    type="text"
                    value={paymentData.notas}
                    onChange={(e) => setPaymentData({ ...paymentData, notas: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-600 focus:border-transparent transition-all placeholder:text-gray-400"
                  />
                </div>
              </div>
            </>
          )}
          
          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={() => setIsPaymentModalOpen(false)}
              className="flex-1 h-11"
            >
              {factura && factura.saldoPendiente <= 0 ? (t('close') || 'Close') : t('cancel')}
            </Button>
            {factura && factura.saldoPendiente > 0 && (
              <Button 
                onClick={handleRegisterPayment} 
                disabled={savingPayment}
                className="flex-1 h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                {savingPayment ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('saving')}
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    {t('save')}
                  </>
                )}
              </Button>
            )}
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

      {/* Edit Dates Modal */}
      <Modal
        isOpen={isEditDatesOpen}
        onClose={() => !editingDates && setIsEditDatesOpen(false)}
        title={t('dates')}
        subtitle="Update the issue and due dates for this invoice"
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
                  {t('dueDate')}
                </label>
                <DatePicker
                  value={fechaVencimientoEdit}
                  onChange={(date) => setFechaVencimientoEdit(date)}
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
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSaveDates}
              disabled={editingDates || !fechaEmisionEdit || !fechaVencimientoEdit}
              className="flex-1 h-11 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black"
            >
              {editingDates ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('saving')}
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  {t('save')}
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
        subtitle="Add notes or special instructions for this invoice"
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
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-600 focus:border-transparent resize-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
              {t('cancel')}
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
                  {t('saving')}
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {t('save')}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Job Information Modal */}
      <Modal
        isOpen={isEditJobInfoOpen}
        onClose={() => { !editingJobInfo && setIsEditJobInfoOpen(false); setShowJobMoreOptions(false); }}
        title="Job Information"
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
                  Work Description
                </label>
                <textarea
                  value={jobInfoEdit.workDescription}
                  onChange={(e) => setJobInfoEdit({ ...jobInfoEdit, workDescription: e.target.value })}
                  disabled={editingJobInfo}
                  placeholder="Describe the work to be done"
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-600 focus:border-transparent resize-none transition-all placeholder:text-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Payment Terms
                </label>
                <textarea
                  value={jobInfoEdit.paymentTerms}
                  onChange={(e) => setJobInfoEdit({ ...jobInfoEdit, paymentTerms: e.target.value })}
                  disabled={editingJobInfo}
                  placeholder="Define payment conditions"
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-600 focus:border-transparent resize-none transition-all placeholder:text-gray-400"
                />
              </div>

              {/* More Options Toggle */}
              <button
                type="button"
                onClick={() => setShowJobMoreOptions(!showJobMoreOptions)}
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <svg 
                  className={`w-4 h-4 transition-transform ${showJobMoreOptions ? 'rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {t('moreOptions') || 'More options'}
              </button>

              {/* Job Name & Location (Collapsible) */}
              {showJobMoreOptions && (
                <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Job Name
                    </label>
                    <input
                      type="text"
                      value={jobInfoEdit.jobName}
                      onChange={(e) => setJobInfoEdit({ ...jobInfoEdit, jobName: e.target.value })}
                      disabled={editingJobInfo}
                      placeholder="Enter job name"
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-600 focus:border-transparent transition-all placeholder:text-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Job Location
                    </label>
                    <input
                      type="text"
                      value={jobInfoEdit.jobLocation}
                      onChange={(e) => setJobInfoEdit({ ...jobInfoEdit, jobLocation: e.target.value })}
                      disabled={editingJobInfo}
                      placeholder="Enter job location"
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-600 focus:border-transparent transition-all placeholder:text-gray-400"
                    />
                  </div>
                </div>
              )}
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
              {t('cancel')}
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
                  {t('saving')}
                </>
              ) : (
                <>
                  <Briefcase className="w-4 h-4 mr-2" />
                  {t('save')}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Order Type Modal */}
      <Modal
        isOpen={isEditOrderTypeOpen}
        onClose={() => !editingOrderType && setIsEditOrderTypeOpen(false)}
        title="Order Type"
        subtitle="Select the type of work for this invoice"
        icon={ClipboardList}
        size="md"
      >
        <div className="space-y-5">
          {/* Radio Options */}
          <div className="bg-gradient-to-br from-gray-50 to-slate-50/50 dark:from-gray-800/50 dark:to-slate-800/30 rounded-xl p-5 border border-gray-100 dark:border-gray-800">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Select order type
            </label>
            <div className="space-y-2">
              <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${orderTypeEdit === 'day_work' ? 'border-gray-800 dark:border-gray-600 bg-gray-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50/50 dark:hover:bg-gray-800/50'}`}>
                <input
                  type="radio"
                  name="orderType"
                  value="day_work"
                  checked={orderTypeEdit === 'day_work'}
                  onChange={(e) => setOrderTypeEdit(e.target.value)}
                  disabled={editingOrderType}
                  className="w-4 h-4 text-gray-800 dark:text-gray-300 border-gray-300 focus:ring-gray-800"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Day Work</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Hourly or daily rate work</p>
                </div>
              </label>
              <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${orderTypeEdit === 'contract' ? 'border-gray-800 dark:border-gray-600 bg-gray-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50/50 dark:hover:bg-gray-800/50'}`}>
                <input
                  type="radio"
                  name="orderType"
                  value="contract"
                  checked={orderTypeEdit === 'contract'}
                  onChange={(e) => setOrderTypeEdit(e.target.value)}
                  disabled={editingOrderType}
                  className="w-4 h-4 text-gray-800 dark:text-gray-300 border-gray-300 focus:ring-gray-800"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Contract</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Fixed price contract work</p>
                </div>
              </label>
              <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${orderTypeEdit === 'extra' ? 'border-gray-800 dark:border-gray-600 bg-gray-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50/50 dark:hover:bg-gray-800/50'}`}>
                <input
                  type="radio"
                  name="orderType"
                  value="extra"
                  checked={orderTypeEdit === 'extra'}
                  onChange={(e) => setOrderTypeEdit(e.target.value)}
                  disabled={editingOrderType}
                  className="w-4 h-4 text-gray-800 dark:text-gray-300 border-gray-300 focus:ring-gray-800"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Extra</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Additional work outside scope</p>
                </div>
              </label>
              <label className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${orderTypeEdit === '' ? 'border-gray-800 dark:border-gray-600 bg-gray-50 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50/50 dark:hover:bg-gray-800/50'}`}>
                <input
                  type="radio"
                  name="orderType"
                  value=""
                  checked={orderTypeEdit === ''}
                  onChange={(e) => setOrderTypeEdit(e.target.value)}
                  disabled={editingOrderType}
                  className="w-4 h-4 text-gray-800 dark:text-gray-300 border-gray-300 focus:ring-gray-800"
                />
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 italic">None</span>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">No specific order type</p>
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsEditOrderTypeOpen(false)}
              disabled={editingOrderType}
              className="flex-1 h-11"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSaveOrderType}
              disabled={editingOrderType}
              className="flex-1 h-11 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black"
            >
              {editingOrderType ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('saving')}
                </>
              ) : (
                <>
                  <ClipboardList className="w-4 h-4 mr-2" />
                  {t('save')}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Items Modal */}
      <Modal
        isOpen={isEditItemsOpen}
        onClose={() => !editingItems && setIsEditItemsOpen(false)}
        title={t('items')}
        subtitle={t('editItemsSubtitle') || 'Add, edit or remove line items'}
        icon={Package}
        size="lg"
      >
        <div className="space-y-5">
          {/* Items List */}
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {itemsEdit.map((item, index) => (
              <div 
                key={item.id} 
                className="bg-gradient-to-br from-gray-50 to-slate-50/50 dark:from-gray-800/50 dark:to-slate-800/30 rounded-xl p-4 border border-gray-100 dark:border-gray-800"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                        {t('description')}
                      </label>
                      <input
                        type="text"
                        value={item.descripcion}
                        onChange={(e) => handleUpdateItem(index, 'descripcion', e.target.value)}
                        disabled={editingItems}
                        placeholder={t('descriptionPlaceholder') || 'Item description...'}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-600 focus:border-transparent transition-all placeholder:text-gray-400"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                          {t('qty')}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) => handleUpdateItem(index, 'cantidad', parseFloat(e.target.value) || 0)}
                          disabled={editingItems}
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm text-center focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-600 focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                          {t('price')}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.precioUnitario}
                          onChange={(e) => handleUpdateItem(index, 'precioUnitario', parseFloat(e.target.value) || 0)}
                          disabled={editingItems}
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm text-right focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-600 focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                          {t('subtotal')}
                        </label>
                        <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(item.cantidad * item.precioUnitario)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveItem(index)}
                    disabled={editingItems || itemsEdit.length <= 1}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Item Button */}
          <button
            onClick={handleAddItem}
            disabled={editingItems}
            className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('addItem') || 'Add Item'}
          </button>

          {/* Total */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/10 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between text-lg font-semibold">
              <span className="text-gray-700 dark:text-gray-300">{t('total')}</span>
              <span className="text-gray-900 dark:text-gray-100">
                {formatCurrency(itemsEdit.reduce((sum, item) => sum + (item.cantidad * item.precioUnitario), 0))}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsEditItemsOpen(false)}
              disabled={editingItems}
              className="flex-1 h-11"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSaveItems}
              disabled={editingItems || itemsEdit.length === 0}
              className="flex-1 h-11 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black"
            >
              {editingItems ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('saving')}
                </>
              ) : (
                <>
                  <Package className="w-4 h-4 mr-2" />
                  {t('save')}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Payment Summary Modal */}
      <Modal
        isOpen={isEditPaymentSummaryOpen}
        onClose={() => !editingPaymentSummary && setIsEditPaymentSummaryOpen(false)}
        title="Payment Summary"
        subtitle="Update materials and labor costs breakdown"
        icon={Receipt}
        size="md"
      >
        <div className="space-y-5">
          {/* Input Fields */}
          <div className="bg-gradient-to-br from-gray-50 to-slate-50/50 dark:from-gray-800/50 dark:to-slate-800/30 rounded-xl p-5 border border-gray-100 dark:border-gray-800">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Total Materials
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={totalMaterialsEdit}
                    onChange={(e) => setTotalMaterialsEdit(parseFloat(e.target.value) || 0)}
                    disabled={editingPaymentSummary}
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Total Labor
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={totalLaborEdit}
                    onChange={(e) => setTotalLaborEdit(parseFloat(e.target.value) || 0)}
                    disabled={editingPaymentSummary}
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50/50 dark:from-emerald-900/20 dark:to-green-900/10 rounded-xl p-5 border border-emerald-100 dark:border-emerald-900/30">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(Number(totalMaterialsEdit) + Number(totalLaborEdit))}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Tax {empresa?.taxRate && Number(empresa.taxRate) > 0 ? `(${empresa.taxRate}%)` : ''}
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrency((Number(totalMaterialsEdit) + Number(totalLaborEdit)) * (empresa?.taxRate ? parseFloat(empresa.taxRate.toString()) / 100 : 0))}
                </span>
              </div>
              <div className="pt-3 border-t border-emerald-200 dark:border-emerald-800/50 flex justify-between items-center">
                <span className="font-semibold text-gray-900 dark:text-gray-100">Total Amount</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(
                    (Number(totalMaterialsEdit) + Number(totalLaborEdit)) * 
                    (1 + (empresa?.taxRate ? parseFloat(empresa.taxRate.toString()) / 100 : 0))
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsEditPaymentSummaryOpen(false)}
              disabled={editingPaymentSummary}
              className="flex-1 h-11"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSavePaymentSummary}
              disabled={editingPaymentSummary}
              className="flex-1 h-11 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black"
            >
              {editingPaymentSummary ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('saving')}
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4 mr-2" />
                  {t('save')}
                </>
              )}
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
