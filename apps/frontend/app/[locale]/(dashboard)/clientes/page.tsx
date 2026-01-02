'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { Search, Filter, Download, Trash2, UserPlus, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import {
  Button,
  DataTable,
  Card,
  ConfirmDialog,
  EmptyClients,
  type Column,
} from '@/components/common';
import { UsageLimitModal, UsageLimitWarning } from '@/components/common/UpgradePrompt';
import api from '@/lib/api';

interface Cliente {
  id: string;
  tipoDocumento: string;
  documento: string;
  nombre: string;
  direccion: string;
  email: string;
  telefono: string;
  createdAt: string;
}

export default function ClientesPage() {
  const t = useTranslations('clients');
  const tSub = useTranslations('subscriptionFeatures');
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const { empresa } = useAuth();
  const { subscription, usage, plan, loading: subscriptionLoading } = useSubscription();
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortKey, setSortKey] = useState<string>('nombre');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Modal state for client limit
  const [showLimitModal, setShowLimitModal] = useState(false);
  
  // Check client limits
  const clientsLimit = plan?.maxClients ?? 10;
  const clientsUsed = usage?.clientsCount ?? 0;
  const canCreateClient = clientsLimit === -1 || clientsUsed < clientsLimit;
  
  const handleCreateClick = () => {
    if (!canCreateClient) {
      setShowLimitModal(true);
      return;
    }
    router.push(`/${locale}/clientes/nuevo`);
  };

  const loadClientes = useCallback(async () => {
    if (!empresa?.id) return;
    
    try {
      setLoading(true);
      const response = await api.get<{ data: Cliente[], pagination: { totalPages: number } }>('/clientes', {
        empresaId: empresa.id,
        search,
        page: currentPage.toString(),
        limit: '10',
      });
      setClientes((response as any).data || []);
      setTotalPages((response as any).pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error loading clientes:', error);
      setClientes([]);
    } finally {
      setLoading(false);
    }
  }, [empresa?.id, search, currentPage]);

  useEffect(() => {
    loadClientes();
  }, [loadClientes]);

  const handleView = (cliente: Cliente) => {
    router.push(`/${locale}/clientes/${cliente.id}`);
  };

  const handleDelete = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedCliente) return;
    
    try {
      await api.delete(`/clientes/${selectedCliente.id}`);
      loadClientes();
    } catch (error) {
      console.error('Error deleting cliente:', error);
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedCliente(null);
    }
  };

  const handleExport = () => {
    try {
      const headers = [
        t('documentType'),
        t('documentNumber'),
        t('name'),
        t('address'),
        t('email'),
        t('phone')
      ];

      const rows = filteredClientes.map(c => [
        c.tipoDocumento,
        c.documento,
        c.nombre,
        c.direccion || '',
        c.email || '',
        c.telefono || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting clientes:', error);
    }
  };

  const columns: Column<Cliente>[] = [
    {
      key: 'documento',
      header: t('document'),
      sortable: true,
      render: (cliente) => (
        <div>
          <span className="text-xs text-gray-500 dark:text-gray-400 block">
            {cliente.tipoDocumento}
          </span>
          <span className="font-medium">{cliente.documento}</span>
        </div>
      ),
    },
    {
      key: 'nombre',
      header: t('name'),
      sortable: true,
      render: (cliente) => (
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {cliente.nombre}
        </span>
      ),
    },
    {
      key: 'email',
      header: t('email'),
      render: (cliente) => (
        <span className="text-gray-600 dark:text-gray-400">
          {cliente.email || '-'}
        </span>
      ),
    },
    {
      key: 'telefono',
      header: t('phone'),
      render: (cliente) => (
        <span className="text-gray-600 dark:text-gray-400">
          {cliente.telefono || '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: (cliente) => (
        <div className="flex items-center justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(cliente);
            }}
            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title={t('delete')}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      ),
    },
  ];

  const handleSort = (key: string, order: 'asc' | 'desc') => {
    setSortKey(key);
    setSortOrder(order);
  };

  const filteredClientes = clientes
    .filter(
      (c) =>
        (c.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.documento || '').includes(search)
    )
    .sort((a, b) => {
      let aVal: any = a[sortKey as keyof Cliente];
      let bVal: any = b[sortKey as keyof Cliente];
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
            <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
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
          onClick={handleCreateClick}
          className="px-6 py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          {t('addClient')}
        </Button>
      </div>

      {/* Usage limit warning */}
      <UsageLimitWarning 
        resource={t('title').toLowerCase()} 
        used={clientsUsed} 
        limit={clientsLimit} 
      />

      {/* Limit Modal when client limit reached */}
      <UsageLimitModal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        resource={t('title').toLowerCase()}
        used={clientsUsed}
        limit={clientsLimit}
      />

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
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              {t('export')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <DataTable
        data={filteredClientes}
        columns={columns}
        keyExtractor={(c) => c.id}
        isLoading={loading}
        emptyState={
          <EmptyClients
            action={
              <Button onClick={handleCreateClick}>
                <UserPlus className="w-4 h-4 mr-2" />
                {t('addFirstClient')}
              </Button>
            }
          />
        }
        onRowClick={(c) => handleView(c)}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={handleSort}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        renderMobileCard={(cliente) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {cliente.nombre}
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {cliente.tipoDocumento}: {cliente.documento}
                </p>
              </div>
            </div>
            {cliente.email && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {cliente.email}
              </p>
            )}
            {cliente.telefono && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {cliente.telefono}
              </p>
            )}
          </div>
        )}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title={t('deleteTitle')}
        message={t('deleteMessage', { name: selectedCliente?.nombre || '' })}
        variant="danger"
      />
    </div>
  );
}
