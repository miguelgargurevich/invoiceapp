'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  FileText,
  Users,
  Package,
  DollarSign,
  Calendar,
  ArrowRight,
  Clock,
  Plus,
  Receipt,
  FileBarChart,
  CheckCircle,
  LayoutDashboard,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { MetricCard, Card, Badge, SkeletonMetricCard, Skeleton } from '@/components/common';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/lib/hooks/useCurrency';
import {
  getProposalStatusInfo,
  getInvoiceStatusInfo,
  type ProposalDocument,
  type InvoiceDocument,
} from '@/lib/hooks/useDocumentStatus';
import api from '@/lib/api';

interface DashboardStats {
  totalFacturas: number;
  totalProformas: number;
  totalClientes: number;
  totalProductos: number;
  ventasMes: number;
  ventasMesAnterior: number;
  facturasPendientes: number;
  facturasVencidas: number;
}

interface RecentInvoice {
  id: string;
  numero: string;
  cliente: { nombre: string };
  total: number;
  estado: string;
  fechaEmision: string;
  saldoPendiente?: number;
  signatureStatus?: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED' | null;
  signatureRequest?: {
    sentAt?: string | null;
    createdAt?: string;
    signature?: {
      signedAt?: string | null;
    };
  };
  pagos?: Array<{
    id: string;
    fecha: string;
    monto: number;
  }>;
}

interface RecentProposal {
  id: string;
  numero: string;
  cliente: { nombre: string };
  total: number;
  estado: string;
  fechaEmision: string;
  signatureStatus?: 'PENDING' | 'SIGNED' | 'EXPIRED' | 'CANCELLED' | null;
  signatureRequest?: {
    sentAt?: string | null;
    createdAt?: string;
    signature?: {
      signedAt?: string | null;
    };
  };
  fechaAceptacion?: string;
  facturasGeneradas?: Array<{
    id: string;
    pagos?: Array<{
      id: string;
      fecha: string;
      monto: number;
    }>;
  }>;
}

interface MonthlyRevenue {
  mes: string;
  ingresos: number;
}

interface InvoiceStatusData {
  pagada: number;
  pendiente: number;
  vencida: number;
}

