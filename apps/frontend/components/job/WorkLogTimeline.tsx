'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Clock, User, Calendar, Edit2, Trash2, Save, X } from 'lucide-react';
import { Button, Input, Textarea, Card } from '@/components/common';
import { workLogsApi, type WorkLog } from '@/lib/jobTracking';

interface WorkLogTimelineProps {
  documentType: 'factura' | 'proforma';
  documentId: string;
}

export function WorkLogTimeline({ documentType, documentId }: WorkLogTimelineProps) {
  const t = useTranslations();
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    descripcion: '',
    horasTrabajadas: '',
    trabajador: '',
    observaciones: '',
  });

  const loadWorkLogs = async () => {
    try {
      setLoading(true);
      const logs = documentType === 'factura'
        ? await workLogsApi.getByFactura(documentId)
        : await workLogsApi.getByProforma(documentId);
      setWorkLogs(logs);
    } catch (error) {
      console.error('Error loading work logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, documentType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const data = {
        [documentType === 'factura' ? 'facturaId' : 'proformaId']: documentId,
        fecha: formData.fecha,
        descripcion: formData.descripcion,
        horasTrabajadas: formData.horasTrabajadas ? parseFloat(formData.horasTrabajadas) : undefined,
        trabajador: formData.trabajador || undefined,
        observaciones: formData.observaciones || undefined,
      };

      if (editingId) {
        await workLogsApi.update(editingId, data);
      } else {
        await workLogsApi.create(data);
      }

      resetForm();
      await loadWorkLogs();
    } catch (error) {
      console.error('Error saving work log:', error);
    }
  };

  const handleEdit = (log: WorkLog) => {
    setEditingId(log.id);
    setFormData({
      fecha: log.fecha.split('T')[0],
      descripcion: log.descripcion,
      horasTrabajadas: log.horasTrabajadas?.toString() || '',
      trabajador: log.trabajador || '',
      observaciones: log.observaciones || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.confirmDelete'))) return;
    
    try {
      await workLogsApi.delete(id);
      await loadWorkLogs();
    } catch (error) {
      console.error('Error deleting work log:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      descripcion: '',
      horasTrabajadas: '',
      trabajador: '',
      observaciones: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <Card>
        <Card.Header>
          <Card.Title>{t('workLog.title')}</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="text-center py-8 text-gray-500">{t('common.loading')}</div>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header className="flex flex-row items-center justify-between">
        <Card.Title>{t('workLog.title')}</Card.Title>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          variant={showForm ? 'outline' : 'primary'}
        >
          {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showForm ? t('common.cancel') : t('workLog.addEntry')}
        </Button>
      </Card.Header>
      
      <Card.Content>
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input
                label={t('workLog.date')}
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                required
              />
              <Input
                label={t('workLog.hoursWorked')}
                type="number"
                step="0.5"
                value={formData.horasTrabajadas}
                onChange={(e) => setFormData({ ...formData, horasTrabajadas: e.target.value })}
                placeholder="8.0"
              />
              <Input
                label={t('workLog.worker')}
                value={formData.trabajador}
                onChange={(e) => setFormData({ ...formData, trabajador: e.target.value })}
                placeholder={t('workLog.workerPlaceholder')}
                className="md:col-span-2"
              />
            </div>
            
            <Textarea
              label={t('workLog.description')}
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              rows={3}
              required
              placeholder={t('workLog.descriptionPlaceholder')}
              className="mb-4"
            />
            
            <Textarea
              label={t('workLog.notes')}
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              rows={2}
              placeholder={t('workLog.notesPlaceholder')}
              className="mb-4"
            />
            
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                <Save className="w-4 h-4 mr-2" />
                {editingId ? t('common.update') : t('common.save')}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                  <X className="w-4 h-4 mr-2" />
                  {t('common.cancel')}
                </Button>
              )}
            </div>
          </form>
        )}

        {workLogs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{t('workLog.noEntries')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {workLogs.map((log) => (
              <div
                key={log.id}
                className="border-l-4 border-blue-500 pl-4 py-3 bg-white dark:bg-gray-800 rounded-r-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(log.fecha).toLocaleDateString()}
                    </div>
                    {log.horasTrabajadas && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {log.horasTrabajadas}h
                      </div>
                    )}
                    {log.trabajador && (
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {log.trabajador}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(log)}
                      className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(log.id)}
                      className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <p className="text-gray-900 dark:text-gray-100 mb-2">{log.descripcion}</p>
                
                {log.observaciones && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                    {log.observaciones}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
