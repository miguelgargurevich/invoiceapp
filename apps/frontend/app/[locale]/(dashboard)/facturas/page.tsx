'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, Download, Eye, Printer, MoreHorizontal, Receipt } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Button,
  DataTable,
  Badge,
  Card,
  EmptyInvoices,
  type Column,
} from '@/components/common';
import { PrintPreviewModal } from '@/components/invoice';
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
  const [filterEstado, setFilterEstado] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortKey, setSortKey] = useState<string>('fechaEmision');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState<FacturaCompleta | null>(null);
  const [loadingFactura, setLoadingFactura] = useState(false);

  const loadFacturas = useCallback(async () => {
    if (!empresa?.id) return;
    
    try {
      setLoading(true);
      const params = new URLSearchParams({
        empresaId: empresa.id,
        search,
        page: currentPage.toString(),
        limit: '10',
        ...(filterEstado && { estado: filterEstado }),
      });
      const response: any = await api.get(`/facturas?${params}`);
      const facturasData = response.data || [];
      
      // Mapear los datos para asegurar que cliente tenga el formato correcto
      const facturasMapped = facturasData.map((f: any) => ({
        ...f,
        cliente: {
          nombre: f.cliente?.razonSocial || f.cliente?.nombre || '',
          documento: f.cliente?.numeroDocumento || f.cliente?.documento || '',
        },
      }));
      
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
  }, [empresa?.id, search, filterEstado, currentPage]);

  useEffect(() => {
    loadFacturas();
  }, [loadFacturas]);

  const loadFacturaCompleta = async (id: string) => {
    try {
      setLoadingFactura(true);
      const response: any = await api.get(`/facturas/${id}`);
      
      const facturaData = response.data || response;
      
      // Validar que los datos existan
      if (!facturaData || !facturaData.cliente) {
        console.error('Invalid factura data:', facturaData);
        alert('Error: No se pudieron cargar los datos de la factura');
        return;
      }
      
      const facturaCompleta: FacturaCompleta = {
        ...facturaData,
        cliente: {
          id: facturaData.cliente.id || '',
          razonSocial: facturaData.cliente.razonSocial || facturaData.cliente.nombre || '',
          numeroDocumento: facturaData.cliente.numeroDocumento || facturaData.cliente.documento || '',
          tipoDocumento: facturaData.cliente.tipoDocumento || 'RUC',
          direccion: facturaData.cliente.direccion || '',
          email: facturaData.cliente.email || '',
        },
      };
      
      setSelectedFactura(facturaCompleta);
      setIsPrintPreviewOpen(true);
    } catch (error) {
      console.error('Error loading factura:', error);
      alert('Error al cargar la factura. Por favor, intente nuevamente.');
    } finally {
      setLoadingFactura(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
      PAGADA: 'success',
      EMITIDA: 'info',
      PENDIENTE: 'warning',
      VENCIDA: 'danger',
      ANULADA: 'neutral',
    };
    return variants[status] || 'neutral';
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
        <Badge variant={factura.signatureStatus === 'SIGNED' ? 'success' : getStatusBadge(factura.estado)}>
          {factura.signatureStatus === 'SIGNED' ? 'SIGNED' : factura.estado}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (factura) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/${locale}/facturas/${factura.id}`);
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={t('view')}
          >
            <Eye className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              loadFacturaCompleta(factura.id);
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={t('print')}
            disabled={loadingFactura}
          >
            <Printer className="w-4 h-4 text-gray-500" />
          </button>
        </div>
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
      const matchesEstado = !filterEstado || f.estado === filterEstado;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('subtitle')}
          </p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="!p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">{t('totalInvoiced')}</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            {formatCurrency(totals.total)}
          </div>
        </Card>
        <Card className="!p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">{t('invoiceCount')}</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            {filteredFacturas.length}
          </div>
        </Card>
      </div>

      {/* Search and filters */}
      <Card className="!p-4">
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
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{t('allStatuses')}</option>
            <option value="EMITIDA">{t('statusIssued')}</option>
            <option value="PAGADA">{t('statusPaid')}</option>
            <option value="PENDIENTE">{t('statusPending')}</option>
            <option value="VENCIDA">{t('statusOverdue')}</option>
            <option value="ANULADA">{t('statusCancelled')}</option>
          </select>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            {t('export')}
          </Button>
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
                {factura.estado}
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

      {/* Print Preview Modal */}
      {selectedFactura && (
        <PrintPreviewModal
          isOpen={isPrintPreviewOpen}
          onClose={() => {
            setIsPrintPreviewOpen(false);
            setSelectedFactura(null);
          }}
          factura={selectedFactura}
          empresa={empresa!}
        />
      )}
    </div>
  );
}
