'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, Download, Edit, Trash2, Tag, Package } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Button,
  DataTable,
  Badge,
  Card,
  Modal,
  ConfirmDialog,
  Input,
  Select,
  Textarea,
  EmptyProducts,
  type Column,
} from '@/components/common';
import { formatCurrency } from '@/lib/utils';
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
  const { empresa } = useAuth();
  
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
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
      // Mock data for development
      setProductos([
        {
          id: '1',
          codigo: 'PROD001',
          nombre: 'Servicio de Consultoría',
          descripcion: 'Servicio de consultoría empresarial por hora',
          precioVenta: 150.00,
          unidadMedida: 'HORA',
          tipo: 'SERVICIO',
          afectoIgv: true,
          categoria: { id: '1', nombre: 'Servicios' },
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          codigo: 'PROD002',
          nombre: 'Laptop HP ProBook',
          descripcion: 'Laptop HP ProBook 450 G8, Core i5, 8GB RAM',
          precioVenta: 2500.00,
          unidadMedida: 'UNIDAD',
          tipo: 'PRODUCTO',
          afectoIgv: true,
          categoria: { id: '2', nombre: 'Equipos' },
          createdAt: new Date().toISOString(),
        },
        {
          id: '3',
          codigo: 'PROD003',
          nombre: 'Mantenimiento Mensual',
          descripcion: 'Servicio de mantenimiento de sistemas mensual',
          precioVenta: 800.00,
          unidadMedida: 'MES',
          tipo: 'SERVICIO',
          afectoIgv: true,
          categoria: { id: '1', nombre: 'Servicios' },
          createdAt: new Date().toISOString(),
        },
      ]);
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
      console.log('[PRODUCTOS] Categorias loaded:', cats);
      setCategorias(cats);
    } catch (error) {
      console.error('[PRODUCTOS] Error loading categorias:', error);
      // Set empty array to ensure filter works
      setCategorias([]);
    }
  }, [empresa?.id]);

  useEffect(() => {
    loadProductos();
    loadCategorias();
  }, [loadProductos, loadCategorias]);

  const handleEdit = (producto: Producto) => {
    setSelectedProducto(producto);
    setIsModalOpen(true);
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
    const headers = [
      t('productos.codigo'),
      t('productos.nombre'),
      t('productos.descripcion'),
      t('productos.categoria'),
      t('productos.unidadMedida'),
      t('productos.precioVenta'),
      t('productos.tipo')
    ];

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
      className: 'w-20',
      render: (producto) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(producto);
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={t('edit')}
          >
            <Edit className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(producto);
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
          onClick={() => {
            setSelectedProducto(null);
            setIsModalOpen(true);
          }}
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
              <Button onClick={() => setIsModalOpen(true)}>
                <Package className="w-4 h-4 mr-2" />
                {t('addFirstProduct')}
              </Button>
            }
          />
        }
        onRowClick={(p) => handleEdit(p)}
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

      {/* Product Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProducto(null);
        }}
        producto={selectedProducto}
        categorias={categorias}
        onSave={() => {
          setIsModalOpen(false);
          setSelectedProducto(null);
          loadProductos();
        }}
        locale={locale}
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
        title={t('deleteTitle')}
        message={t('deleteMessage', { name: selectedProducto?.nombre || '' })}
        confirmLabel={t('delete')}
        variant="danger"
      />
    </div>
  );
}

// Product Modal Component
interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  producto: Producto | null;
  categorias: Categoria[];
  onSave: () => void;
  locale: string;
}

function ProductModal({ isOpen, onClose, producto, categorias, onSave, locale }: ProductModalProps) {
  const t = useTranslations('products');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    precioVenta: '',
    unidadMedida: 'UNIDAD',
    tipo: 'PRODUCTO',
    afectoIgv: true,
    categoriaId: '',
  });

  useEffect(() => {
    if (producto) {
      setFormData({
        codigo: producto.codigo,
        nombre: producto.nombre,
        descripcion: producto.descripcion || '',
        precioVenta: producto.precioVenta.toString(),
        unidadMedida: producto.unidadMedida,
        tipo: producto.tipo,
        afectoIgv: producto.afectoIgv,
        categoriaId: producto.categoria?.id || '',
      });
    } else {
      setFormData({
        codigo: '',
        nombre: '',
        descripcion: '',
        precioVenta: '',
        unidadMedida: 'UNIDAD',
        tipo: 'PRODUCTO',
        afectoIgv: true,
        categoriaId: '',
      });
    }
  }, [producto, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        ...formData,
        precioVenta: parseFloat(formData.precioVenta),
        categoriaId: formData.categoriaId || null,
      };
      
      console.log('[PRODUCTO MODAL] Saving product:', payload);
      
      if (producto) {
        await api.put(`/productos/${producto.id}`, payload);
        console.log('[PRODUCTO MODAL] Product updated successfully');
      } else {
        await api.post('/productos', payload);
        console.log('[PRODUCTO MODAL] Product created successfully');
      }
      onSave();
      onClose();
    } catch (error: any) {
      console.error('[PRODUCTO MODAL] Error saving producto:', error);
      alert(error.response?.data?.error || 'Error al guardar el producto');
    } finally {
      setLoading(false);
    }
  };

  const unidades = [
    { value: 'UNIDAD', label: 'Unidad' },
    { value: 'HORA', label: 'Hora' },
    { value: 'DIA', label: 'Día' },
    { value: 'MES', label: 'Mes' },
    { value: 'KG', label: 'Kilogramo' },
    { value: 'LT', label: 'Litro' },
    { value: 'MT', label: 'Metro' },
    { value: 'M2', label: 'Metro cuadrado' },
    { value: 'SERVICIO', label: 'Servicio' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={producto ? t('editProduct') : t('addProduct')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={t('code')}
            value={formData.codigo}
            onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('category')}
            </label>
            <select
              value={formData.categoriaId}
              onChange={(e) => setFormData({ ...formData, categoriaId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">{t('noCategory')}</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Input
          label={t('name')}
          value={formData.nombre}
          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          required
        />

        <Textarea
          label={t('description')}
          value={formData.descripcion}
          onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
          rows={2}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('type')}
            </label>
            <select
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="PRODUCTO">{t('typeProduct')}</option>
              <option value="SERVICIO">{t('typeService')}</option>
            </select>
          </div>
          
          <Input
            label={t('price')}
            type="number"
            step="0.01"
            min="0"
            value={formData.precioVenta}
            onChange={(e) => setFormData({ ...formData, precioVenta: e.target.value })}
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('unit')}
            </label>
            <select
              value={formData.unidadMedida}
              onChange={(e) => setFormData({ ...formData, unidadMedida: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {unidades.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="afectoIgv"
            checked={formData.afectoIgv}
            onChange={(e) => setFormData({ ...formData, afectoIgv: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="afectoIgv" className="text-sm text-gray-700 dark:text-gray-300">
            {t('taxable')}
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? t('saving') : t('save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Category Management Modal Component
function CategoryManagementModal({
  isOpen,
  onClose,
  onSave,
  categorias,
  empresa,
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
        alert(t('messages.categoryUpdated'));
      } else {
        await api.post('/categorias', { ...formData, empresaId: empresa?.id });
        alert(t('messages.categoryCreated'));
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
    if (!confirm(t('deleteCategoryMessage', { name: categoria.nombre }))) return;

    try {
      await api.delete(`/categorias/${categoria.id}`);
      alert(t('messages.categoryDeleted'));
      onSave();
    } catch (error: any) {
      if (error.response?.status === 400) {
        alert(t('messages.categoryHasProducts'));
      } else {
        alert('Error al eliminar categoría');
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
                {categorias.length === 0 ? t('noCategoriesYet') : t('productsCount', { count: categorias.length })}
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
                        title={t('edit')}
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleDelete(categoria)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title={t('delete')}
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
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? t('saving') : t('save')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
