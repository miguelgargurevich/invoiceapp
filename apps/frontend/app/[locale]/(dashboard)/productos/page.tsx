'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, Download, Edit, Trash2 } from 'lucide-react';
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
  categoria?: { id: string; nombre: string };
  createdAt: string;
}

interface Categoria {
  id: string;
  nombre: string;
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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
      setCategorias(response.data || []);
    } catch (error) {
      console.error('Error loading categorias:', error);
      setCategorias([
        { id: '1', nombre: 'Servicios' },
        { id: '2', nombre: 'Equipos' },
        { id: '3', nombre: 'Licencias' },
      ]);
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
        <Badge variant="neutral" size="sm">
          {producto.categoria?.nombre || '-'}
        </Badge>
      ),
    },
    {
      key: 'tipo',
      header: t('type'),
      render: (producto) => (
        <Badge
          variant={producto.tipo === 'SERVICIO' ? 'info' : 'success'}
          size="sm"
        >
          {producto.tipo}
        </Badge>
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

  const filteredProductos = productos.filter((p) => {
    const matchesSearch =
      (p.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.codigo || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategoria =
      !filterCategoria || p.categoria?.id === filterCategoria;
    return matchesSearch && matchesCategoria;
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
          <Plus className="w-5 h-5 mr-2" />
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
          <Button variant="outline">
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
                <Plus className="w-4 h-4 mr-2" />
                {t('addFirstProduct')}
              </Button>
            }
          />
        }
        onRowClick={(p) => handleEdit(p)}
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
      
      if (producto) {
        await api.put(`/productos/${producto.id}`, payload);
      } else {
        await api.post('/productos', payload);
      }
      onSave();
    } catch (error) {
      console.error('Error saving producto:', error);
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
