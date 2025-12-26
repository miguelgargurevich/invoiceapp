import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | null | undefined, currency: string = 'PEN'): string {
  const symbols: Record<string, string> = {
    PEN: 'S/',
    USD: '$',
    EUR: '€',
  };
  const symbol = symbols[currency] || currency;
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  return `${symbol} ${(isNaN(numericAmount) ? 0 : numericAmount).toFixed(2)}`;
}

export function formatDate(date: string | Date | null | undefined, locale: string = 'es-PE'): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date | null | undefined, locale: string = 'es-PE'): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatInvoiceNumber(serie: string | null | undefined, numero: number | null | undefined): string {
  return `${serie || 'F001'}-${(numero ?? 0).toString().padStart(8, '0')}`;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Calcular IGV
export const IGV_RATE = 0.18;

export function calcularIGV(baseImponible: number): number {
  return baseImponible * IGV_RATE;
}

export function calcularTotal(subtotal: number, descuento: number = 0): {
  baseImponible: number;
  igv: number;
  total: number;
} {
  const baseImponible = subtotal - descuento;
  const igv = calcularIGV(baseImponible);
  const total = baseImponible + igv;
  
  return {
    baseImponible: parseFloat(baseImponible.toFixed(2)),
    igv: parseFloat(igv.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
  };
}

// Validaciones
export function validarRUC(ruc: string): boolean {
  if (!/^\d{11}$/.test(ruc)) return false;
  
  // Verificar que empiece con 10, 15, 17 o 20
  const prefijos = ['10', '15', '17', '20'];
  const prefijo = ruc.substring(0, 2);
  
  return prefijos.includes(prefijo);
}

export function validarDNI(dni: string): boolean {
  return /^\d{8}$/.test(dni);
}

export function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
