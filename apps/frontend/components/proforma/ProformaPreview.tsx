'use client';

import { forwardRef } from 'react';
import { useTranslations } from 'next-intl';
import { Building2 } from 'lucide-react';
import { formatCurrency as baseFormatCurrency, formatDate } from '@/lib/utils';

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
  razonSocial?: string;
  nombreComercial?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  moneda?: string;
  logoUrl?: string;
  firmaEmpresa?: string; // Company digital signature
}

interface Proforma {
  id: string;
  numero: string;
  serie: string;
  cliente: {
    id: string;
    razonSocial: string;
    numeroDocumento: string;
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
  workDescription?: string;
  paymentTerms?: string;
  detalles: DetalleProforma[];
  signatureStatus?: 'PENDING' | 'SIGNED' | 'EXPIRED' | 'CANCELLED' | null;
  signatureRequest?: {
    signature?: {
      signatureImageUrl?: string;
      signerName?: string;
      signedAt?: string;
    };
  };
}

interface ProformaPreviewProps {
  proforma: Proforma;
  empresa?: Empresa | null;
}

const ProformaPreview = forwardRef<HTMLDivElement, ProformaPreviewProps>(
  ({ proforma, empresa }, ref) => {
    const t = useTranslations('quotes.pdf');
    const formatCurrency = (amount: number | string | null | undefined) => 
      baseFormatCurrency(amount, empresa?.moneda || 'USD');
    
    return (
      <div
        ref={ref}
        className="bg-white text-black p-8 mx-auto"
        style={{ fontFamily: 'Arial, sans-serif', maxWidth: '850px' }}
      >
        {/* Header Section */}
        <div className="grid grid-cols-12 gap-4 items-start mb-4 border-b-2 border-gray-800 pb-3">
          {/* Left Side - Proposal Number & Dates */}
          <div className="col-span-3">
            <div style={{ border: '2px solid #1f2937', padding: '8px 12px', borderRadius: '4px', display: 'inline-block', marginBottom: '8px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#000000', margin: 0 }}>PROFORMA</p>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#000000', margin: 0 }}>
                {proforma.serie}-{String(proforma.numero).padStart(6, '0')}
              </p>
            </div>
            <div className="text-[9px] text-gray-700 space-y-0.5">
              <p><span className="font-semibold">Fecha:</span> {formatDate(proforma.fechaEmision)}</p>
              <p><span className="font-semibold">Válida hasta:</span> {formatDate(proforma.fechaValidez)}</p>
            </div>
          </div>

          {/* Center - Company Info */}
          <div className="col-span-6 text-center">
            <div className="text-[18px] font-bold text-gray-900">
              {empresa?.razonSocial || empresa?.nombre || 'Mi Empresa'}
            </div>
            <div className="text-[11px] text-gray-600 space-y-0.5">
              {empresa?.nombreComercial && (
                <p className="text-gray-700">{empresa.nombreComercial}</p>
              )}
              {empresa?.telefono && <p>Tel: {empresa.telefono}</p>}
              {empresa?.email && <p>{empresa.email}</p>}
            </div>
          </div>

          {/* Right Side - Company Logo */}
          <div className="col-span-3 flex justify-end">
            {empresa?.logoUrl ? (
              <img
                src={empresa.logoUrl}
                alt={empresa?.nombre}
                className="h-20 w-auto object-contain"
              />
            ) : (
              <div className="h-20 w-20 bg-gray-200 rounded flex items-center justify-center">
                <Building2 className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* Client Information */}
        <div className="mb-4">
          <div className="text-[9px] font-bold text-gray-800 mb-2 uppercase">Datos del cliente</div>
          <div className="grid grid-cols-2 gap-4 text-[10px]">
            <div>
              <p className="font-bold text-gray-900">{proforma.cliente.razonSocial}</p>
              <p className="text-gray-700">
                {proforma.cliente.tipoDocumento !== 'OTHER' && `${proforma.cliente.tipoDocumento}: `}
                {proforma.cliente.numeroDocumento || '-'}
              </p>
            </div>
            {proforma.cliente.direccion && (
              <div>
                <p className="text-gray-700">{proforma.cliente.direccion}</p>
              </div>
            )}
          </div>
        </div>

        {/* Specifications and Estimates */}
        {proforma.workDescription && (
          <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-300">
            <div className="text-[10px] font-bold text-gray-800 mb-1">Por medio de la presente presentamos las especificaciones y el presupuesto para:</div>
            <p className="text-[9px] text-gray-700 whitespace-pre-wrap">{proforma.workDescription}</p>
          </div>
        )}

        {/* Separator Line */}
        <div className="border-t border-gray-400 mb-3"></div>

        {/* Proposal Statement */}
        <div className="mb-3 text-center">
          <p className="text-[10px] font-bold text-gray-800">
            Proponemos suministrar los materiales y la mano de obra, de acuerdo con las especificaciones indicadas, por la suma de:
          </p>
        </div>

        {/* Payment Terms */}
        <div className="mb-4 p-3 bg-gray-50 border border-gray-300 rounded">
          <div className="text-[10px]">
            <p className="text-gray-800 mb-2">
              <span className="font-bold text-gray-900">El pago se realizará de la siguiente manera:</span>
              {proforma.paymentTerms && <span className="ml-1">{proforma.paymentTerms}</span>}
            </p>
            <p className="text-gray-800 mt-2">
              <span className="font-bold">Importe total:</span> {formatCurrency(proforma.total)}
            </p>
          </div>
        </div>

        {/* Contract Terms and Conditions */}
        {proforma.condiciones && (
          <div className="mb-4 p-3 bg-gray-50 border border-gray-300 rounded">
            <p className="text-[10px] font-bold text-gray-900 mb-2">TÉRMINOS Y CONDICIONES</p>
            <div className="text-[9px] text-gray-800 whitespace-pre-wrap">
              {proforma.condiciones}
            </div>
          </div>
        )}

        {/* Separator Line */}
        <div className="border-t-2 border-gray-800 mb-3"></div>

        {/* Acceptance Section */}
        <div className="mb-3">
          <p className="text-[10px] font-bold text-gray-900 mb-2">Aceptación de la proforma</p>
          <p className="text-[9px] text-gray-700 mb-3">
            Los precios, especificaciones y condiciones indicados son satisfactorios y se aceptan.
            Se autoriza la realización del trabajo según lo descrito. El pago se hará como se indica arriba.
          </p>
        </div>

        {/* Signature Lines */}
        {proforma.signatureRequest?.signature?.signatureImageUrl ? (
          // Digital signature exists - show both customer and company signatures
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-8">
              {/* Customer Signature */}
              <div>
                <p className="text-[9px] font-bold text-gray-800 mb-2">Firma del cliente:</p>
                <div className="mb-1">
                  <img 
                    src={proforma.signatureRequest.signature.signatureImageUrl} 
                    alt="Firma del cliente" 
                    className="h-16 w-auto object-contain"
                  />
                </div>
                <div className="border-t border-gray-800 mb-1"></div>
                <p className="text-[9px] text-gray-600 mb-4">
                  {proforma.signatureRequest.signature.signerName || proforma.cliente.razonSocial}
                </p>
                <p className="text-[9px] text-gray-800">
                  <span className="font-bold">Fecha:</span>{' '}
                  {proforma.signatureRequest.signature.signedAt 
                    ? formatDate(proforma.signatureRequest.signature.signedAt)
                    : formatDate(new Date().toISOString())
                  }
                </p>
              </div>
              
              {/* Company Signature - only shown when customer has signed */}
              {empresa?.firmaEmpresa ? (
                <div>
                  <p className="text-[9px] font-bold text-gray-800 mb-2">Firma autorizada:</p>
                  <div className="mb-1">
                    <img 
                      src={empresa.firmaEmpresa} 
                      alt="Firma de la empresa" 
                      className="h-16 w-auto object-contain"
                    />
                  </div>
                  <div className="border-t border-gray-800 mb-1"></div>
                  <p className="text-[9px] text-gray-600">{empresa.razonSocial || empresa.nombre}</p>
                </div>
              ) : (
                <div>
                  <p className="text-[9px] font-bold text-gray-800 mb-12">Firma autorizada:</p>
                  <div className="border-t border-gray-800 mb-1"></div>
                  <p className="text-[9px] text-gray-600">{empresa?.razonSocial || empresa?.nombre || 'Mi empresa'}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // No signature yet - show only empty customer signature line
          <div className="mb-6">
            <div>
              {/* Customer Signature Only */}
              <div>
                <p className="text-[9px] font-bold text-gray-800 mb-12">Firma del cliente:</p>
                <div className="border-t border-gray-800 mb-1"></div>
                <p className="text-[9px] text-gray-600 mb-4">Nombre del cliente</p>
                <p className="text-[9px] text-gray-800">
                  <span className="font-bold">Fecha:</span>{' '}
                  {formatDate(new Date().toISOString())}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer - Notes */}
        {proforma.observaciones && (
          <div className="mt-6 border-t border-gray-300 pt-4 text-center">
            <p className="text-[8px] italic text-gray-700">
              {proforma.observaciones}
            </p>
          </div>
        )}
      </div>
    );
  }
);

ProformaPreview.displayName = 'ProformaPreview';

export default ProformaPreview;
