'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Mail, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { Button, Modal, Input, Textarea } from '@/components/common';
import api from '@/lib/api';

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
}

interface ProformaSendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  proforma: Proforma;
}

export default function ProformaSendEmailModal({
  isOpen,
  onClose,
  proforma,
}: ProformaSendEmailModalProps) {
  const t = useTranslations('quotes');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const [emailData, setEmailData] = useState({
    to: proforma.cliente.email || '',
    subject: `Proforma ${proforma.serie}-${proforma.numero} - ${proforma.cliente.razonSocial}`,
    message: `Estimado/a cliente,\n\nAdjunto encontrará la proforma/cotización ${proforma.serie}-${proforma.numero}.\n\nEsta cotización es válida por 30 días a partir de la fecha de emisión.\n\nQuedamos atentos a sus comentarios.\n\nSaludos cordiales.`,
  });
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSendEmail = async () => {
    if (!emailData.to) {
      setErrorMessage(t('emailRequired'));
      setStatus('error');
      return;
    }

    try {
      setSending(true);
      setStatus('idle');
      setErrorMessage('');

      await api.post(`/proformas/${proforma.id}/send-email`, {
        to: emailData.to,
        subject: emailData.subject,
        message: emailData.message,
        locale,
      });

      setStatus('success');
      setTimeout(() => {
        onClose();
        setStatus('idle');
      }, 2000);
    } catch (error: any) {
      console.error('Error sending email:', error);
      setStatus('error');
      setErrorMessage(error.message || t('sendEmailError'));
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setStatus('idle');
    setErrorMessage('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('sendEmail')}>
      <div className="space-y-4">
        {status === 'success' && (
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-700 dark:text-green-400">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <p>{t('emailSentSuccess')}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('emailTo')} *
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="email"
              value={emailData.to}
              onChange={(e) =>
                setEmailData({ ...emailData, to: e.target.value })
              }
              placeholder={t('emailPlaceholder')}
              className="pl-10"
              required
            />
          </div>
        </div>

        <Input
          label={t('emailSubject')}
          value={emailData.subject}
          onChange={(e) =>
            setEmailData({ ...emailData, subject: e.target.value })
          }
          placeholder={t('emailSubjectPlaceholder')}
        />

        <Textarea
          label={t('emailMessage')}
          value={emailData.message}
          onChange={(e) =>
            setEmailData({ ...emailData, message: e.target.value })
          }
          placeholder={t('emailMessagePlaceholder')}
          rows={6}
        />

        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">{t('emailAttachment')}:</span>{' '}
            Proforma-{proforma.serie}-{proforma.numero}.pdf
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
          <Button variant="outline" onClick={handleClose} disabled={sending}>
            {tCommon('cancel')}
          </Button>
          <Button
            onClick={handleSendEmail}
            disabled={sending || status === 'success'}
          >
            <Send className="w-4 h-4 mr-2" />
            {sending ? t('sendingEmail') : t('sendEmailButton')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
