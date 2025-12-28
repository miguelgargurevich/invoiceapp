'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Plus, Search, Download, Edit, Trash2, Tag, Package, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Button,
  DataTable,
  Badge,
  Card,
  Modal,
  ConfirmDialog,
  Input,
  Textarea,
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
  categoria?: { id: string; nombre: string; color?: string };
  createdAt: string;
}

interface Categoria {
  id: string;
  nombre: string;
  descripcion?: string;
  color?: string;
  _count?: {
    productos: number;
  };
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
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
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
        ...(filterCategoria && { categoriaId: filterCategoria }),
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
  }, [empresa?.id, search, filterCategoria, currentPage]);

  const loadCategorias = useCallback(async () => {
    if (!empresa?.id) return;
    
    try {
      const params = new URLSearchParams({ empresaId: empresa.id });
      const response: any = await api.get(`/categorias?${params}`);
      const cats = response.data || response || [];
      setCategorias(cats);
    } catch (error) {
      console.error('Error loading categorias:', error);
      setCategorias([]);
    }
  }, [empresa?.id]);

  useEffect(() => {
    loadProductos();
    loadCategorias();
  }, [loadProductos, loadCategorias]);

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
    const headers = ['Code', 'Name', 'Description', 'Category', 'Unit', 'Price', 'Type'];

    const rows = filteredProductos.map(producto => [
      producto.codigo || '',
      producto.nombre || '',
      producto.descripcion || '',
      producto.categoria?.nombre || '',
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
      key: 'categoria',
      header: t('category'),
      render: (producto) => (
        producto.categoria ? (
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: producto.categoria.color || '#9ca3af' }}
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {producto.categoria.nombre}
            </span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )
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
      const matchesCategoria =
        !filterCategoria || p.categoria?.id === filterCategoria;
      return matchesSearch && matchesCategoria;
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
          <select
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{t('allCategories')}</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nombre}
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={() => setIsCategoryModalOpen(true)}>
            <Tag className="w-4 h-4 mr-2" />
            {t('manageCategories')}
          </Button>
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
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {producto.categoria?.nombre}
              </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatCurrency(producto.precioVenta)} / {producto.unidadMedida}
              </span>
            </div>
          </div>
        )}
      />

      {/* Category Management Modal */}
      <CategoryManagementModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categorias={categorias}
        empresa={empresa}
        onSave={() => {
          loadCategorias();
          loadProductos();
        }}
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

// Category Management Modal Component
function CategoryManagementModal({
  isOpen,
  onClose,
  categorias,
  empresa,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  categorias: Categoria[];
  empresa: any;
}) {
  const t = useTranslations('products');
  const [loading, setLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Categoria | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    color: '#3B82F6',
  });

  const handleAddClick = () => {
    setIsAddMode(true);
    setEditingCategory(null);
    setFormData({ nombre: '', descripcion: '', color: '#3B82F6' });
  };

  const handleEditClick = (categoria: Categoria) => {
    setIsAddMode(true);
    setEditingCategory(categoria);
    setFormData({
      nombre: categoria.nombre,
      descripcion: categoria.descripcion || '',
      color: categoria.color || '#3B82F6',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingCategory) {
        await api.put(`/categorias/${editingCategory.id}`, formData);
      } else {
        await api.post('/categorias', { ...formData, empresaId: empresa?.id });
      }
      setIsAddMode(false);
      setEditingCategory(null);
      setFormData({ nombre: '', descripcion: '', color: '#3B82F6' });
      onSave();
    } catch (error) {
      console.error('Error saving categoria:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (categoria: Categoria) => {
    if (!confirm(`Are you sure you want to delete "${categoria.nombre}"?`)) return;

    try {
      await api.delete(`/categorias/${categoria.id}`);
      onSave();
    } catch (error: any) {
      if (error.response?.status === 400) {
        alert('Cannot delete category with products');
      }
      console.error('Error deleting categoria:', error);
    }
  };

  const handleCancel = () => {
    setIsAddMode(false);
    setEditingCategory(null);
    setFormData({ nombre: '', descripcion: '', color: '#3B82F6' });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('categoryManagement')}
      size="lg"
    >
      <div className="space-y-4">
        {!isAddMode ? (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {categorias.length} categories
              </p>
              <Button onClick={handleAddClick} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                {t('addCategory')}
              </Button>
            </div>

            {categorias.length === 0 ? (
              <div className="text-center py-12">
                <Tag className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">{t('createFirstCategory')}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {categorias.map((categoria) => (
                  <div
                    key={categoria.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: categoria.color || '#3B82F6' }}
                      />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {categoria.nombre}
                        </p>
                        {categoria.descripcion && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {categoria.descripcion}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditClick(categoria)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleDelete(categoria)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t('categoryName')}
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
            />

            <Textarea
              label={t('categoryDescription')}
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={2}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('categoryColor')}
              </label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-20 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
