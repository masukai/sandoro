import { useState, useEffect, useCallback, createContext, useContext, type ReactNode, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'purple' | 'cyan' | 'pink' | 'rainbow';

interface ThemeContextValue {
  mode: ThemeMode;
  accentColor: AccentColor;
  resolvedTheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  setAccentColor: (color: AccentColor) => void;
  loading: boolean;
}

const DEFAULT_MODE: ThemeMode = 'system';
const DEFAULT_ACCENT: AccentColor = 'cyan';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const VALID_ACCENT_COLORS: AccentColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'purple', 'cyan', 'pink', 'rainbow'];

function isValidThemeMode(value: string): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

function isValidAccentColor(value: string): value is AccentColor {
  return VALID_ACCENT_COLORS.includes(value as AccentColor);
}

// Create context with default values
const ThemeContext = createContext<ThemeContextValue | null>(null);

// Provider component
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_MODE);
  const [accentColor, setAccentColorState] = useState<AccentColor>(DEFAULT_ACCENT);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme);
  const [loading, setLoading] = useState(true);
  const isSaving = useRef(false);

  // Fetch theme from Supabase when user logs in
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Not logged in - use defaults
      setModeState(DEFAULT_MODE);
      setAccentColorState(DEFAULT_ACCENT);
      setLoading(false);
      return;
    }

    const fetchTheme = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_settings')
        .select('theme, accent_color')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Failed to fetch theme:', error);
      } else if (data) {
        // Map 'default' theme to 'system' for compatibility
        const themeValue = data.theme === 'default' ? 'system' : data.theme;
        if (isValidThemeMode(themeValue)) {
          setModeState(themeValue);
        }
        if (isValidAccentColor(data.accent_color)) {
          setAccentColorState(data.accent_color);
        }
      }
      setLoading(false);
    };

    fetchTheme();
  }, [user, authLoading]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply theme to document
  useEffect(() => {
    const resolvedTheme = mode === 'system' ? systemTheme : mode;
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    document.documentElement.setAttribute('data-accent', accentColor);
  }, [mode, systemTheme, accentColor]);

  // Save theme to Supabase
  const saveToSupabase = useCallback(
    async (newMode: ThemeMode, newAccent: AccentColor) => {
      if (!user || isSaving.current) return;

      isSaving.current = true;
      const { error } = await supabase
        .from('user_settings')
        .update({
          theme: newMode === 'system' ? 'default' : newMode,
          accent_color: newAccent,
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to save theme:', error);
      }
      isSaving.current = false;
    },
    [user]
  );

  const setMode = useCallback(
    (newMode: ThemeMode) => {
      setModeState(newMode);
      if (user) {
        saveToSupabase(newMode, accentColor);
      }
    },
    [user, accentColor, saveToSupabase]
  );

  const setAccentColor = useCallback(
    (newColor: AccentColor) => {
      setAccentColorState(newColor);
      if (user) {
        saveToSupabase(mode, newColor);
      }
    },
    [user, mode, saveToSupabase]
  );

  const resolvedTheme = mode === 'system' ? systemTheme : mode;

  return (
    <ThemeContext.Provider value={{ mode, accentColor, resolvedTheme, setMode, setAccentColor, loading }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook to use theme context
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Rainbow colors for gradient animation (7 colors of rainbow)
export const RAINBOW_COLORS = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'];

// Accent color metadata for UI
export const ACCENT_COLORS: { value: AccentColor; label: string; color: string }[] = [
  { value: 'red', label: 'Red', color: '#ef4444' },
  { value: 'orange', label: 'Orange', color: '#f97316' },
  { value: 'yellow', label: 'Yellow', color: '#eab308' },
  { value: 'green', label: 'Green', color: '#22c55e' },
  { value: 'blue', label: 'Blue', color: '#3b82f6' },
  { value: 'indigo', label: 'Indigo', color: '#6366f1' },
  { value: 'purple', label: 'Purple', color: '#a855f7' },
  { value: 'cyan', label: 'Cyan', color: '#22d3ee' },
  { value: 'pink', label: 'Pink', color: '#ec4899' },
  { value: 'rainbow', label: 'Rainbow', color: 'linear-gradient(135deg, #00bfff, #8000ff, #ff00ff, #ff0000, #ffff00, #00ff00, #00ffff)' },
];
