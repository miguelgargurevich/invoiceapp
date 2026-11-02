'use client';

import { useTranslations } from 'next-intl';
import { TIPOS_DOCUMENTO_PERU, opcionTipoDocumentoHeredado } from '@/lib/tiposDocumento';

interface SelectTipoDocumentoProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  className?: string;
}

// Selector de tipo de documento del cliente: solo los tipos de Perú.
// Un registro antiguo con un código de EE. UU. muestra su etiqueta para no perder la lectura.
export function SelectTipoDocumento({ value, onChange, disabled, className }: SelectTipoDocumentoProps) {
  const tSunat = useTranslations('sunat.clientes');
  const heredado = opcionTipoDocumentoHeredado(value);

  return (
    <select value={value} onChange={onChange} disabled={disabled} className={className}>
      {TIPOS_DOCUMENTO_PERU.map((codigo) => (
        <option key={codigo} value={codigo}>{tSunat(`tiposDoc.${codigo}`)}</option>
      ))}
      {heredado && <option value={heredado.valor}>{heredado.etiqueta}</option>}
    </select>
  );
}
