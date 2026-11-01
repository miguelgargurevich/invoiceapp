'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { XCircle } from 'lucide-react';
import { Button, Modal, Textarea } from '@/components/common';
import { useToast } from '@/contexts/ToastContext';
import { sunatApi } from '@/lib/sunat/api';
import { normalizarError } from '@/lib/sunat/errores';
import type { Comprobante } from '@/lib/sunat/tipos';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  comprobante: Comprobante;
  locale: string;
  onAnulado: () => void;
}

export function AnularModal({ isOpen, onClose, comprobante, locale, onAnulado }: Props) {
  const t = useTranslations('sunat');
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [fueraDePlazo, setFueraDePlazo] = useState(false);

  const cerrar = () => { setMotivo(''); setFueraDePlazo(false); onClose(); };

  const anular = async () => {
    setEnviando(true);
    try {
      await sunatApi.anular(comprobante.id, motivo.trim());
      showSuccess(t('anular.enviado'));
      cerrar();
      onAnulado();
    } catch (error) {
      const n = normalizarError(error, t('errores.noDisponible'));
      if (n.accion === 'EMITIR_NOTA_CREDITO') setFueraDePlazo(true);
      else showError(n.mensaje);
    } finally {
      setEnviando(false);
    }
  };

  const irANota = () => router.push(`/${locale}/comprobantes/nuevo?tipo=07&afecta=${comprobante.id}&motivo=01`);

  return (
    <Modal
      isOpen={isOpen}
      onClose={cerrar}
      title={fueraDePlazo ? t('anular.fueraPlazoTitulo') : t('anular.titulo')}
      icon={XCircle}
      iconColor={fueraDePlazo ? 'warning' : 'danger'}
      size="sm"
      footer={fueraDePlazo ? (
        <Button onClick={irANota}>{t('anular.emitirNc')}</Button>
      ) : (
        <Button variant="danger" loading={enviando} disabled={!motivo.trim()} onClick={anular}>{t('anular.confirmar')}</Button>
      )}
    >
      {fueraDePlazo ? (
        <p className="text-sm text-gray-600 dark:text-gray-300">{t('anular.fueraPlazo')}</p>
      ) : (
        <Textarea label={t('anular.motivo')} value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} maxLength={100} />
      )}
    </Modal>
  );
}
