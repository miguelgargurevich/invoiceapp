'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';
type FontSize = 'small' | 'medium' | 'large';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  resolvedTheme: 'light' | 'dark';
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Inicializar con valores de localStorage si están disponibles
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      return savedTheme || 'system';
    }
    return 'system';
  });
  
  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    if (typeof window !== 'undefined') {
      const savedFontSize = localStorage.getItem('fontSize') as FontSize | null;
      return savedFontSize || 'medium';
    }
    return 'medium';
  });
  
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Solo aplicar tema en el cliente
    if (typeof window === 'undefined') return;
    
    const root = window.document.documentElement;

    // Función para determinar el tema actual
    const getResolvedTheme = (): 'light' | 'dark' => {
      if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return theme;
    };

    const applyTheme = () => {
      const resolved = getResolvedTheme();
      setResolvedTheme(resolved);
      
      root.classList.remove('light', 'dark');
      root.classList.add(resolved);
    };

    applyTheme();

    // Escuchar cambios en preferencia del sistema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted]);

  useEffect(() => {
    // Aplicar tamaño de fuente
    if (typeof window === 'undefined') return;
    const root = window.document.documentElement;
    
    root.classList.remove('text-small', 'text-medium', 'text-large');
    root.classList.add(`text-${fontSize}`);
  }, [fontSize]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
    }
  };

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fontSize', size);
    }
  };

  const toggleTheme = () => {
    const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, resolvedTheme, fontSize, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
