'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, Download, Eye, Printer } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Button,
  DataTable,
  Badge,
  Card,
  EmptyState,
  type Column,
} from '@/components/common';
import { formatCurrency, formatDate } from '@/lib/utils';
import api from '@/lib/api';

interface Proforma {
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
}

export default function ProformasPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations('quotes');
  const router = useRouter();
  const { empresa } = useAuth();
  
  const [proformas, setProformas] = useState<Proforma[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadProformas = useCallback(async () => {
    if (!empresa?.id) return;
    
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(search && { search }),
        ...(filterEstado && { estado: filterEstado }),
      });

      const response: any = await api.get(`/proformas?${params}`);
      setProformas(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error loading proformas:', error);
    } finally {
      setLoading(false);
    }
  }, [empresa?.id, currentPage, search, filterEstado]);

  useEffect(() => {
    loadProformas();
  }, [loadProformas]);

  const getEstadoBadge = (estado: string) => {
    const variants = {
      pendiente: 'warning' as const,
      aprobada: 'success' as const,
      rechazada: 'danger' as const,
      convertida: 'info' as const,
    };
    return variants[estado as keyof typeof variants] || 'default' as const;
  };

  const columns: Column<Proforma>[] = [
    {
      key: 'numero',
      header: t('number'),
      render: (proforma) => (
        <span className="font-medium">{`${proforma.serie}-${proforma.numero}`}</span>
      ),
    },
    {
      key: 'cliente',
      header: t('client'),
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
      render: (proforma) => formatDate(proforma.fechaEmision),
    },
    {
      key: 'fechaVencimiento',
      header: t('validUntil'),
      render: (proforma) => formatDate(proforma.fechaVencimiento),
    },
    {
      key: 'total',
      header: t('total'),
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
      key: 'actions',
      header: '',
      render: (proforma) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/${locale}/proformas/${proforma.id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDownload(proforma.id)}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const handleDownload = async (id: string) => {
    try {
      const response: any = await api.get(`/proformas/${id}/pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `proforma-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading proforma:', error);
    }
  };

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
          className="px-6 py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
        >
          <Plus className="w-5 h-5 mr-2" />
          {t('create')}
        </Button>
      </div>

      {/* Filters */}
      <Card className="!p-4">
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
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">{t('allStatuses')}</option>
            <option value="pendiente">{t('statuses.pendiente')}</option>
            <option value="aprobada">{t('statuses.aprobada')}</option>
            <option value="rechazada">{t('statuses.rechazada')}</option>
            <option value="convertida">{t('statuses.convertida')}</option>
          </select>
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
            data={proformas}
            columns={columns}
            keyExtractor={(proforma) => proforma.id}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </Card>
    </div>
  );
}
