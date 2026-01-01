'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Users, 
  Building2, 
  FileText, 
  TrendingUp, 
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Search
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Card, LoadingPage, Badge, Button, Input, ConfirmDialog } from '@/components/common';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalEmpresas: number;
  totalFacturas: number;
  totalProformas: number;
  totalClientes: number;
  totalProductos: number;
}

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  isActive: boolean;
  createdAt: string;
  empresa?: {
    id: string;
    nombre: string;
    ruc: string;
    email: string | null;
  } | null;
}

interface Empresa {
  id: string;
  nombre: string;
  ruc: string;
  email: string | null;
  createdAt: string;
  userId: string;
  _count?: {
    facturas: number;
    proformas: number;
    clientes: number;
    productos: number;
  };
}

export default function AdminPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations('admin');
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'companies'>('overview');
  const [searchUsers, setSearchUsers] = useState('');
  const [searchEmpresas, setSearchEmpresas] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [empresaPage, setEmpresaPage] = useState(1);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    userId: string;
    userName: string;
    currentStatus: boolean;
  }>({ open: false, userId: '', userName: '', currentStatus: true });

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const response: any = await api.get('/admin/stats');
      setStats(response.stats);
      setUsers(response.recentUsers || []);
      setEmpresas(response.recentEmpresas || []);
    } catch (error: any) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async (page: number = 1, search: string = '') => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search })
      });
      const response: any = await api.get(`/admin/users?${params}`);
      setUsers(response.users || []);
      setUserPage(page);
    } catch (error: any) {
      console.error('Error loading users:', error);
    }
  };

  const loadEmpresas = async (page: number = 1, search: string = '') => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search })
      });
      const response: any = await api.get(`/admin/empresas?${params}`);
      setEmpresas(response.empresas || []);
      setEmpresaPage(page);
    } catch (error: any) {
      console.error('Error loading empresas:', error);
    }
  };

  const toggleUserStatus = async () => {
    try {
      const { userId, currentStatus, userName } = confirmDialog;
      
      await api.patch(`/admin/users/${userId}/status`, {
        isActive: !currentStatus
      });
      
      showToast(
        currentStatus 
          ? t('userDeactivatedSuccess') || `User ${userName} has been deactivated`
          : t('userActivatedSuccess') || `User ${userName} has been activated`,
        'success'
      );
      
      await loadUsers(userPage, searchUsers);
      setConfirmDialog({ open: false, userId: '', userName: '', currentStatus: true });
    } catch (error: any) {
      console.error('Error updating user status:', error);
      
      const errorMessage = error.message === 'Bad Request'
        ? t('cannotChangeOwnStatus') || 'You cannot change your own status'
        : t('errorUpdatingStatus') || 'Error updating user status';
      
      showToast(errorMessage, 'error');
      setConfirmDialog({ open: false, userId: '', userName: '', currentStatus: true });
    }
  };

  const openConfirmDialog = (userId: string, userName: string, currentStatus: boolean) => {
    setConfirmDialog({ open: true, userId, userName, currentStatus });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'danger';
      case 'ADMIN':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Super Admin';
      case 'ADMIN':
        return 'Admin';
      default:
        return 'User';
    }
  };

  if (loading) {
    return <LoadingPage />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Shield className="w-8 h-8 text-red-600" />
            {t('title') || 'Admin Panel'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('subtitle') || 'System administration and management'}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'overview'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          {t('overview') || 'Overview'}
        </button>
        <button
          onClick={() => {
            setActiveTab('users');
            loadUsers();
          }}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'users'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          {t('users') || 'Users'}
        </button>
        <button
          onClick={() => {
            setActiveTab('companies');
            loadEmpresas();
          }}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'companies'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          {t('companies') || 'Companies'}
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    {t('totalUsers') || 'Total Users'}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.totalUsers}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {stats.activeUsers} {t('active') || 'active'}
                  </div>
                </div>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    {t('totalCompanies') || 'Companies'}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.totalEmpresas}
                  </div>
                </div>
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    {t('totalInvoices') || 'Invoices'}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.totalFacturas}
                  </div>
                </div>
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    {t('totalProposals') || 'Proposals'}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.totalProformas}
                  </div>
                </div>
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Users */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('recentUsers') || 'Recent Users'}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {t('user') || 'User'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {t('role') || 'Role'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {t('status') || 'Status'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {t('joined') || 'Joined'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {user.name || user.email}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getRoleBadgeVariant(user.role)} size="sm">
                          {getRoleLabel(user.role)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {user.isActive ? (
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            {t('active') || 'Active'}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm">
                            <XCircle className="w-4 h-4" />
                            {t('inactive') || 'Inactive'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(user.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Recent Companies */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t('recentCompanies') || 'Recent Companies'}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {t('company') || 'Company'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      RUC
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {t('email') || 'Email'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {t('created') || 'Created'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {empresas.map((empresa) => (
                    <tr key={empresa.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                        {empresa.nombre}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {empresa.ruc}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {empresa.email || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(empresa.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder={t('searchUsers') || 'Search users...'}
                  value={searchUsers}
                  onChange={(e) => {
                    setSearchUsers(e.target.value);
                    loadUsers(1, e.target.value);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {t('user') || 'User'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {t('company') || 'Company'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {t('role') || 'Role'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {t('status') || 'Status'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {t('actions') || 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {user.name || user.email}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {user.empresa?.nombre || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getRoleBadgeVariant(user.role)} size="sm">
                          {getRoleLabel(user.role)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {user.isActive ? (
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            {t('active') || 'Active'}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm">
                            <XCircle className="w-4 h-4" />
                            {t('inactive') || 'Inactive'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openConfirmDialog(user.id, user.name || user.email, user.isActive)}
                        >
                          {user.isActive ? t('deactivate') || 'Deactivate' : t('activate') || 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Companies Tab */}
      {activeTab === 'companies' && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder={t('searchCompanies') || 'Search companies...'}
                  value={searchEmpresas}
                  onChange={(e) => {
                    setSearchEmpresas(e.target.value);
                    loadEmpresas(1, e.target.value);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {t('company') || 'Company'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      RUC
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {t('email') || 'Email'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {t('stats') || 'Stats'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {t('created') || 'Created'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {empresas.map((empresa) => (
                    <tr key={empresa.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                        {empresa.nombre}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {empresa.ruc}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {empresa.email || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {empresa._count && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {empresa._count.facturas} inv, {empresa._count.proformas} prop
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(empresa.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, userId: '', userName: '', currentStatus: true })}
        onConfirm={toggleUserStatus}
        title={confirmDialog.currentStatus ? t('confirmDeactivate') || 'Confirm Deactivation' : t('confirmActivate') || 'Confirm Activation'}
        message={
          confirmDialog.currentStatus
            ? t('confirmDeactivateMessage') || `Are you sure you want to deactivate user "${confirmDialog.userName}"? They will no longer be able to access the system.`
            : t('confirmActivateMessage') || `Are you sure you want to activate user "${confirmDialog.userName}"? They will regain access to the system.`
        }
        confirmText={confirmDialog.currentStatus ? t('deactivate') || 'Deactivate' : t('activate') || 'Activate'}
        cancelText={t('cancel') || 'Cancel'}
        variant={confirmDialog.currentStatus ? 'danger' : 'warning'}
      />
    </div>
  );
}
