import { useState, useCallback, createContext, useContext, ReactNode } from 'react';

export type IconType = 'none' | 'progress' | 'hourglass' | 'tomato' | 'coffee';

export interface TimerSettings {
  workDuration: number; // in minutes
  shortBreak: number;
  longBreak: number;
  sessionsUntilLongBreak: number;
  icon: IconType;
  autoStart: boolean;
}

const STORAGE_KEY = 'sandoro-settings';

const DEFAULT_SETTINGS: TimerSettings = {
  workDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  sessionsUntilLongBreak: 4,
  icon: 'hourglass',
  autoStart: false,
};

function getStoredSettings(): TimerSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
  return DEFAULT_SETTINGS;
}

interface SettingsContextValue {
  settings: TimerSettings;
  setSettings: (newSettings: Partial<TimerSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<TimerSettings>(getStoredSettings);

  const setSettings = useCallback((newSettings: Partial<TimerSettings>) => {
    setSettingsState((current) => {
      const updated = { ...current, ...newSettings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettingsState(DEFAULT_SETTINGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, setSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
