import { apiClient } from './api';

// ============= TIPOS =============

export interface WorkLog {
  id: string;
  facturaId?: string;
  proformaId?: string;
  fecha: string;
  descripcion: string;
  horasTrabajadas?: number;
  trabajador?: string;
  observaciones?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobPhoto {
  id: string;
  facturaId?: string;
  proformaId?: string;
  url: string;
  descripcion?: string;
  fecha: string;
  orden: number;
  createdAt: string;
}

export interface JobReceipt {
  id: string;
  facturaId?: string;
  proformaId?: string;
  fecha: string;
  descripcion: string;
  monto: number;
  categoria?: string;
  proveedor?: string;
  numeroRecibo?: string;
  url?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptSummary {
  porCategoria: Record<string, { total: number; count: number }>;
  totalGeneral: number;
  cantidadRecibos: number;
}

// ============= WORK LOGS API =============

export const workLogsApi = {
  getByFactura: (facturaId: string) => 
    apiClient.get<WorkLog[]>(`/api/work-logs/factura/${facturaId}`),
  
  getByProforma: (proformaId: string) => 
    apiClient.get<WorkLog[]>(`/api/work-logs/proforma/${proformaId}`),
  
  create: (data: Partial<WorkLog>) => 
    apiClient.post<WorkLog>('/api/work-logs', data),
  
  update: (id: string, data: Partial<WorkLog>) => 
    apiClient.put<WorkLog>(`/api/work-logs/${id}`, data),
  
  delete: (id: string) => 
    apiClient.delete<{ message: string }>(`/api/work-logs/${id}`),
};

// ============= JOB PHOTOS API =============

export const jobPhotosApi = {
  getByFactura: (facturaId: string) => 
    apiClient.get<JobPhoto[]>(`/api/job-photos/factura/${facturaId}`),
  
  getByProforma: (proformaId: string) => 
    apiClient.get<JobPhoto[]>(`/api/job-photos/proforma/${proformaId}`),
  
  upload: (file: File, data: { facturaId?: string; proformaId?: string; descripcion?: string; orden?: number }) => {
    const formData = new FormData();
    formData.append('photo', file);
    if (data.facturaId) formData.append('facturaId', data.facturaId);
    if (data.proformaId) formData.append('proformaId', data.proformaId);
    if (data.descripcion) formData.append('descripcion', data.descripcion);
    if (data.orden !== undefined) formData.append('orden', data.orden.toString());
    
    return apiClient.upload<JobPhoto>('/api/job-photos', formData);
  },
  
  update: (id: string, data: { descripcion?: string; orden?: number }) => 
    apiClient.put<JobPhoto>(`/api/job-photos/${id}`, data),
  
  delete: (id: string) => 
    apiClient.delete<{ message: string }>(`/api/job-photos/${id}`),
};

// ============= JOB RECEIPTS API =============

export const jobReceiptsApi = {
  getByFactura: (facturaId: string) => 
    apiClient.get<JobReceipt[]>(`/api/job-receipts/factura/${facturaId}`),
  
  getByProforma: (proformaId: string) => 
    apiClient.get<JobReceipt[]>(`/api/job-receipts/proforma/${proformaId}`),
  
  create: (data: Partial<JobReceipt>, file?: File) => {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      if (data.facturaId) formData.append('facturaId', data.facturaId);
      if (data.proformaId) formData.append('proformaId', data.proformaId);
      if (data.fecha) formData.append('fecha', data.fecha);
      if (data.descripcion) formData.append('descripcion', data.descripcion);
      if (data.monto !== undefined) formData.append('monto', data.monto.toString());
      if (data.categoria) formData.append('categoria', data.categoria);
      if (data.proveedor) formData.append('proveedor', data.proveedor);
      if (data.numeroRecibo) formData.append('numeroRecibo', data.numeroRecibo);
      
      return apiClient.upload<JobReceipt>('/api/job-receipts', formData);
    } else {
      return apiClient.post<JobReceipt>('/api/job-receipts', data);
    }
  },
  
  update: (id: string, data: Partial<JobReceipt>) => 
    apiClient.put<JobReceipt>(`/api/job-receipts/${id}`, data),
  
  delete: (id: string) => 
    apiClient.delete<{ message: string }>(`/api/job-receipts/${id}`),
  
  getSummary: (documentType: 'factura' | 'proforma', documentId: string) => 
    apiClient.get<ReceiptSummary>(`/api/job-receipts/resumen/${documentType}/${documentId}`),
};

// Tipos de orden de trabajo
export const ORDER_TYPES = [
  { value: 'day_work', label: 'Day Work' },
  { value: 'contract', label: 'Contract' },
  { value: 'extra', label: 'Extra' },
] as const;

// Categorías de recibos
export const RECEIPT_CATEGORIES = [
  { value: 'materiales', label: 'Materials' },
  { value: 'mano_obra', label: 'Labor' },
  { value: 'transporte', label: 'Transportation' },
  { value: 'equipos', label: 'Equipment' },
  { value: 'otros', label: 'Other' },
] as const;
