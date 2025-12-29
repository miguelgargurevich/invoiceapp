'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, Printer, FileBarChart, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Button,
  DataTable,
  Badge,
  Card,
  EmptyState,
  type Column,
} from '@/components/common';
import { ProformaPrintPreviewModal } from '@/components/proforma';
import { formatDate } from '@/lib/utils';
import { useCurrency } from '@/lib/hooks/useCurrency';
import api from '@/lib/api';

interface ProformaListItem {
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
  signatureStatus?: 'PENDING' | 'SIGNED' | 'EXPIRED' | 'CANCELLED' | null;
}

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

interface ProformaCompleta {
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
  jobName?: string;
  jobLocation?: string;
  workDescription?: string;
  paymentTerms?: string;
  arquitectoNombre?: string;
  fechaPlanos?: string;
  telefonoTrabajo?: string;
  diasValidez?: number;
  detalles: DetalleProforma[];
}

export default function ProformasPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations('quotes');
  const router = useRouter();
  const { empresa } = useAuth();
  const { formatCurrency } = useCurrency();
  
  const [proformas, setProformas] = useState<ProformaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstados, setFilterEstados] = useState<string[]>([]);
  const [filterSignature, setFilterSignature] = useState<string>('');
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showSignatureFilter, setShowSignatureFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortKey, setSortKey] = useState<string>('fechaEmision');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [selectedProforma, setSelectedProforma] = useState<ProformaCompleta | null>(null);
  const [loadingProforma, setLoadingProforma] = useState(false);

  const loadProformas = useCallback(async () => {
    if (!empresa?.id) return;
    
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(search && { search }),
        ...(filterSignature && { signatureStatus: filterSignature }),
      });
      if (filterEstados.length > 0) {
        filterEstados.forEach(estado => params.append('estado', estado));
      }

      const response: any = await api.get(`/proformas?${params}`);
      const proformasData = response.data || [];
      
      // Mapear los datos para asegurar que cliente tenga el formato correcto
      const proformasMapped = proformasData.map((p: any) => ({
        ...p,
        cliente: {
          nombre: p.cliente?.razonSocial || p.cliente?.nombre || '',
          documento: p.cliente?.numeroDocumento || p.cliente?.documento || '',
        },
      }));
      
      setProformas(proformasMapped);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error loading proformas:', error);
    } finally {
      setLoading(false);
    }
  }, [empresa?.id, currentPage, search, filterEstados, filterSignature]);

  useEffect(() => {
    loadProformas();
  }, [loadProformas]);

  const loadProformaCompleta = async (id: string) => {
    try {
      setLoadingProforma(true);
      const response: any = await api.get(`/proformas/${id}`);
      
      const proformaData = response.data || response;
      
      // Validar que los datos existan
      if (!proformaData || !proformaData.cliente) {
        console.error('Invalid proforma data:', proformaData);
        alert('Error: No se pudieron cargar los datos de la proforma');
        return;
      }
      
      const proformaCompleta: ProformaCompleta = {
        ...proformaData,
        cliente: {
          id: proformaData.cliente.id || '',
          razonSocial: proformaData.cliente.razonSocial || proformaData.cliente.nombre || '',
          numeroDocumento: proformaData.cliente.numeroDocumento || proformaData.cliente.documento || '',
          tipoDocumento: proformaData.cliente.tipoDocumento || 'RUC',
          direccion: proformaData.cliente.direccion || '',
          email: proformaData.cliente.email || '',
        },
      };
      
      setSelectedProforma(proformaCompleta);
      setIsPrintPreviewOpen(true);
    } catch (error) {
      console.error('Error loading proforma:', error);
      alert('Error al cargar la proforma. Por favor, intente nuevamente.');
    } finally {
      setLoadingProforma(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const variants = {
      pendiente: 'warning' as const,
      aceptada: 'success' as const,
      rechazada: 'danger' as const,
      vencida: 'warning' as const,
      facturada: 'info' as const,
    };
    return variants[estado as keyof typeof variants] || 'default' as const;
  };

  const columns: Column<ProformaListItem>[] = [
    {
      key: 'numero',
      header: t('number'),
      sortable: true,
      render: (proforma) => (
        <span className="font-medium">{`${proforma.serie}-${proforma.numero}`}</span>
      ),
    },
    {
      key: 'cliente',
      header: t('client'),
      sortable: true,
      render: (proforma) => (
        <div>
          <div className="font-medium">{proforma.cliente.nombre}</div>
          <div className="text-sm text-gray-500">{proforma.cliente.documento}</div>
        </div>
      ),
    },
    {
      key: 'fechaEmision',
      header: t('issueDate'),
      sortable: true,
      render: (proforma) => formatDate(proforma.fechaEmision),
    },
    {
      key: 'fechaVencimiento',
      header: t('validUntil'),
      sortable: true,
      render: (proforma) => formatDate(proforma.fechaVencimiento),
    },
    {
      key: 'total',
      header: t('total'),
      sortable: true,
      render: (proforma) => (
        <span className="font-semibold">{formatCurrency(proforma.total)}</span>
      ),
    },
    {
      key: 'estado',
      header: t('status'),
      render: (proforma) => (
        <Badge variant={getEstadoBadge(proforma.estado)}>
          {t(`statuses.${proforma.estado}`)}
        </Badge>
      ),
    },
    {
      key: 'signatureStatus',
      header: t('signature'),
      render: (proforma) => {
        if (!proforma.signatureStatus) return <span className="text-gray-400 text-sm">-</span>;
        const signatureVariants = {
          PENDING: 'warning' as const,
          SIGNED: 'success' as const,
          EXPIRED: 'danger' as const,
          CANCELLED: 'default' as const,
        };
        const signatureLabels = {
          PENDING: t('signaturePending') || 'Pending',
          SIGNED: t('signed') || 'Signed',
          EXPIRED: t('signatureExpired') || 'Expired',
          CANCELLED: t('signatureCancelled') || 'Cancelled',
        };
        return (
          <Badge variant={signatureVariants[proforma.signatureStatus]}>
            {signatureLabels[proforma.signatureStatus]}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: (proforma) => (
        <div className="flex items-center justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              loadProformaCompleta(proforma.id);
            }}
            disabled={loadingProforma}
          >
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handleSort = (key: string, order: 'asc' | 'desc') => {
    setSortKey(key);
    setSortOrder(order);
  };

  const filteredProformas = proformas
    .filter((proforma) => {
      const matchesSearch = search === '' ||
        proforma.serie.toLowerCase().includes(search.toLowerCase()) ||
        proforma.numero.toLowerCase().includes(search.toLowerCase()) ||
        proforma.cliente.nombre.toLowerCase().includes(search.toLowerCase());
      
      const estadoLower = proforma.estado.toLowerCase();
      const matchesEstado = filterEstados.length === 0 || filterEstados.some(f => f.toLowerCase() === estadoLower);
      
      return matchesSearch && matchesEstado;
    })
    .sort((a, b) => {
      let aVal: any;
      let bVal: any;
      
      if (sortKey === 'cliente') {
        aVal = a.cliente.nombre.toLowerCase();
        bVal = b.cliente.nombre.toLowerCase();
      } else if (sortKey === 'numero') {
        aVal = `${a.serie}-${a.numero}`;
        bVal = `${b.serie}-${b.numero}`;
      } else {
        aVal = a[sortKey as keyof ProformaListItem];
        bVal = b[sortKey as keyof ProformaListItem];
      }
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  if (loading && proformas.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('description')}
          </p>
        </div>
        <Button 
          onClick={() => router.push(`/${locale}/proformas/nueva`)}
          className="px-6 py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <FileBarChart className="w-5 h-5 mr-2" />
          {t('create')}
        </Button>
      </div>

      {/* Filters */}
      <Card className="!p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <Button 
              variant={showStatusFilter ? "primary" : "outline"}
              onClick={() => setShowStatusFilter(!showStatusFilter)}
            >
              <Filter className="w-4 h-4 mr-2" />
              {t('filterStatus') || 'Filter Status'} {filterEstados.length > 0 && `(${filterEstados.length})`}
            </Button>
            <Button 
              variant={showSignatureFilter ? "primary" : "outline"}
              onClick={() => setShowSignatureFilter(!showSignatureFilter)}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {t('filterSignature') || 'Signature'} {filterSignature && '(1)'}
            </Button>
          </div>
          
          {/* Status Filter Chips */}
          {showStatusFilter && (
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              {[
                { value: 'pendiente', label: t('statuses.pendiente'), color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
                { value: 'rechazada', label: t('statuses.rechazada'), color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
                { value: 'vencida', label: t('statuses.vencida'), color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
                { value: 'facturada', label: t('statuses.facturada'), color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
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
          
          {/* Signature Filter Chips */}
          {showSignatureFilter && (
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              {[
                { value: '', label: t('all') || 'All', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300' },
                { value: 'PENDING', label: t('signaturePending') || 'Pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
                { value: 'SIGNED', label: t('signed') || 'Signed', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
                { value: 'EXPIRED', label: t('signatureExpired') || 'Expired', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
              ].map((status) => (
                <button
                  key={status.value}
                  onClick={() => setFilterSignature(status.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    filterSignature === status.value
                      ? `${status.color} ring-2 ring-offset-2 ring-primary-500 dark:ring-offset-gray-900`
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {filterSignature === status.value && (
                    <CheckCircle className="w-3 h-3 inline mr-1" />
                  )}
                  {status.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card>
        {proformas.length === 0 ? (
          <EmptyState
            title={t('noProformas')}
            description={t('noProformasDescription')}
            action={
              <Button onClick={() => router.push(`/${locale}/proformas/nueva`)}>
                <Plus className="h-5 w-5 mr-2" />
                {t('createFirst')}
              </Button>
            }
          />
        ) : (
          <DataTable
            data={filteredProformas}
            columns={columns}
            keyExtractor={(proforma) => proforma.id}
            onRowClick={(proforma) => router.push(`/${locale}/proformas/${proforma.id}`)}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSort={handleSort}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </Card>

      {/* Print Preview Modal */}
      {selectedProforma && (
        <ProformaPrintPreviewModal
          isOpen={isPrintPreviewOpen}
          onClose={() => {
            setIsPrintPreviewOpen(false);
            setSelectedProforma(null);
          }}
          proforma={selectedProforma}
          empresa={empresa!}
        />
      )}
    </div>
  );
}
