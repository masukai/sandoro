import { useState, useCallback, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export type IconType = 'none' | 'progress' | 'hourglass' | 'tomato' | 'coffee';
export type SoundPattern = 'chime' | 'bell' | 'digital' | 'gentle';
export type Language = 'ja' | 'en';

export interface GoalSettings {
  dailySessionsGoal: number;
  dailyMinutesGoal: number;
  weeklySessionsGoal: number;
  weeklyMinutesGoal: number;
}

export interface TimerSettings {
  workDuration: number;
  shortBreak: number;
  longBreak: number;
  sessionsUntilLongBreak: number;
  icon: IconType;
  autoStart: boolean;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  soundVolume: number;
  soundPattern: SoundPattern;
  goals: GoalSettings;
  language: Language;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
}

const DEFAULT_GOALS: GoalSettings = {
  dailySessionsGoal: 0,
  dailyMinutesGoal: 0,
  weeklySessionsGoal: 0,
  weeklyMinutesGoal: 0,
};

// Detect browser language (ja or en)
function detectBrowserLanguage(): Language {
  if (typeof navigator === 'undefined') return 'en';
  const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage || 'en';
  return browserLang.startsWith('ja') ? 'ja' : 'en';
}

const DEFAULT_SETTINGS: TimerSettings = {
  workDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  sessionsUntilLongBreak: 4,
  icon: 'hourglass',
  autoStart: false,
  notificationsEnabled: true,
  soundEnabled: true,
  soundVolume: 50,
  soundPattern: 'chime',
  goals: DEFAULT_GOALS,
  language: detectBrowserLanguage(),
};

const DEFAULT_TAGS: Tag[] = [
  { id: 'work', name: 'Work' },
  { id: 'study', name: 'Study' },
  { id: 'personal', name: 'Personal' },
];

interface SettingsContextValue {
  settings: TimerSettings;
  setSettings: (newSettings: Partial<TimerSettings>) => void;
  resetSettings: () => void;
  tags: Tag[];
  addTag: (name: string, color?: string) => Tag;
  removeTag: (id: string) => void;
  updateTag: (id: string, updates: Partial<Omit<Tag, 'id'>>) => void;
  getTagById: (id: string) => Tag | undefined;
  getTagByName: (name: string) => Tag | undefined;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

// Convert Supabase settings to local format
function fromSupabase(
  data: {
    work_duration: number;
    short_break_duration: number;
    long_break_duration: number;
    sessions_until_long_break: number;
    icon_style: string;
    auto_start: boolean;
    notifications_enabled: boolean;
    sound_enabled: boolean;
    sound_volume: number;
    sound_pattern?: string;
    language?: string;
    tags: string[];
  },
  goals?: {
    daily_sessions: number | null;
    daily_minutes: number | null;
    weekly_sessions: number | null;
    weekly_minutes: number | null;
  } | null
): { settings: TimerSettings; tags: Tag[] } {
  return {
    settings: {
      workDuration: data.work_duration,
      shortBreak: data.short_break_duration,
      longBreak: data.long_break_duration,
      sessionsUntilLongBreak: data.sessions_until_long_break,
      icon: data.icon_style as IconType,
      autoStart: data.auto_start,
      notificationsEnabled: data.notifications_enabled,
      soundEnabled: data.sound_enabled,
      soundVolume: Math.round(data.sound_volume * 100), // Convert 0-1 to 0-100
      soundPattern: (data.sound_pattern as TimerSettings['soundPattern']) || 'chime',
      language: (data.language as Language) || detectBrowserLanguage(),
      goals: goals
        ? {
            dailySessionsGoal: goals.daily_sessions ?? 0,
            dailyMinutesGoal: goals.daily_minutes ?? 0,
            weeklySessionsGoal: goals.weekly_sessions ?? 0,
            weeklyMinutesGoal: goals.weekly_minutes ?? 0,
          }
        : DEFAULT_GOALS,
    },
    tags: data.tags.map((name, index) => ({
      id: `tag-${index}-${name.toLowerCase().replace(/\s+/g, '-')}`,
      name,
    })),
  };
}

// Convert local settings to Supabase format
function toSupabase(settings: TimerSettings, tags: Tag[]) {
  return {
    work_duration: settings.workDuration,
    short_break_duration: settings.shortBreak,
    long_break_duration: settings.longBreak,
    sessions_until_long_break: settings.sessionsUntilLongBreak,
    icon_style: settings.icon,
    auto_start: settings.autoStart,
    notifications_enabled: settings.notificationsEnabled,
    sound_enabled: settings.soundEnabled,
    sound_volume: settings.soundVolume / 100, // Convert 0-100 to 0-1
    sound_pattern: settings.soundPattern,
    language: settings.language,
    tags: tags.map((t) => t.name),
  };
}

// Convert goals to Supabase format
function goalsToSupabase(goals: GoalSettings) {
  return {
    daily_sessions: goals.dailySessionsGoal || null,
    daily_minutes: goals.dailyMinutesGoal || null,
    weekly_sessions: goals.weeklySessionsGoal || null,
    weekly_minutes: goals.weeklyMinutesGoal || null,
  };
}

export function SupabaseSettingsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettingsState] = useState<TimerSettings>(DEFAULT_SETTINGS);
  const [tags, setTags] = useState<Tag[]>(DEFAULT_TAGS);
  const [loading, setLoading] = useState(true);
  const isSaving = useRef(false);

  // Fetch settings from Supabase
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setSettingsState(DEFAULT_SETTINGS);
      setTags(DEFAULT_TAGS);
      setLoading(false);
      return;
    }

    const fetchSettings = async () => {
      setLoading(true);

      // Fetch settings and goals in parallel
      const [settingsResult, goalsResult] = await Promise.all([
        supabase.from('user_settings').select('*').eq('user_id', user.id).single(),
        supabase.from('goals').select('*').eq('user_id', user.id).single(),
      ]);

      if (settingsResult.error) {
        console.error('Failed to fetch settings:', settingsResult.error);
        // Use defaults if fetch fails
      } else if (settingsResult.data) {
        const goalsData = goalsResult.error ? null : goalsResult.data;
        const { settings: s, tags: t } = fromSupabase(settingsResult.data, goalsData);
        setSettingsState(s);
        setTags(t);
      }
      setLoading(false);
    };

    fetchSettings();
  }, [user, authLoading]);

  // Save settings to Supabase (debounced)
  const saveToSupabase = useCallback(
    async (newSettings: TimerSettings, newTags: Tag[]) => {
      if (!user || isSaving.current) return;

      isSaving.current = true;

      // Save settings and goals in parallel
      const [settingsResult, goalsResult] = await Promise.all([
        supabase.from('user_settings').update(toSupabase(newSettings, newTags)).eq('user_id', user.id),
        supabase.from('goals').update(goalsToSupabase(newSettings.goals)).eq('user_id', user.id),
      ]);

      if (settingsResult.error) {
        console.error('Failed to save settings:', settingsResult.error);
      }
      if (goalsResult.error) {
        console.error('Failed to save goals:', goalsResult.error);
      }
      isSaving.current = false;
    },
    [user]
  );

  const setSettings = useCallback(
    (newSettings: Partial<TimerSettings>) => {
      setSettingsState((current) => {
        const updated = { ...current, ...newSettings };
        // Save to Supabase if logged in
        if (user) {
          saveToSupabase(updated, tags);
        }
        return updated;
      });
    },
    [user, tags, saveToSupabase]
  );

  const resetSettings = useCallback(() => {
    setSettingsState(DEFAULT_SETTINGS);
    if (user) {
      saveToSupabase(DEFAULT_SETTINGS, tags);
    }
  }, [user, tags, saveToSupabase]);

  // Tag management
  const addTag = useCallback(
    (name: string, color?: string): Tag => {
      const newTag: Tag = {
        id: `tag-${Date.now()}-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name,
        color,
      };
      setTags((current) => {
        const updated = [...current, newTag];
        if (user) {
          saveToSupabase(settings, updated);
        }
        return updated;
      });
      return newTag;
    },
    [user, settings, saveToSupabase]
  );

  const removeTag = useCallback(
    (id: string) => {
      setTags((current) => {
        const updated = current.filter((tag) => tag.id !== id);
        if (user) {
          saveToSupabase(settings, updated);
        }
        return updated;
      });
    },
    [user, settings, saveToSupabase]
  );

  const updateTag = useCallback(
    (id: string, updates: Partial<Omit<Tag, 'id'>>) => {
      setTags((current) => {
        const updated = current.map((tag) =>
          tag.id === id ? { ...tag, ...updates } : tag
        );
        if (user) {
          saveToSupabase(settings, updated);
        }
        return updated;
      });
    },
    [user, settings, saveToSupabase]
  );

  const getTagById = useCallback(
    (id: string): Tag | undefined => {
      return tags.find((tag) => tag.id === id);
    },
    [tags]
  );

  const getTagByName = useCallback(
    (name: string): Tag | undefined => {
      return tags.find((tag) => tag.name.toLowerCase() === name.toLowerCase());
    },
    [tags]
  );

  return (
    <SettingsContext.Provider
      value={{
        settings,
        setSettings,
        resetSettings,
        tags,
        addTag,
        removeTag,
        updateTag,
        getTagById,
        getTagByName,
        loading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSupabaseSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSupabaseSettings must be used within a SupabaseSettingsProvider');
  }
  return context;
}

// Separate hooks for compatibility with existing code
export function useSettings() {
  const { settings, setSettings, resetSettings } = useSupabaseSettings();
  return { settings, setSettings, resetSettings };
}

export function useTags() {
  const { tags, addTag, removeTag, updateTag, getTagById, getTagByName } = useSupabaseSettings();
  return { tags, addTag, removeTag, updateTag, getTagById, getTagByName };
}
