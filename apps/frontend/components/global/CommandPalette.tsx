'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  FilePlus,
  FileCheck,
  Users,
  UserPlus,
  Package,
  PackagePlus,
  BarChart3,
  Settings,
  Search,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const t = useTranslations('commandPalette');
  const [search, setSearch] = useState('');

  const handleSelect = useCallback(
    (action: string) => {
      onClose();
      setSearch('');

      switch (action) {
        case 'dashboard':
          router.push('/dashboard');
          break;
        case 'new-invoice':
          router.push('/facturas/nueva');
          break;
        case 'invoices':
          router.push('/facturas');
          break;
        case 'new-quote':
          router.push('/proformas/nueva');
          break;
        case 'quotes':
          router.push('/proformas');
          break;
        case 'new-client':
          router.push('/clientes/nuevo');
          break;
        case 'clients':
          router.push('/clientes');
          break;
        case 'new-product':
          router.push('/productos/nuevo');
          break;
        case 'products':
          router.push('/productos');
          break;
        case 'reports':
          router.push('/reportes');
          break;
        case 'settings':
          router.push('/configuracion');
          break;
      }
    },
    [router, onClose]
  );

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }

      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const commands = [
    {
      group: t('navigation'),
      items: [
        { id: 'dashboard', label: t('commands.goToDashboard'), icon: LayoutDashboard },
        { id: 'invoices', label: t('commands.viewInvoices'), icon: FileText },
        { id: 'quotes', label: t('commands.viewQuotes'), icon: FileCheck },
        { id: 'clients', label: t('commands.viewClients'), icon: Users },
        { id: 'products', label: t('commands.viewProducts'), icon: Package },
        { id: 'reports', label: t('commands.viewReports'), icon: BarChart3 },
        { id: 'settings', label: t('commands.openSettings'), icon: Settings },
      ],
    },
    {
      group: t('create'),
      items: [
        { id: 'new-invoice', label: t('commands.newInvoice'), icon: FilePlus },
        { id: 'new-quote', label: t('commands.newQuote'), icon: FilePlus },
        { id: 'new-client', label: t('commands.newClient'), icon: UserPlus },
        { id: 'new-product', label: t('commands.newProduct'), icon: PackagePlus },
      ],
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-x-4 top-[20%] mx-auto max-w-xl z-50"
          >
            <Command
              className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              loop
            >
              {/* Input de búsqueda */}
              <div className="flex items-center gap-3 px-4 border-b border-gray-200 dark:border-gray-700">
                <Search className="w-5 h-5 text-gray-400" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder={t('placeholder')}
                  className="flex-1 py-4 text-base bg-transparent outline-none placeholder-gray-400"
                />
                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 rounded">
                  ESC
                </kbd>
              </div>

              {/* Lista de comandos */}
              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-sm text-gray-500">
                  {t('noResults')}
                </Command.Empty>

                {commands.map((group) => (
                  <Command.Group
                    key={group.group}
                    heading={group.group}
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-gray-500 [&_[cmdk-group-heading]]:uppercase"
                  >
                    {group.items.map((item) => (
                      <Command.Item
                        key={item.id}
                        value={item.label}
                        onSelect={() => handleSelect(item.id)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-blue-50 dark:aria-selected:bg-blue-900/20 aria-selected:text-blue-600 dark:aria-selected:text-blue-400"
                      >
                        <item.icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
