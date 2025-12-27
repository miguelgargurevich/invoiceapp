'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, Download, Share2, ZoomIn, ZoomOut } from 'lucide-react';
import { Button, Modal } from '@/components/common';
import ProformaPreview from './ProformaPreview';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
  detalles: DetalleProforma[];
}

interface ProformaPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  proforma: Proforma;
  empresa?: Empresa | null;
}

export default function ProformaPrintPreviewModal({
  isOpen,
  onClose,
  proforma,
  empresa,
}: ProformaPrintPreviewModalProps) {
  const t = useTranslations('quotes');
  const tCommon = useTranslations('common');
  const previewRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.85);
  const [downloading, setDownloading] = useState(false);

  const generatePDF = async (): Promise<jsPDF | null> => {
    if (!previewRef.current) return null;

    // Esperar a que todas las fuentes se carguen
    await document.fonts.ready;

    const canvas = await html2canvas(previewRef.current, {
      scale: 3,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: previewRef.current.scrollWidth,
      windowHeight: previewRef.current.scrollHeight,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.querySelector('[data-preview-content]');
        if (clonedElement) {
          (clonedElement as HTMLElement).style.transform = 'none';
        }
      },
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    // Calcular dimensiones manteniendo el aspect ratio
    const ratio = pdfWidth / imgWidth;
    const scaledWidth = imgWidth * ratio;
    const scaledHeight = imgHeight * ratio;

    // Si la imagen es más alta que la página, necesitamos dividirla
    let position = 0;
    let pageHeight = pdfHeight;
    
    while (position < scaledHeight) {
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = imgWidth;
      pageCanvas.height = Math.min(imgHeight - position / ratio, pdfHeight / ratio);
      
      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          canvas,
          0,
          position / ratio,
          imgWidth,
          pageCanvas.height,
          0,
          0,
          imgWidth,
          pageCanvas.height
        );
        
        const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
        
        if (position > 0) {
          pdf.addPage();
        }
        
        pdf.addImage(
          pageImgData,
          'PNG',
          0,
          0,
          pdfWidth,
          Math.min(pageCanvas.height * ratio, pdfHeight)
        );
      }
      
      position += pageHeight;
    }

    return pdf;
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      const pdf = await generatePDF();
      if (pdf) {
        pdf.save(`${t('title')}-${proforma.serie}-${proforma.numero}.pdf`);
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
          `${t('title')}-${proforma.serie}-${proforma.numero}.pdf`,
          { type: 'application/pdf' }
        );

        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${t('title')} ${proforma.serie}-${proforma.numero}`,
            text: `${t('title')} ${tCommon('for')} ${proforma.cliente.razonSocial}`,
          });
        } else {
          handleDownloadPDF();
        }
      }
    } catch (error) {
      console.error('Error sharing:', error);
      handleDownloadPDF();
    } finally {
      setDownloading(false);
    }
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 1.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.5));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="xl" showCloseButton={false}>
      <div className="flex flex-col h-[85vh]">
        {/* Compact Controls Bar */}
        <div className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {proforma.serie}-{proforma.numero}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleZoomOut}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-500 min-w-[50px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleShare} disabled={downloading}>
              <Share2 className="w-4 h-4 mr-1.5" />
              {t('share')}
            </Button>
            <Button size="sm" onClick={handleDownloadPDF} disabled={downloading}>
              <Download className="w-4 h-4 mr-1.5" />
              {downloading ? tCommon('loading') : t('downloadPdf')}
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preview Area - More Space */}
        <div className="flex-1 overflow-auto bg-gray-200 dark:bg-gray-800 p-3">
          <div
            data-preview-content
            className="mx-auto shadow-2xl transition-transform duration-200"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
            }}
          >
            <ProformaPreview ref={previewRef} proforma={proforma} empresa={empresa} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
