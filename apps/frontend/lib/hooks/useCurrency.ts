import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency as baseCurrency } from '@/lib/utils';

export function useCurrency() {
  const { empresa } = useAuth();
  
  // Get currency symbol from empresa settings
  const getCurrencySymbol = () => {
    if (!empresa?.moneda) return '$';
    
    const symbols: Record<string, string> = {
      PEN: 'S/',
      USD: '$',
      EUR: '€',
    };
    
    return symbols[empresa.moneda] || empresa.moneda;
  };

  // Format currency using empresa settings
  const formatCurrency = (amount: number | string | null | undefined) => {
    return baseCurrency(amount, empresa?.moneda || 'USD');
  };

  return {
    currency: empresa?.moneda || 'USD',
    currencySymbol: getCurrencySymbol(),
    formatCurrency,
  };
}
