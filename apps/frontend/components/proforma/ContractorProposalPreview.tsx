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
  unidadMedida: string;
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
  licencia?: string;
  tituloProfesional?: string;
}

interface Cliente {
  id: string;
  razonSocial: string;
  numeroDocumento: string;
  tipoDocumento: string;
  direccion?: string;
  email?: string;
  telefono?: string;
}

interface Proforma {
  id: string;
  numero: string;
  serie: string;
  cliente: Cliente;
  fechaEmision: string;
  fechaValidez?: string;
  subtotal: number;
  igv: number;
  total: number;
  descuento: number;
  estado: string;
  observaciones?: string;
  condiciones?: string;

  // Job fields
  jobName?: string;
  jobLocation?: string;
  workDescription?: string;
  paymentTerms?: string;

  // Campos de obra
  arquitectoNombre?: string;
  fechaPlanos?: string;
  telefonoTrabajo?: string;
  firmaAutorizada?: string;
  diasValidez?: number;
  firmaAceptacion?: string;
  fechaAceptacion?: string;

  detalles: DetalleProforma[];
}

interface ContractorProposalPreviewProps {
  proforma: Proforma;
  empresa?: Empresa | null;
  pageNumber?: number;
  totalPages?: number;
}

const ContractorProposalPreview = forwardRef<HTMLDivElement, ContractorProposalPreviewProps>(
  ({ proforma, empresa, pageNumber = 1, totalPages = 1 }, ref) => {
    const tieneLicencia = !!empresa?.licencia;

    return (
      <div
        ref={ref}
        className="bg-white text-black p-6 max-w-[8.5in] mx-auto text-[10pt]"
        style={{ fontFamily: 'Arial, sans-serif', minHeight: '11in' }}
      >
        {/* ENCABEZADO */}
        <div className="text-center mb-4 border-b-2 border-black pb-3">
          <h1 className="text-2xl font-bold mb-1">PROFORMA</h1>

          <div className="text-sm mb-2">
            {tieneLicencia && <span className="font-semibold">Con licencia</span>}
          </div>

          <div className="text-sm space-y-0.5">
            <div className="font-bold text-base">{empresa?.nombre || 'Nombre de la empresa'}</div>
            {empresa?.tituloProfesional && (
              <div className="font-semibold uppercase">{empresa.tituloProfesional}</div>
            )}
            <div>{empresa?.telefono || 'Teléfono'}</div>
            <div>{empresa?.direccion || 'Dirección'}</div>
          </div>
        </div>

        {/* PAGINACIÓN */}
        <div className="flex justify-end text-xs mb-4">
          <div className="text-right space-x-2">
            <span>Página <strong>{pageNumber}</strong></span>
            <span>de <strong>{totalPages}</strong></span>
          </div>
        </div>

        {/* CLIENTE Y OBRA */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4 text-sm border border-black p-3">
          <div>
            <span className="font-semibold">Proforma dirigida a:</span>
            <div className="border-b border-black mt-1 min-h-[20px]">
              {proforma.cliente.razonSocial}
            </div>
          </div>
          <div>
            <span className="font-semibold">Teléfono:</span>
            <div className="border-b border-black mt-1 min-h-[20px]">
              {proforma.cliente.telefono || '___________'}
            </div>
          </div>

          <div className="col-span-2">
            <span className="font-semibold">Fecha:</span>
            <span className="ml-2">{formatDate(proforma.fechaEmision)}</span>
          </div>

          <div>
            <span className="font-semibold">Dirección:</span>
            <div className="border-b border-black mt-1 min-h-[20px]">
              {proforma.cliente.direccion || '___________'}
            </div>
          </div>
          <div>
            <span className="font-semibold">Nombre de la obra:</span>
            <div className="border-b border-black mt-1 min-h-[20px]">
              {proforma.jobName || '___________'}
            </div>
          </div>

          <div>
            <span className="font-semibold">Ciudad / Distrito:</span>
            <div className="border-b border-black mt-1 min-h-[20px]">
              {/* Se completa a mano: la dirección del cliente no separa ciudad ni distrito */}
              ___________
            </div>
          </div>
          <div>
            <span className="font-semibold">Ubicación de la obra:</span>
            <div className="border-b border-black mt-1 min-h-[20px]">
              {proforma.jobLocation || '___________'}
            </div>
          </div>

          <div>
            <span className="font-semibold">Arquitecto o ingeniero:</span>
            <div className="border-b border-black mt-1 min-h-[20px]">
              {proforma.arquitectoNombre || '___________'}
            </div>
          </div>
          <div>
            <span className="font-semibold">Fecha de los planos:</span>
            <div className="border-b border-black mt-1 min-h-[20px]">
              {proforma.fechaPlanos ? formatDate(proforma.fechaPlanos) : '___________'}
            </div>
          </div>

          <div className="col-span-2">
            <span className="font-semibold">Teléfono de la obra:</span>
            <div className="border-b border-black mt-1 min-h-[20px]">
              {proforma.telefonoTrabajo || '___________'}
            </div>
          </div>
        </div>

        {/* ALCANCE */}
        <div className="mb-4">
          <p className="font-semibold text-sm mb-2">
            Presentamos las especificaciones y el presupuesto para:
          </p>
          <div className="min-h-[200px] border border-black p-2">
            <div className="whitespace-pre-wrap text-sm leading-6">
              {proforma.workDescription || (
                <>
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="border-b border-gray-300 min-h-[24px]" />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* CLÁUSULA GENERAL */}
        <div className="text-xs italic mb-3 text-justify">
          Todo el material se entregará según lo especificado. Los trabajos se realizarán de forma
          profesional y según las prácticas habituales del oficio. Cualquier cambio o trabajo
          adicional con costo extra se ejecutará solo con orden escrita y se cobrará aparte del
          presupuesto. Los acuerdos están sujetos a huelgas, accidentes o demoras fuera de nuestro control.
        </div>

        {/* MONTO TOTAL */}
        <div className="mb-4 border border-black p-3">
          <p className="text-sm">
            Nos comprometemos a suministrar el material y la mano de obra, completos y según las
            especificaciones anteriores, por el monto de:
          </p>
          <div className="text-center text-lg font-bold my-2">
            {formatCurrency(proforma.total)}
          </div>
        </div>

        {/* FORMA DE PAGO */}
        <div className="mb-4">
          <p className="font-semibold text-sm mb-1">El pago se realizará de la siguiente manera:</p>
          <div className="border border-black p-2 min-h-[60px]">
            <div className="whitespace-pre-wrap text-sm">
              {proforma.paymentTerms || '___________'}
            </div>
          </div>
        </div>

        {/* CONDICIONES (si se indicaron) */}
        {proforma.condiciones && (
          <div className="mb-4">
            <p className="font-semibold text-sm mb-1">CONDICIONES</p>
            <div className="border border-black p-2 bg-primary-50">
              <div className="whitespace-pre-wrap text-xs">
                {proforma.condiciones}
              </div>
            </div>
          </div>
        )}

        {/* Observaciones */}
        {proforma.observaciones && (
          <div className="mb-4">
            <div className="border border-black p-2 bg-yellow-50 text-center">
              <p className="text-xs italic">
                {proforma.observaciones}
              </p>
            </div>
          </div>
        )}

        {/* GARANTÍA GENERAL */}
        <div className="text-xs mb-4 space-y-1 text-justify">
          <p><strong>Todo el trabajo está garantizado por un año desde la fecha de finalización.</strong></p>
        </div>

        {/* FIRMAS Y ACEPTACIÓN */}
        <div className="border-t-2 border-black pt-3">
          <div className="mb-4">
            <div className="flex justify-between items-end">
              <div className="flex-1">
                <span className="text-sm">Firma autorizada:</span>
                <div className="border-b border-black mt-6 w-64">
                  {proforma.firmaAutorizada && (
                    <div className="text-center font-signature text-2xl">
                      {proforma.firmaAutorizada}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Validez */}
          <div className="text-xs mb-4">
            <strong>Nota:</strong> esta proforma puede retirarse si no se acepta dentro de{' '}
            <strong className="underline">{proforma.diasValidez || '___'}</strong> días.
          </div>

          <div className="border border-black p-3">
            <p className="text-sm font-semibold mb-2">ACEPTACIÓN DE LA PROFORMA</p>
            <p className="text-xs mb-3">
              Los precios, especificaciones y condiciones anteriores están conformes y quedan
              aceptados. Se autoriza a realizar el trabajo según lo especificado. El pago se hará
              según lo indicado arriba.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm">Firma:</span>
                <div className="border-b border-black mt-6">
                  {proforma.firmaAceptacion && (
                    <div className="text-center font-signature text-2xl">
                      {proforma.firmaAceptacion}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <span className="text-sm">Fecha de aceptación:</span>
                <div className="border-b border-black mt-6">
                  {proforma.fechaAceptacion ? formatDate(proforma.fechaAceptacion) : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ContractorProposalPreview.displayName = 'ContractorProposalPreview';

export default ContractorProposalPreview;
