'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { usePreferences, Theme, FontSize } from './PreferencesContext';

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
  const { preferences, updatePreferences } = usePreferences();
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only apply theme on the client
    if (typeof window === 'undefined') return;
    
    const root = window.document.documentElement;

    // Function to determine the current theme
    const getResolvedTheme = (): 'light' | 'dark' => {
      if (preferences.theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return preferences.theme;
    };

    const applyTheme = () => {
      const resolved = getResolvedTheme();
      setResolvedTheme(resolved);
      
      root.classList.remove('light', 'dark');
      root.classList.add(resolved);
    };

    applyTheme();

    // Listen to system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (preferences.theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [preferences.theme, mounted]);

  useEffect(() => {
    // Apply font size
    if (typeof window === 'undefined') return;
    const root = window.document.documentElement;
    
    root.classList.remove('text-small', 'text-medium', 'text-large');
    root.classList.add(`text-${preferences.fontSize}`);
  }, [preferences.fontSize]);

  const setTheme = useCallback((newTheme: Theme) => {
    updatePreferences({ theme: newTheme });
  }, [updatePreferences]);

  const setFontSize = useCallback((size: FontSize) => {
    updatePreferences({ fontSize: size });
  }, [updatePreferences]);

  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider 
      value={{ 
        theme: preferences.theme, 
        setTheme, 
        toggleTheme, 
        resolvedTheme, 
        fontSize: preferences.fontSize, 
        setFontSize 
      }}
    >
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
