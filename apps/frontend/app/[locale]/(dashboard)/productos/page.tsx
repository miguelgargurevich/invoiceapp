'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Search, Download, Trash2, Package, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Button,
  DataTable,
  Badge,
  Card,
  ConfirmDialog,
  EmptyProducts,
  type Column,
} from '@/components/common';
import { useCurrency } from '@/lib/hooks/useCurrency';
import api from '@/lib/api';

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  precioVenta: number;
  unidadMedida: string;
  tipo: string;
  afectoIgv: boolean;
  createdAt: string;
}



export default function ProductosPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations('products');
  const router = useRouter();
  const { empresa } = useAuth();
  const { formatCurrency } = useCurrency();
  
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortKey, setSortKey] = useState<string>('nombre');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const loadProductos = useCallback(async () => {
    if (!empresa?.id) return;
    
    try {
      setLoading(true);
      const params = new URLSearchParams({
        empresaId: empresa.id,
        search,
        page: currentPage.toString(),
        limit: '10',
      });
      const response: any = await api.get(`/productos?${params}`);
      setProductos(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error loading productos:', error);
      setProductos([]);
    } finally {
      setLoading(false);
    }
  }, [empresa?.id, search, currentPage]);

  useEffect(() => {
    loadProductos();
  }, [loadProductos]);

  const handleView = (producto: Producto) => {
    router.push(`/${locale}/productos/${producto.id}`);
  };

  const handleDelete = (producto: Producto) => {
    setSelectedProducto(producto);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedProducto) return;
    
    try {
      await api.delete(`/productos/${selectedProducto.id}`);
      loadProductos();
    } catch (error) {
      console.error('Error deleting producto:', error);
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedProducto(null);
    }
  };

  const handleExport = () => {
    const headers = ['Code', 'Name', 'Description', 'Unit', 'Price', 'Type'];

    const rows = filteredProductos.map(producto => [
      producto.codigo || '',
      producto.nombre || '',
      producto.descripcion || '',
      producto.unidadMedida || '',
      producto.precioVenta?.toString() || '0',
      producto.tipo || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `productos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns: Column<Producto>[] = [
    {
      key: 'codigo',
      header: t('code'),
      sortable: true,
      render: (producto) => (
        <span className="font-mono text-sm">{producto.codigo}</span>
      ),
    },
    {
      key: 'nombre',
      header: t('name'),
      sortable: true,
      render: (producto) => (
        <div>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {producto.nombre}
          </span>
          {producto.descripcion && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
              {producto.descripcion}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'tipo',
      header: t('type'),
      render: (producto) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          producto.tipo === 'PRODUCTO' 
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
            : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
        }`}>
          {producto.tipo === 'PRODUCTO' ? t('typeProduct') : t('typeService')}
        </span>
      ),
    },
    {
      key: 'precioVenta',
      header: t('price'),
      sortable: true,
      className: 'text-right',
      render: (producto) => (
        <span className="font-medium">
          {formatCurrency(producto.precioVenta)}
        </span>
      ),
    },
    {
      key: 'unidadMedida',
      header: t('unit'),
      render: (producto) => (
        <span className="text-gray-600 dark:text-gray-400">
          {producto.unidadMedida}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (producto) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleView(producto);
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="View"
          >
            <Eye className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(producto);
            }}
            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Delete"
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

  const filteredProductos = productos
    .filter((p) => {
      const matchesSearch =
        (p.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.codigo || '').toLowerCase().includes(search.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      let aVal: any = a[sortKey as keyof Producto];
      let bVal: any = b[sortKey as keyof Producto];
      
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('subtitle')}
          </p>
        </div>
        <Button
          onClick={() => router.push(`/${locale}/productos/nuevo`)}
          className="px-6 py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
        >
          <Package className="w-5 h-5 mr-2" />
          {t('addProduct')}
        </Button>
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
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            {t('export')}
          </Button>
        </div>
      </Card>

      {/* Table */}
      <DataTable
        data={filteredProductos}
        columns={columns}
        keyExtractor={(p) => p.id}
        isLoading={loading}
        emptyState={
          <EmptyProducts
            action={
              <Button onClick={() => router.push(`/${locale}/productos/nuevo`)}>
                <Package className="w-4 h-4 mr-2" />
                {t('addFirstProduct')}
              </Button>
            }
          />
        }
        onRowClick={(p) => handleView(p)}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={handleSort}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        renderMobileCard={(producto) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                  {producto.codigo}
                </span>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {producto.nombre}
                </p>
              </div>
              <Badge
                variant={producto.tipo === 'SERVICIO' ? 'info' : 'success'}
                size="sm"
              >
                {producto.tipo}
              </Badge>
            </div>
            <div className="flex items-center justify-end">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatCurrency(producto.precioVenta)} / {producto.unidadMedida}
              </span>
            </div>
          </div>
        )}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${selectedProducto?.nombre}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
