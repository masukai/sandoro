import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'purple' | 'cyan' | 'pink' | 'rainbow';

interface ThemeContextValue {
  mode: ThemeMode;
  accentColor: AccentColor;
  resolvedTheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  setAccentColor: (color: AccentColor) => void;
}

const MODE_STORAGE_KEY = 'sandoro-theme-mode';
const ACCENT_STORAGE_KEY = 'sandoro-accent-color';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(MODE_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

const VALID_ACCENT_COLORS: AccentColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'purple', 'cyan', 'pink', 'rainbow'];

function getStoredAccentColor(): AccentColor {
  if (typeof window === 'undefined') return 'cyan';
  const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
  if (stored && VALID_ACCENT_COLORS.includes(stored as AccentColor)) {
    return stored as AccentColor;
  }
  return 'cyan';
}

// Create context with default values
const ThemeContext = createContext<ThemeContextValue | null>(null);

// Provider component
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getStoredMode);
  const [accentColor, setAccentColorState] = useState<AccentColor>(getStoredAccentColor);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme);

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

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(MODE_STORAGE_KEY, newMode);
  }, []);

  const setAccentColor = useCallback((newColor: AccentColor) => {
    setAccentColorState(newColor);
    localStorage.setItem(ACCENT_STORAGE_KEY, newColor);
  }, []);

  const resolvedTheme = mode === 'system' ? systemTheme : mode;

  return (
    <ThemeContext.Provider value={{ mode, accentColor, resolvedTheme, setMode, setAccentColor }}>
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

// Accent color metadata for UI (虹色7色 + cyan, pink, rainbow)
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
