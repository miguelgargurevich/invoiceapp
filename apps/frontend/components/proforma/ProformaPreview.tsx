'use client';

import { forwardRef } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface DetalleProforma {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
  igv: number;
  total: number;
  producto?: {
    codigo: string;
    nombre: string;
  };
}

interface Empresa {
  id: string;
  nombre: string;
  ruc: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  logo?: string;
}

interface Proforma {
  id: string;
  numero: string;
  serie: string;
  cliente: {
    id: string;
    nombre: string;
    documento: string;
    tipoDocumento: string;
    direccion?: string;
    email?: string;
  };
  fechaEmision: string;
  fechaValidez: string;
  subtotal: number;
  igv: number;
  total: number;
  descuento: number;
  estado: string;
  observaciones?: string;
  condiciones?: string;
  detalles: DetalleProforma[];
}

interface ProformaPreviewProps {
  proforma: Proforma;
  empresa?: Empresa | null;
}

const ProformaPreview = forwardRef<HTMLDivElement, ProformaPreviewProps>(
  ({ proforma, empresa }, ref) => {
    return (
      <div
        ref={ref}
        className="bg-white text-black p-8 max-w-[210mm] mx-auto"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-8 border-b-2 border-blue-600 pb-6">
          <div className="flex-1">
            {empresa?.logo ? (
              <img
                src={empresa.logo}
                alt={empresa.nombre}
                className="h-16 w-auto mb-2"
              />
            ) : (
              <div className="text-2xl font-bold text-gray-800 mb-2">
                {empresa?.nombre || 'Mi Empresa'}
              </div>
            )}
            <div className="text-sm text-gray-600 space-y-0.5">
              {empresa?.ruc && <p>RUC: {empresa.ruc}</p>}
              {empresa?.direccion && <p>{empresa.direccion}</p>}
              {empresa?.telefono && <p>Tel: {empresa.telefono}</p>}
              {empresa?.email && <p>{empresa.email}</p>}
            </div>
          </div>
          <div className="text-right">
            <div className="bg-blue-600 text-white px-6 py-3 rounded-lg mb-2">
              <div className="text-lg font-bold">PROFORMA</div>
              <div className="text-xl font-bold">
                {proforma.serie}-{proforma.numero.toString().padStart(6, '0')}
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p>
                <span className="font-medium">Fecha de Emisión:</span>{' '}
                {formatDate(proforma.fechaEmision)}
              </p>
              <p>
                <span className="font-medium">Válido hasta:</span>{' '}
                {formatDate(proforma.fechaValidez)}
              </p>
            </div>
          </div>
        </div>

        {/* Client Info */}
        <div className="mb-8 bg-blue-50 p-4 rounded-lg border border-blue-100">
          <h3 className="text-sm font-bold text-blue-800 mb-2 uppercase">
            Datos del Cliente
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Razón Social:</span>
              <p className="font-medium">{proforma.cliente.nombre}</p>
            </div>
            <div>
              <span className="text-gray-500">
                {proforma.cliente.tipoDocumento}:
              </span>
              <p className="font-medium">{proforma.cliente.documento}</p>
            </div>
            {proforma.cliente.direccion && (
              <div className="col-span-2">
                <span className="text-gray-500">Dirección:</span>
                <p className="font-medium">{proforma.cliente.direccion}</p>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="py-3 px-4 text-left text-sm font-medium">
                  Descripción
                </th>
                <th className="py-3 px-4 text-center text-sm font-medium w-20">
                  Cant.
                </th>
                <th className="py-3 px-4 text-right text-sm font-medium w-28">
                  P. Unit.
                </th>
                <th className="py-3 px-4 text-right text-sm font-medium w-28">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {proforma.detalles.map((detalle, index) => (
                <tr
                  key={detalle.id}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-blue-50'}
                >
                  <td className="py-3 px-4 text-sm border-b border-gray-200">
                    {detalle.producto && (
                      <span className="text-xs text-gray-500 block">
                        {detalle.producto.codigo}
                      </span>
                    )}
                    {detalle.descripcion}
                  </td>
                  <td className="py-3 px-4 text-center text-sm border-b border-gray-200">
                    {detalle.cantidad}
                  </td>
                  <td className="py-3 px-4 text-right text-sm border-b border-gray-200">
                    {formatCurrency(detalle.precioUnitario)}
                  </td>
                  <td className="py-3 px-4 text-right text-sm font-medium border-b border-gray-200">
                    {formatCurrency(detalle.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-72">
            <div className="flex justify-between py-2 text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span>{formatCurrency(proforma.subtotal)}</span>
            </div>
            {proforma.descuento > 0 && (
              <div className="flex justify-between py-2 text-sm">
                <span className="text-gray-600">Descuento:</span>
                <span className="text-red-600">
                  -{formatCurrency(proforma.descuento)}
                </span>
              </div>
            )}
            <div className="flex justify-between py-2 text-sm">
              <span className="text-gray-600">IGV (18%):</span>
              <span>{formatCurrency(proforma.igv)}</span>
            </div>
            <div className="flex justify-between py-3 border-t-2 border-blue-600 mt-2">
              <span className="text-lg font-bold">TOTAL:</span>
              <span className="text-lg font-bold text-blue-600">
                {formatCurrency(proforma.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Conditions */}
        {proforma.condiciones && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-sm font-bold text-yellow-800 mb-2">
              Condiciones:
            </h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{proforma.condiciones}</p>
          </div>
        )}

        {/* Observations */}
        {proforma.observaciones && (
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-bold text-gray-800 mb-2">
              Observaciones:
            </h3>
            <p className="text-sm text-gray-600">{proforma.observaciones}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-300 pt-4 text-center text-xs text-gray-500">
          <p className="font-medium text-blue-600 mb-1">
            Esta proforma es válida hasta el {formatDate(proforma.fechaValidez)}
          </p>
          <p>Gracias por su preferencia</p>
          <p className="mt-1">
            Este documento no tiene valor fiscal - Es una cotización
          </p>
        </div>
      </div>
    );
  }
);

ProformaPreview.displayName = 'ProformaPreview';

export default ProformaPreview;
