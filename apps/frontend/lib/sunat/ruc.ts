// Validación de RUC peruano (módulo 11) e identificación fiscal opcional del asistente de configuración.

const PESOS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

export function esRucValido(ruc: string): boolean {
  if (!/^(10|15|17|20)\d{9}$/.test(ruc)) return false;
  const suma = PESOS.reduce((acc, peso, i) => acc + peso * Number(ruc[i]), 0);
  let digito = 11 - (suma % 11);
  if (digito === 10) digito = 0;
  if (digito === 11) digito = 1;
  return digito === Number(ruc[10]);
}

export type ErrorIdentificacion = 'rucInvalido' | 'muyLargo' | 'reservado';

// Opcional. Solo dígitos = RUC peruano (debe ser válido); con letras o guiones = identificación de otro país (EIN, NIF…).
export function validarIdentificacionFiscal(valor: string): ErrorIdentificacion | null {
  const v = valor.trim();
  if (!v) return null;
  if (/^TEMP-/i.test(v)) return 'reservado';
  if (/^\d+$/.test(v)) return esRucValido(v) ? null : 'rucInvalido';
  return v.length > 20 ? 'muyLargo' : null;
}
