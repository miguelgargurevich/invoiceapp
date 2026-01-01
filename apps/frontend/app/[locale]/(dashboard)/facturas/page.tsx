'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, Download, MoreHorizontal, Receipt, CheckCircle, Clock, XCircle, AlertTriangle, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Button,
  DataTable,
  Badge,
  Card,
  EmptyInvoices,
  Skeleton,
  SkeletonMetricCard,
  type Column,
} from '@/components/common';

import { formatDate } from '@/lib/utils';
import { useCurrency } from '@/lib/hooks/useCurrency';
import api from '@/lib/api';

interface Factura {
  id: string;
  numero: string;
  serie: string;
  cliente: { nombre: string; documento: string };
  fechaEmision: string;
  fechaVencimiento: string;
  subtotal: number;
  igv: number;
  total: number;
  estado: string;
  montoPendiente: number;
  signatureStatus?: 'PENDING' | 'SIGNED' | 'EXPIRED' | 'CANCELLED' | null;
}

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

interface FacturaCompleta {
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
}

export default function FacturasPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations('invoices');
  const router = useRouter();
  const { empresa } = useAuth();
  const { formatCurrency } = useCurrency();
  
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstados, setFilterEstados] = useState<string[]>([]);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortKey, setSortKey] = useState<string>('fechaEmision');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadFacturas = useCallback(async () => {
    if (!empresa?.id) return;
    
    try {
      setLoading(true);
      const params = new URLSearchParams({
        empresaId: empresa.id,
        search,
        page: currentPage.toString(),
        limit: '10',
      });
      if (filterEstados.length > 0) {
        filterEstados.forEach(estado => params.append('estado', estado));
      }
      const response: any = await api.get(`/facturas?${params}`);
      const facturasData = response.data || [];
      
      // Mapear los datos para asegurar que cliente tenga el formato correcto
      const facturasMapped = facturasData.map((f: any) => ({
        ...f,
        estado: (f.estado || '').toLowerCase(), // Normalize estado to lowercase
        cliente: {
          nombre: f.cliente?.razonSocial || f.cliente?.nombre || '',
          documento: f.cliente?.numeroDocumento || f.cliente?.documento || '',
        },
      }));
      
      //console.log('[FACTURAS] Sample estados:', facturasMapped.slice(0, 3).map((f: any) => ({ numero: f.numero, estado: f.estado })));
      
      setFacturas(facturasMapped);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error loading facturas:', error);
      // Mock data for development
      setFacturas([
        {
          id: '1',
          numero: '000156',
          serie: 'F001',
          cliente: { nombre: 'Empresa ABC S.A.C.', documento: '20123456789' },
          fechaEmision: new Date().toISOString(),
          fechaVencimiento: new Date(Date.now() + 30 * 86400000).toISOString(),
          subtotal: 2076.27,
          igv: 373.73,
          total: 2450.00,
          estado: 'EMITIDA',
          montoPendiente: 2450.00,
        },
        {
          id: '2',
          numero: '000155',
          serie: 'F001',
          cliente: { nombre: 'Comercial Lima E.I.R.L.', documento: '20987654321' },
          fechaEmision: new Date(Date.now() - 86400000).toISOString(),
          fechaVencimiento: new Date(Date.now() + 29 * 86400000).toISOString(),
          subtotal: 1602.97,
          igv: 288.53,
          total: 1891.50,
          estado: 'PAGADA',
          montoPendiente: 0,
        },
        {
          id: '3',
          numero: '000154',
          serie: 'F001',
          cliente: { nombre: 'Distribuidora Norte S.A.', documento: '20456789123' },
          fechaEmision: new Date(Date.now() - 172800000).toISOString(),
          fechaVencimiento: new Date(Date.now() - 5 * 86400000).toISOString(),
          subtotal: 4805.08,
          igv: 864.92,
          total: 5670.00,
          estado: 'VENCIDA',
          montoPendiente: 5670.00,
        },
        {
          id: '4',
          numero: '000153',
          serie: 'F001',
          cliente: { nombre: 'Servicios Generales SAC', documento: '20789123456' },
          fechaEmision: new Date(Date.now() - 259200000).toISOString(),
          fechaVencimiento: new Date(Date.now() + 27 * 86400000).toISOString(),
          subtotal: 754.24,
          igv: 135.76,
          total: 890.00,
          estado: 'PAGADA',
          montoPendiente: 0,
        },
        {
          id: '5',
          numero: '000152',
          serie: 'F001',
          cliente: { nombre: 'Tech Solutions Peru', documento: '20321654987' },
          fechaEmision: new Date(Date.now() - 604800000).toISOString(),
          fechaVencimiento: new Date(Date.now() + 23 * 86400000).toISOString(),
          subtotal: 2711.86,
          igv: 488.14,
          total: 3200.00,
          estado: 'PENDIENTE',
          montoPendiente: 1600.00,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [empresa?.id, search, filterEstados, currentPage]);

  useEffect(() => {
    loadFacturas();
  }, [loadFacturas]);

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status.toUpperCase();
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
      PAGADA: 'success',
      EMITIDA: 'info',
      PENDIENTE: 'warning',
      VENCIDA: 'danger',
      ANULADA: 'neutral',
    };
    return variants[normalizedStatus] || 'neutral';
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

  const handleView = (factura: Factura) => {
    router.push(`/${locale}/facturas/${factura.id}`);
  };

  const handleExport = () => {
    try {
      // Prepare CSV data
      const headers = [
        t('number'),
        t('client'),
        t('document'),
        t('issueDate'),
        t('dueDate'),
        t('subtotal'),
        t('tax'),
        t('total'),
        t('status'),
        t('pending')
      ];

      const rows = filteredFacturas.map(f => [
        `${f.serie}-${f.numero}`,
        f.cliente.nombre,
        f.cliente.documento,
        new Date(f.fechaEmision).toLocaleDateString(),
        new Date(f.fechaVencimiento).toLocaleDateString(),
        f.subtotal.toString(),
        f.igv.toString(),
        f.total.toString(),
        f.estado,
        (f.montoPendiente || 0).toString()
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `facturas_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting facturas:', error);
    }
  };

  const columns: Column<Factura>[] = [
    {
      key: 'numero',
      header: t('number'),
      sortable: true,
      render: (factura) => (
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {factura.serie}-{factura.numero}
        </span>
      ),
    },
    {
      key: 'cliente',
      header: t('client'),
      render: (factura) => (
        <div>
          <span className="text-gray-900 dark:text-gray-100">
            {factura.cliente.nombre}
          </span>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {factura.cliente.documento}
          </p>
        </div>
      ),
    },
    {
      key: 'fechaEmision',
      header: t('issueDate'),
      sortable: true,
      render: (factura) => (
        <span className="text-gray-600 dark:text-gray-400">
          {formatDate(factura.fechaEmision)}
        </span>
      ),
    },
    {
      key: 'total',
      header: t('total'),
      sortable: true,
      className: 'text-right',
      render: (factura) => (
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {formatCurrency(factura.total)}
        </span>
      ),
    },
    {
      key: 'estado',
      header: t('status'),
      render: (factura) => (
        <Badge variant={getStatusBadge(factura.estado)}>
          {getStatusLabel(factura.estado)}
        </Badge>
      ),
    },
  ];

  const handleSort = (key: string, order: 'asc' | 'desc') => {
    setSortKey(key);
    setSortOrder(order);
  };

  const filteredFacturas = facturas
    .filter((f) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        `${f.serie || ''}-${f.numero || ''}`.toLowerCase().includes(searchLower) ||
        (f.cliente?.nombre || '').toLowerCase().includes(searchLower) ||
        (f.cliente?.documento || '').includes(search);
      
      // Normalize both sides to lowercase for comparison
      const estadoLower = (f.estado || '').toLowerCase().trim();
      const matchesEstado = filterEstados.length === 0 || filterEstados.some(fe => fe.toLowerCase().trim() === estadoLower);
      
      return matchesSearch && matchesEstado;
    })
    .sort((a, b) => {
      let aVal: any;
      let bVal: any;
      
      if (sortKey === 'cliente') {
        aVal = (a.cliente?.nombre || '').toLowerCase();
        bVal = (b.cliente?.nombre || '').toLowerCase();
      } else if (sortKey === 'numero') {
        aVal = `${a.serie}-${a.numero}`;
        bVal = `${b.serie}-${b.numero}`;
      } else {
        aVal = a[sortKey as keyof Factura];
        bVal = b[sortKey as keyof Factura];
      }
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // Calculate totals
  const totals = filteredFacturas.reduce(
    (acc, f) => ({
      total: acc.total + Number(f.total),
      pendiente: acc.pendiente + Number(f.montoPendiente),
    }),
    { total: 0, pendiente: 0 }
  );

  if (loading && facturas.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div>
              <Skeleton className="h-8 w-28 mb-2" />
              <Skeleton className="h-4 w-52" />
            </div>
          </div>
          <Skeleton className="h-12 w-36 rounded-lg" />
        </div>

        {/* Summary cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonMetricCard key={i} />
          ))}
        </div>

        {/* Filters skeleton */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        </div>

        {/* Table skeleton */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="hidden md:flex gap-4 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24 ml-auto" />
            <Skeleton className="h-4 w-20" />
          </div>
          {/* Table rows */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="hidden md:flex gap-4 px-6 py-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-24 ml-auto" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
          {/* Mobile skeleton */}
          <div className="md:hidden p-4 space-y-4">
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <Receipt className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('title')}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {t('subtitle')}
            </p>
          </div>
        </div>
        <Button 
          onClick={() => router.push(`/${locale}/facturas/nueva`)}
          className="px-6 py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
        >
          <Receipt className="w-5 h-5 mr-2" />
          {t('newInvoice')}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                {t('totalInvoiced')}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(totals.total)}
              </div>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Receipt className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                {t('invoiceCount')}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {filteredFacturas.length}
              </div>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                {t('pendingAmount')}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(totals.pendiente)}
              </div>
            </div>
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                {t('collectionRate')}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {totals.total > 0 ? Math.round(((totals.total - totals.pendiente) / totals.total) * 100) : 0}%
              </div>
            </div>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search and filters */}
      <Card className="!p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant={showStatusFilter ? "primary" : "outline"}
                onClick={() => setShowStatusFilter(!showStatusFilter)}
              >
                <Filter className="w-4 h-4 mr-2" />
                {t('filterStatus')} {filterEstados.length > 0 && `(${filterEstados.length})`}
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                {t('export')}
              </Button>
            </div>
          </div>
          
          {/* Status Filter Chips */}
          {showStatusFilter && (
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              {[
                { value: 'emitida', label: t('statusIssued'), color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
                { value: 'pagada', label: t('statusPaid'), color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
                { value: 'vencida', label: t('statusOverdue'), color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
                { value: 'anulada', label: t('statusCancelled'), color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300' },
              ].map((status) => (
                <button
                  key={status.value}
                  onClick={() => {
                    setFilterEstados(prev =>
                      prev.includes(status.value)
                        ? prev.filter(s => s !== status.value)
                        : [...prev, status.value]
                    );
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    filterEstados.includes(status.value)
                      ? `${status.color} ring-2 ring-offset-2 ring-primary-500 dark:ring-offset-gray-900`
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {filterEstados.includes(status.value) && (
                    <CheckCircle className="w-3 h-3 inline mr-1" />
                  )}
                  {status.label}
                </button>
              ))}
              {filterEstados.length > 0 && (
                <button
                  onClick={() => setFilterEstados([])}
                  className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('clearFilters') || 'Clear all'}
                </button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Table */}
      <DataTable
        data={filteredFacturas}
        columns={columns}
        keyExtractor={(f) => f.id}
        isLoading={loading}
        emptyState={
          <EmptyInvoices
            action={
              <Button onClick={() => router.push(`/${locale}/facturas/nueva`)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('createFirstInvoice')}
              </Button>
            }
          />
        }
        onRowClick={(f) => router.push(`/${locale}/facturas/${f.id}`)}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={handleSort}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        renderMobileCard={(factura) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {factura.serie}-{factura.numero}
                </span>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {factura.cliente.nombre}
                </p>
              </div>
              <Badge variant={getStatusBadge(factura.estado)} size="sm">
                {getStatusLabel(factura.estado)}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                {formatDate(factura.fechaEmision)}
              </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatCurrency(factura.total)}
              </span>
            </div>
            {factura.montoPendiente > 0 && (
              <div className="text-sm text-orange-600">
                {t('pendingAmount')}: {formatCurrency(factura.montoPendiente)}
              </div>
            )}
          </div>
        )}
      />
    </div>
  );
}
