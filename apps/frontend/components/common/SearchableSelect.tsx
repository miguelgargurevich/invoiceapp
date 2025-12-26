'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Search, ChevronDown, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  error?: string;
  disabled?: boolean;
  loading?: boolean;
  clearable?: boolean;
  required?: boolean;
  className?: string;
  emptyMessage?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  label,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  error,
  disabled = false,
  loading = false,
  clearable = false,
  required = false,
  className,
  emptyMessage = 'No hay opciones disponibles',
}: SearchableSelectProps) {
  const t = useTranslations('common');
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    
    const searchLower = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(searchLower) ||
        opt.description?.toLowerCase().includes(searchLower)
    );
  }, [options, search]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
    } else if (e.key === 'Enter' && filteredOptions.length === 1) {
      handleSelect(filteredOptions[0].value);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-left',
          'border rounded-lg transition-colors',
          'bg-white dark:bg-gray-800',
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          disabled && 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-900',
          !disabled && 'hover:border-gray-400 dark:hover:border-gray-500'
        )}
      >
        <span
          className={cn(
            'flex-1 truncate',
            selectedOption
              ? 'text-gray-900 dark:text-gray-100'
              : 'text-gray-400 dark:text-gray-500'
          )}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        <div className="flex items-center gap-1">
          {clearable && value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-gray-400 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </button>

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-[100] mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          {/* Search input */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className={cn(
                  'w-full pl-9 pr-3 py-2 text-sm',
                  'border border-gray-200 dark:border-gray-700 rounded-lg',
                  'bg-gray-50 dark:bg-gray-900',
                  'text-gray-900 dark:text-gray-100',
                  'placeholder-gray-400 dark:placeholder-gray-500',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
                )}
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto py-1">
            {loading ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                {t('loading')}
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                {search ? t('noResults') : emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => !option.disabled && handleSelect(option.value)}
                  disabled={option.disabled}
                  className={cn(
                    'w-full px-4 py-2 text-left flex items-start gap-3',
                    'transition-colors',
                    option.disabled
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700',
                    value === option.value && 'bg-primary-50 dark:bg-primary-900/20'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        'text-sm truncate',
                        value === option.value
                          ? 'text-primary-600 dark:text-primary-400 font-medium'
                          : 'text-gray-900 dark:text-gray-100'
                      )}
                    >
                      {option.label}
                    </div>
                    {option.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {option.description}
                      </div>
                    )}
                  </div>
                  {value === option.value && (
                    <Check className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Variante para clientes
interface ClientSelectProps {
  clients: Array<{
    id: string;
    nombre: string;
    documento: string;
    email?: string;
  }>;
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  loading?: boolean;
  required?: boolean;
}

export function ClientSelect({
  clients,
  value,
  onChange,
  label = 'Cliente',
  placeholder = 'Seleccionar cliente...',
  error,
  disabled,
  loading,
  required,
}: ClientSelectProps) {
  const options: SelectOption[] = clients.map((client) => ({
    value: client.id,
    label: client.nombre,
    description: `${client.documento}${client.email ? ` • ${client.email}` : ''}`,
  }));

  return (
    <SearchableSelect
      options={options}
      value={value}
      onChange={onChange}
      label={label}
      placeholder={placeholder}
      searchPlaceholder="Buscar por nombre o documento..."
      error={error}
      disabled={disabled}
      loading={loading}
      required={required}
      clearable
      emptyMessage="No hay clientes registrados"
    />
  );
}

// Variante para productos
interface ProductSelectProps {
  products: Array<{
    id: string;
    codigo: string;
    nombre: string;
    precioVenta: number;
    unidadMedida: string;
  }>;
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  loading?: boolean;
  required?: boolean;
}

export function ProductSelect({
  products,
  value,
  onChange,
  label,
  placeholder = 'Seleccionar producto...',
  error,
  disabled,
  loading,
  required,
}: ProductSelectProps) {
  const t = useTranslations('invoices');
  const tEmpty = useTranslations('emptyState');
  const options: SelectOption[] = products.map((product) => ({
    value: product.id,
    label: product.nombre,
    description: `${product.codigo} • S/ ${(parseFloat(String(product.precioVenta)) || 0).toFixed(2)} / ${product.unidadMedida}`,
  }));

  return (
    <SearchableSelect
      options={options}
      value={value}
      onChange={onChange}
      label={label}
      placeholder={placeholder || t('selectProduct')}
      searchPlaceholder="Buscar por código o nombre..."
      error={error}
      disabled={disabled}
      loading={loading}
      required={required}
      clearable
      emptyMessage={tEmpty('noProductsRegistered')}
    />
  );
}
