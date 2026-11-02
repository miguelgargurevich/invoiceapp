// Datos y cálculos del landing que no dependen de React ni de next-intl (sin imports: se prueban con node --test).

export interface FilaVistaPrevia {
  numero: string;
  estado: string;
}

export interface DatosVistaPrevia {
  // Dominio que se muestra en la barra del navegador de la vista previa.
  dominio: string;
  // Valores de las tres tarjetas: comprobantes del mes, ventas del mes, tercer indicador.
  valores: [string, string, string];
  // Comprobantes de ejemplo. Si no hay, la vista previa muestra barras vacías.
  filas?: FilaVistaPrevia[];
}

// Datos de ejemplo de la vista previa (Perú, soles). Son ilustrativos, no cifras de clientes.
const VISTA_PREVIA: DatosVistaPrevia = {
  dominio: 'facturo.gargurevich.dev',
  valores: ['126', 'S/ 18,450.00', '98 %'],
  filas: [
    { numero: 'F001-000123', estado: 'Aceptado por SUNAT' },
    { numero: 'B001-000045', estado: 'Aceptado' },
    { numero: 'FC01-000002', estado: 'Nota de crédito' },
  ],
};

export function datosVistaPrevia(): DatosVistaPrevia {
  return VISTA_PREVIA;
}

// Porcentaje que ahorra el plan anual frente a doce meses del mensual (entero, redondeado).
export function porcentajeAhorro(priceMonthly: number, priceYearly: number): number {
  if (!priceMonthly || !priceYearly) return 0;
  const totalMensual = priceMonthly * 12;
  return Math.round(((totalMensual - priceYearly) / totalMensual) * 100);
}

// Equivalente mensual del plan anual, con dos decimales (569 → 47.42), sin redondear al entero.
export function equivalenteMensual(priceYearly: number): number {
  return Math.round((priceYearly / 12) * 100) / 100;
}
