'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, Download, Share2, ZoomIn, ZoomOut } from 'lucide-react';
import { Button, Modal } from '@/components/common';
import InvoicePreview from './InvoicePreview';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface DetalleFactura {
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

interface Factura {
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
  fechaVencimiento: string;
  subtotal: number;
  igv: number;
  total: number;
  descuento: number;
  estado: string;
  montoPendiente: number;
  observaciones?: string;
  detalles: DetalleFactura[];
}

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  factura: Factura;
  empresa?: Empresa | null;
}

export default function PrintPreviewModal({
  isOpen,
  onClose,
  factura,
  empresa,
}: PrintPreviewModalProps) {
  const t = useTranslations('invoices');
  const tCommon = useTranslations('common');
  const previewRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.75);
  const [downloading, setDownloading] = useState(false);

  const generatePDF = async (): Promise<jsPDF | null> => {
    if (!previewRef.current) return null;

    const canvas = await html2canvas(previewRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 0;

    pdf.addImage(
      imgData,
      'PNG',
      imgX,
      imgY,
      imgWidth * ratio,
      imgHeight * ratio
    );

    return pdf;
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      const pdf = await generatePDF();
      if (pdf) {
        pdf.save(`Factura-${factura.serie}-${factura.numero}.pdf`);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    try {
      setDownloading(true);
      const pdf = await generatePDF();
      if (pdf) {
        const pdfBlob = pdf.output('blob');
        const file = new File(
          [pdfBlob],
          `Factura-${factura.serie}-${factura.numero}.pdf`,
          { type: 'application/pdf' }
        );

        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Factura ${factura.serie}-${factura.numero}`,
            text: `Factura para ${factura.cliente.razonSocial}`,
          });
        } else {
          // Fallback: download the file
          handleDownloadPDF();
        }
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // If share fails, try download
      handleDownloadPDF();
    } finally {
      setDownloading(false);
    }
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 1.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.5));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${t('print')} - ${factura.serie}-${factura.numero}`} size="xl" showCloseButton={false}>
      <div className="flex flex-col h-[75vh]">
        {/* Controls */}
        <div className="flex items-center justify-between pb-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-500 min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-auto bg-gray-200 dark:bg-gray-800 p-4">
          <div
            className="mx-auto shadow-2xl transition-transform duration-200"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
            }}
          >
            <InvoicePreview ref={previewRef} factura={factura} empresa={empresa} />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('previewDescription')}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleShare} disabled={downloading}>
              <Share2 className="w-4 h-4 mr-2" />
              {t('share')}
            </Button>
            <Button onClick={handleDownloadPDF} disabled={downloading}>
              <Download className="w-4 h-4 mr-2" />
              {downloading ? tCommon('loading') : t('downloadPdf')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
