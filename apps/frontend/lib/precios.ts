// Precios y planes sin dependencias de la app (sin `api`, sin navegador): así se pueden probar con node --test.

// Soles con el formato de Perú (S/ 1,149.00); dólares como siempre (en-US).
// Intl pone un espacio no separable (U+00A0) entre el símbolo y el número: se cambia por uno normal.
export function formatPrice(price: number, currency: string = 'USD'): string {
  const locale = currency === 'PEN' ? 'es-PE' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(price).replace(/ /g, ' ');
}

export function esPlanGratis(plan: { priceMonthly: number }): boolean {
  return Number(plan.priceMonthly) === 0;
}
