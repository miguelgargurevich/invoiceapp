'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import api from '@/lib/api';

export type Theme = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'medium' | 'large';
export type Locale = 'es' | 'en';

export interface UserPreferences {
  id?: string;
  userId?: string;
  theme: Theme;
  fontSize: FontSize;
  locale: Locale;
  emailFactura: boolean;
  emailVencimiento: boolean;
  emailPago: boolean;
  diasAntesVencimiento: number;
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  fontSize: 'large',
  locale: 'en',
  emailFactura: true,
  emailVencimiento: true,
  emailPago: true,
  diasAntesVencimiento: 5,
};

interface PreferencesContextType {
  preferences: UserPreferences;
  loading: boolean;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Load preferences from localStorage first (for initial render), then from API
  useEffect(() => {
    if (typeof window !== 'undefined' && !initialized) {
      // Load from localStorage as initial fallback
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      const savedFontSize = localStorage.getItem('fontSize') as FontSize | null;
      const savedLocale = localStorage.getItem('preferredLocale') as Locale | null;
      
      if (savedTheme || savedFontSize || savedLocale) {
        setPreferences(prev => ({
          ...prev,
          theme: savedTheme || prev.theme,
          fontSize: savedFontSize || prev.fontSize,
          locale: savedLocale || prev.locale,
        }));
      }
      setInitialized(true);
    }
  }, [initialized]);

  // Load preferences from API when user is authenticated
  const loadPreferences = useCallback(async () => {
    if (!session?.access_token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get<UserPreferences>('/preferences');
      
      if (response) {
        const dbPreferences: UserPreferences = {
          ...defaultPreferences,
          ...response,
          theme: (response.theme as Theme) || defaultPreferences.theme,
          fontSize: (response.fontSize as FontSize) || defaultPreferences.fontSize,
          locale: (response.locale as Locale) || defaultPreferences.locale,
        };
        
        setPreferences(dbPreferences);
        
        // Sync to localStorage and cookie as fallback
        if (typeof window !== 'undefined') {
          localStorage.setItem('theme', dbPreferences.theme);
          localStorage.setItem('fontSize', dbPreferences.fontSize);
          localStorage.setItem('preferredLocale', dbPreferences.locale);
          // Set cookie for middleware
          document.cookie = `preferredLocale=${dbPreferences.locale};path=/;max-age=31536000`;
        }
      }
    } catch (error) {
      console.error('[PreferencesContext] Error loading preferences:', error);
      // Keep localStorage values as fallback
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (session?.access_token) {
      loadPreferences();
    } else {
      setLoading(false);
    }
  }, [session?.access_token, loadPreferences]);

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    // Optimistic update
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);

    // Sync to localStorage and cookie immediately
    if (typeof window !== 'undefined') {
      if (updates.theme) localStorage.setItem('theme', updates.theme);
      if (updates.fontSize) localStorage.setItem('fontSize', updates.fontSize);
      if (updates.locale) {
        localStorage.setItem('preferredLocale', updates.locale);
        // Also set cookie for middleware to read
        document.cookie = `preferredLocale=${updates.locale};path=/;max-age=31536000`; // 1 year
      }
    }

    // Save to DB if authenticated
    if (session?.access_token) {
      try {
        await api.put('/preferences', updates);
      } catch (error) {
        console.error('[PreferencesContext] Error saving preferences:', error);
        // Preferences are already in localStorage, so user won't lose them
      }
    }
  };

  const refreshPreferences = async () => {
    await loadPreferences();
  };

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        loading,
        updatePreferences,
        refreshPreferences,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