export default function DashboardPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const { empresa } = useAuth();
  const { formatCurrency } = useCurrency();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [recentProposals, setRecentProposals] = useState<RecentProposal[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatusData>({ pagada: 0, pendiente: 0, vencida: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'invoices' | 'proposals'>('proposals');

  useEffect(() => {
    if (empresa?.id) {
      loadDashboardData();
    }
  }, [empresa?.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data from API in parallel
      const [recentInvoicesData, recentProposalsResponse, resumenData, graficosData] = await Promise.all([
        api.get<any[]>('/dashboard/ultimas-facturas'),
        api.get<any>('/proformas?limit=5'),
        api.get<any>('/dashboard/resumen'),
        api.get<any>('/dashboard/graficos')
      ]);

      // Transform invoices data to match interface
      const transformedInvoices: RecentInvoice[] = recentInvoicesData.map((factura: any) => ({
        id: factura.id.toString(),
        numero: `${factura.serie}-${factura.numero.toString().padStart(6, '0')}`,
        cliente: { nombre: factura.cliente.razonSocial },
        total: parseFloat(factura.total),
        estado: factura.estado,
        fechaEmision: factura.fechaEmision,
        signatureStatus: factura.signatureStatus,
      })).slice(0, 5);

      // Transform proposals data to match interface
      // Handle case where API returns object with data property or direct array
      const recentProposalsData = Array.isArray(recentProposalsResponse) 
        ? recentProposalsResponse 
        : (recentProposalsResponse?.data || recentProposalsResponse?.proformas || []);
      
      const transformedProposals: RecentProposal[] = recentProposalsData.slice(0, 5).map((proforma: any) => ({
        id: proforma.id.toString(),
        numero: `${proforma.serie}-${proforma.numero.toString().padStart(6, '0')}`,
        cliente: { nombre: proforma.cliente?.razonSocial || proforma.cliente?.nombre || 'N/A' },
        total: parseFloat(proforma.total),
        estado: proforma.estado,
        fechaEmision: proforma.fechaEmision,
      }));

      // Build dashboard stats from real API data
      const dashboardData: DashboardStats = {
        totalFacturas: resumenData.mes?.cantidadFacturas || 0,
        totalProformas: resumenData.alertas?.proformasPendientes || 0,
        totalClientes: resumenData.totales?.clientesActivos || 0,
        totalProductos: 0, // Not tracked in resumen
        ventasMes: resumenData.mes?.ventas || 0,
        ventasMesAnterior: resumenData.mes?.ventas * 0.85 || 0, // Approximate if not available
        facturasPendientes: graficosData.estadosFacturas?.pendiente || 0,
        facturasVencidas: resumenData.alertas?.facturasVencidas || 0,
      };

      // Transform monthly sales data
      const monthlyData: MonthlyRevenue[] = (graficosData.ventasPorMes || []).map((item: any) => ({
        mes: item.mes,
        ingresos: item.ventas || 0
      }));

      // Set invoice status data from API
      const statusData: InvoiceStatusData = {
        pagada: graficosData.estadosFacturas?.pagada || 0,
        pendiente: graficosData.estadosFacturas?.pendiente || 0,
        vencida: graficosData.estadosFacturas?.vencida || 0
      };

      setStats(dashboardData);
      setRecentInvoices(transformedInvoices);
      setRecentProposals(transformedProposals);
      setMonthlyRevenue(monthlyData);
      setInvoiceStatus(statusData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Translation objects for status functions
  const invoiceTranslations = {
    statusPending: t('statusPending'),
    statusSent: t('statusIssued'),
    statusSigned: t('statusSigned') || 'Signed',
    statusInvoiced: t('statusInvoiced') || 'Invoiced',
    statusPaid: t('statusPaid'),
    statusOverdue: t('statusOverdue'),
    statusCancelled: t('statusCancelled'),
  };

  const proposalTranslations = {
    statusPending: t('statusPending'),
    statusSent: t('statusIssued'),
    statusSigned: t('statusSigned') || 'Signed',
    statusAccepted: t('statusAccepted'),
    statusInvoiced: t('statusInvoiced'),
    statusPaid: t('statusPaid'),
    statusRejected: t('statusRejected'),
    statusExpired: t('statusOverdue'),
  };

  // Get invoice status using centralized function
  const getInvoiceStatusDisplay = (invoice: RecentInvoice) => {
    const doc: InvoiceDocument = {
      id: invoice.id,
      estado: invoice.estado,
      fechaEmision: invoice.fechaEmision,
      saldoPendiente: invoice.saldoPendiente ?? 0,
      signatureRequest: invoice.signatureRequest,
      signatureStatus: invoice.signatureStatus,
      pagos: invoice.pagos,
    };
    return getInvoiceStatusInfo(doc, invoiceTranslations);
  };

  // Get proposal status using centralized function
  const getProposalStatusDisplay = (proposal: RecentProposal) => {
    const doc: ProposalDocument = {
      id: proposal.id,
      estado: proposal.estado,
      fechaEmision: proposal.fechaEmision,
      signatureRequest: proposal.signatureRequest,
      signatureStatus: proposal.signatureStatus,
      fechaAceptacion: proposal.fechaAceptacion,
      facturasGeneradas: proposal.facturasGeneradas,
    };
    return getProposalStatusInfo(doc, proposalTranslations);
  };

  const percentageChange = stats
    ? ((stats.ventasMes - stats.ventasMesAnterior) / stats.ventasMesAnterior) * 100
    : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-4 w-40" />
        </div>

        {/* Giant Action Buttons skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Skeleton className="h-20 w-20 rounded-2xl" />
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Skeleton className="h-20 w-20 rounded-2xl" />
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>

        {/* Recent Documents skeleton */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 md:p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
          {/* Tabs header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <Skeleton className="h-9 w-36 rounded-md" />
              <Skeleton className="h-9 w-36 rounded-md" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
          {/* Table skeleton */}
          <div className="hidden md:block">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-3 mb-3">
              <div className="flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24 ml-auto" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-24 ml-auto" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
          {/* Mobile skeleton */}
          <div className="md:hidden space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-40" />
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-28" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
            <LayoutDashboard className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('title')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {t('welcome', { name: empresa?.razonSocial || 'Usuario' })}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString(locale, { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      </div>

      {/* Giant Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Proposal Button */}
        <button
          onClick={() => router.push(`/${locale}/proformas/nueva`)}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 p-8 shadow-xl hover:shadow-2xl transition-all duration-300 active:scale-[0.98]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 dark:from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex flex-col items-center justify-center text-white space-y-4">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm group-hover:bg-white/30 transition-colors">
              <FileBarChart className="w-12 h-12" />
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-1">Create Proposal</h3>
              <p className="text-emerald-100 text-sm">New quote for client</p>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium opacity-90 group-hover:opacity-100">
              <span>Start now</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </button>

        {/* Create Invoice Button */}
        <button
          onClick={() => router.push(`/${locale}/facturas/nueva`)}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 p-8 shadow-xl hover:shadow-2xl transition-all duration-300 active:scale-[0.98]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 dark:from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex flex-col items-center justify-center text-white space-y-4">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm group-hover:bg-white/30 transition-colors">
              <Receipt className="w-12 h-12" />
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-1">Create Invoice</h3>
              <p className="text-blue-100 text-sm">New customer invoice</p>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium opacity-90 group-hover:opacity-100">
              <span>Start now</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </button>
      </div>

      {/* Bottom Grid: Recent Documents */}
      <div>
          {/* Recent Documents with Tabs */}
          <div>
            <Card>
            {/* Tabs Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('proposals')}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                    activeTab === 'proposals'
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  )}
                >
                  <FileBarChart className="w-4 h-4" />
                  {t('recentProposals')}
                </button>
                <button
                  onClick={() => setActiveTab('invoices')}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                    activeTab === 'invoices'
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  )}
                >
                  <Receipt className="w-4 h-4" />
                  {t('recentInvoices')}
                </button>
              </div>
              <a
                href={`/${locale}/${activeTab === 'invoices' ? 'facturas' : 'proformas'}`}
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
              >
                {t('viewAll')}
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {activeTab === 'proposals' ? t('proposalNumber') : t('invoiceNumber')}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {t('client')}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {t('date')}
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {t('amount')}
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {t('status')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {activeTab === 'proposals' ? (
                    recentProposals.map((proposal) => {
                      const statusInfo = getProposalStatusDisplay(proposal);
                      return (
                        <tr
                          key={proposal.id}
                          onClick={() => router.push(`/${locale}/proformas/${proposal.id}`)}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-4">
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {proposal.numero}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                            {proposal.cliente.nombre}
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                            {new Date(proposal.fechaEmision).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-gray-100">
                            {formatCurrency(proposal.total)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={statusInfo.variant}>
                              {statusInfo.label}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    recentInvoices.map((invoice) => {
                      const statusInfo = getInvoiceStatusDisplay(invoice);
                      return (
                        <tr
                          key={invoice.id}
                          onClick={() => router.push(`/${locale}/facturas/${invoice.id}`)}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-4">
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {invoice.numero}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                            {invoice.cliente.nombre}
                          </td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                            {new Date(invoice.fechaEmision).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-gray-100">
                            {formatCurrency(invoice.total)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={statusInfo.variant}>
                              {statusInfo.label}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {activeTab === 'proposals' ? (
                recentProposals.map((proposal) => {
                  const statusInfo = getProposalStatusDisplay(proposal);
                  return (
                    <div
                      key={proposal.id}
                      onClick={() => router.push(`/${locale}/proformas/${proposal.id}`)}
                      className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {proposal.numero}
                        </span>
                        <Badge variant={statusInfo.variant} size="sm">
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {proposal.cliente.nombre}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          {new Date(proposal.fechaEmision).toLocaleDateString()}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(proposal.total)}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                recentInvoices.map((invoice) => {
                  const statusInfo = getInvoiceStatusDisplay(invoice);
                  return (
                    <div
                      key={invoice.id}
                      onClick={() => router.push(`/${locale}/facturas/${invoice.id}`)}
                      className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {invoice.numero}
                        </span>
                        <Badge variant={statusInfo.variant} size="sm">
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {invoice.cliente.nombre}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          {new Date(invoice.fechaEmision).toLocaleDateString()}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(invoice.total)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}