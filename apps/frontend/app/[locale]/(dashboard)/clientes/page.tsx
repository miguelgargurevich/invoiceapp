'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Search, Filter, Download, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Button,
  DataTable,
  Card,
  Modal,
  ConfirmDialog,
  Input,
  EmptyClients,
  type Column,
} from '@/components/common';
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
  const { empresa } = useAuth();
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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
      // Mock data for development
      setClientes([
        {
          id: '1',
          tipoDocumento: 'RUC',
          documento: '20123456789',
          nombre: 'Empresa ABC S.A.C.',
          direccion: 'Av. Principal 123, Lima',
          email: 'contacto@empresaabc.com',
          telefono: '01-1234567',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          tipoDocumento: 'RUC',
          documento: '20987654321',
          nombre: 'Comercial Lima E.I.R.L.',
          direccion: 'Jr. Comercio 456, San Isidro',
          email: 'ventas@comerciallima.com',
          telefono: '01-9876543',
          createdAt: new Date().toISOString(),
        },
        {
          id: '3',
          tipoDocumento: 'DNI',
          documento: '12345678',
          nombre: 'Juan Pérez García',
          direccion: 'Calle Las Flores 789, Miraflores',
          email: 'juan.perez@email.com',
          telefono: '987654321',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [empresa?.id, search, currentPage]);

  useEffect(() => {
    loadClientes();
  }, [loadClientes]);

  const handleEdit = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsModalOpen(true);
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
      className: 'w-20',
      render: (cliente) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(cliente);
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={t('edit')}
          >
            <Edit className="w-4 h-4 text-gray-500" />
          </button>
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

  const filteredClientes = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      c.documento.includes(search)
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
          onClick={() => {
            setSelectedCliente(null);
            setIsModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('addClient')}
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
          <div className="flex gap-2">
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              {t('filter')}
            </Button>
            <Button variant="outline">
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
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('addFirstClient')}
              </Button>
            }
          />
        }
        onRowClick={(c) => handleEdit(c)}
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

      {/* Client Modal */}
      <ClientModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCliente(null);
        }}
        cliente={selectedCliente}
        onSave={() => {
          setIsModalOpen(false);
          setSelectedCliente(null);
          loadClientes();
        }}
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

// Client Modal Component
interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: Cliente | null;
  onSave: () => void;
}

function ClientModal({ isOpen, onClose, cliente, onSave }: ClientModalProps) {
  const t = useTranslations('clients');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tipoDocumento: 'RUC',
    documento: '',
    nombre: '',
    direccion: '',
    email: '',
    telefono: '',
  });

  useEffect(() => {
    if (cliente) {
      setFormData({
        tipoDocumento: cliente.tipoDocumento,
        documento: cliente.documento,
        nombre: cliente.nombre,
        direccion: cliente.direccion || '',
        email: cliente.email || '',
        telefono: cliente.telefono || '',
      });
    } else {
      setFormData({
        tipoDocumento: 'RUC',
        documento: '',
        nombre: '',
        direccion: '',
        email: '',
        telefono: '',
      });
    }
  }, [cliente, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (cliente) {
        await api.put(`/clientes/${cliente.id}`, formData);
      } else {
        await api.post('/clientes', formData);
      }
      onSave();
    } catch (error) {
      console.error('Error saving cliente:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={cliente ? t('editClient') : t('addClient')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('documentType')}
            </label>
            <select
              value={formData.tipoDocumento}
              onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="RUC">RUC</option>
              <option value="DNI">DNI</option>
              <option value="CE">Carnet de Extranjería</option>
              <option value="PASAPORTE">Pasaporte</option>
            </select>
          </div>
          
          <Input
            label={t('documentNumber')}
            value={formData.documento}
            onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
            required
          />
        </div>

        <Input
          label={t('name')}
          value={formData.nombre}
          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
          required
        />

        <Input
          label={t('address')}
          value={formData.direccion}
          onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={t('email')}
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          
          <Input
            label={t('phone')}
            value={formData.telefono}
            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
          />
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
