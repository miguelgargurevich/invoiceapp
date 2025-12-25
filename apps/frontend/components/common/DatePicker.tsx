'use client';

import { forwardRef, useState } from 'react';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  locale?: 'es' | 'en';
  className?: string;
}

export const DatePicker = forwardRef<HTMLDivElement, DatePickerProps>(
  function DatePicker(
    {
      value,
      onChange,
      label,
      placeholder = 'Seleccionar fecha',
      error,
      disabled = false,
      minDate,
      maxDate,
      locale = 'es',
      className,
    },
    ref
  ) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(value || new Date());

    const dateLocale = locale === 'es' ? es : enUS;

    const daysInMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    ).getDate();

    const firstDayOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    ).getDay();

    const prevMonth = () => {
      setCurrentMonth(
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
      );
    };

    const nextMonth = () => {
      setCurrentMonth(
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
      );
    };

    const selectDate = (day: number) => {
      const newDate = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day
      );
      onChange(newDate);
      setIsOpen(false);
    };

    const isDateDisabled = (day: number) => {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day
      );
      if (minDate && date < minDate) return true;
      if (maxDate && date > maxDate) return true;
      return false;
    };

    const isSelectedDate = (day: number) => {
      if (!value) return false;
      return (
        value.getDate() === day &&
        value.getMonth() === currentMonth.getMonth() &&
        value.getFullYear() === currentMonth.getFullYear()
      );
    };

    const isToday = (day: number) => {
      const today = new Date();
      return (
        today.getDate() === day &&
        today.getMonth() === currentMonth.getMonth() &&
        today.getFullYear() === currentMonth.getFullYear()
      );
    };

    const dayNames =
      locale === 'es'
        ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div ref={ref} className={cn('relative', className)}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
          </label>
        )}

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
          <Calendar className="w-4 h-4 text-gray-400" />
          <span
            className={cn(
              'flex-1',
              value
                ? 'text-gray-900 dark:text-gray-100'
                : 'text-gray-400 dark:text-gray-500'
            )}
          >
            {value ? format(value, 'PPP', { locale: dateLocale }) : placeholder}
          </span>
        </button>

        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}

        {isOpen && (
          <>
            {/* Overlay para cerrar */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Calendar dropdown */}
            <div className="absolute z-20 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 w-72">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
                </span>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Day names */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for days before the first day of month */}
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {/* Days of the month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isDisabled = isDateDisabled(day);
                  const isSelected = isSelectedDate(day);
                  const isTodayDate = isToday(day);

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => !isDisabled && selectDate(day)}
                      disabled={isDisabled}
                      className={cn(
                        'w-8 h-8 text-sm rounded-full transition-colors',
                        isSelected
                          ? 'bg-primary-500 text-white'
                          : isTodayDate
                          ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700',
                        isDisabled && 'opacity-30 cursor-not-allowed',
                        !isSelected &&
                          !isTodayDate &&
                          'text-gray-900 dark:text-gray-100'
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Quick actions */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onChange(new Date());
                    setIsOpen(false);
                  }}
                  className="flex-1 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 py-1 rounded"
                >
                  {locale === 'es' ? 'Hoy' : 'Today'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    setIsOpen(false);
                  }}
                  className="flex-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 py-1 rounded"
                >
                  {locale === 'es' ? 'Limpiar' : 'Clear'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }
);
