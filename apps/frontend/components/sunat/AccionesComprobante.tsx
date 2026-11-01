'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Download, Edit, FileMinus, FilePlus, RotateCcw, Send, Trash2, XCircle } from 'lucide-react';
import { Button, ConfirmDialog } from '@/components/common';
import { useToast } from '@/contexts/ToastContext';
import { accionesPermitidas } from '@/lib/sunat/estados';
import { normalizarError } from '@/lib/sunat/errores';
import { nombreArchivo } from '@/lib/sunat/formato';
import { guardarArchivo, sunatApi } from '@/lib/sunat/api';
import type { Comprobante } from '@/lib/sunat/tipos';
import { AnularModal } from './AnularModal';

interface Props {
  comprobante: Comprobante;
  locale: string;
  ruc: string;
  onCambio: () => void;
}

export function AccionesComprobante({ comprobante, locale, ruc, onCambio }: Props) {
  const t = useTranslations('sunat');
  const router = useRouter();
  const { showError } = useToast();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<'emitir' | 'eliminar' | null>(null);
  const [anulando, setAnulando] = useState(false);
  const acciones = accionesPermitidas(comprobante.estadoSunat);
  const base = `/${locale}/comprobantes`;

  const ejecutar = async (clave: string, accion: () => Promise<void>) => {
    setOcupado(clave);
    try {
      await accion();
    } catch (error) {
      showError(normalizarError(error, t('errores.noDisponible')).mensaje);
    } finally {
      setOcupado(null);
      setConfirmar(null);
    }
  };

  const descargar = (tipo: 'pdf' | 'xml' | 'cdr') =>
    ejecutar(tipo, () => guardarArchivo(comprobante.id, tipo, nombreArchivo(ruc, comprobante, tipo)));

  return (
    <div className="flex flex-wrap gap-2">
      {acciones.includes('editar') && (
        <Button variant="outline" icon={<Edit className="w-4 h-4" />} onClick={() => router.push(`${base}/${comprobante.id}/editar`)}>
          {t('acciones.editar')}
        </Button>
      )}
      {acciones.includes('emitir') && (
        <Button icon={<Send className="w-4 h-4" />} onClick={() => setConfirmar('emitir')}>{t('acciones.emitir')}</Button>
      )}
      {acciones.includes('eliminar') && (
        <Button variant="ghost" icon={<Trash2 className="w-4 h-4" />} onClick={() => setConfirmar('eliminar')}>{t('acciones.eliminar')}</Button>
      )}
      {(['pdf', 'xml', 'cdr'] as const).filter((tipo) => acciones.includes(tipo)).map((tipo) => (
        <Button
          key={tipo}
          variant="outline"
          icon={<Download className="w-4 h-4" />}
          loading={ocupado === tipo}
          disabled={tipo === 'cdr' && !comprobante.cdrKey}
          onClick={() => descargar(tipo)}
        >
          {t(`acciones.${tipo}`)}
        </Button>
      ))}
      {acciones.includes('notaCredito') && (
        <Button variant="outline" icon={<FileMinus className="w-4 h-4" />} onClick={() => router.push(`${base}/nuevo?tipo=07&afecta=${comprobante.id}`)}>
          {t('acciones.notaCredito')}
        </Button>
      )}
      {acciones.includes('notaDebito') && (
        <Button variant="outline" icon={<FilePlus className="w-4 h-4" />} onClick={() => router.push(`${base}/nuevo?tipo=08&afecta=${comprobante.id}`)}>
          {t('acciones.notaDebito')}
        </Button>
      )}
      {acciones.includes('anular') && (
        <Button variant="danger" icon={<XCircle className="w-4 h-4" />} onClick={() => setAnulando(true)}>{t('acciones.anular')}</Button>
      )}
      {acciones.includes('corregir') && (
        <Button
          icon={<RotateCcw className="w-4 h-4" />}
          loading={ocupado === 'corregir'}
          onClick={() => ejecutar('corregir', async () => {
            const nuevo = await sunatApi.corregir(comprobante.id);
            router.push(`${base}/${nuevo.id}/editar`);
          })}
        >
          {t('acciones.corregir')}
        </Button>
      )}

      <ConfirmDialog
        isOpen={confirmar === 'emitir'}
        onClose={() => setConfirmar(null)}
        onConfirm={() => ejecutar('emitir', async () => { await sunatApi.emitir(comprobante.id); onCambio(); })}
        title={t('form.confirmarEmitirTitulo')}
        message={t('form.confirmarEmitir')}
        confirmLabel={t('form.emitir')}
        variant="warning"
        loading={ocupado === 'emitir'}
      />
      <ConfirmDialog
        isOpen={confirmar === 'eliminar'}
        onClose={() => setConfirmar(null)}
        onConfirm={() => ejecutar('eliminar', async () => { await sunatApi.eliminar(comprobante.id); router.push(base); })}
        title={t('acciones.confirmarEliminarTitulo')}
        message={t('acciones.confirmarEliminar')}
        confirmLabel={t('acciones.eliminar')}
        variant="danger"
        loading={ocupado === 'eliminar'}
      />
      <AnularModal isOpen={anulando} onClose={() => setAnulando(false)} comprobante={comprobante} locale={locale} onAnulado={onCambio} />
    </div>
  );
}
