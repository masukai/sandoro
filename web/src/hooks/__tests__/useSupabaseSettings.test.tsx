import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  SupabaseSettingsProvider,
  useSupabaseSettings,
  useSettings,
  useTags,
} from '../useSupabaseSettings';
import type { ReactNode } from 'react';

// Mock useAuth
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
};

let mockAuthLoading = false;
let mockAuthUser: typeof mockUser | null = null;

vi.mock('../useAuth', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    loading: mockAuthLoading,
  }),
}));

// Mock Supabase
const mockSettingsSelect = vi.fn();
const mockGoalsSelect = vi.fn();
const mockSettingsUpdate = vi.fn();
const mockGoalsUpdate = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'user_settings') {
        return {
          select: () => ({
            eq: () => ({
              single: mockSettingsSelect,
            }),
          }),
          update: (data: unknown) => ({
            eq: () => mockSettingsUpdate(data),
          }),
        };
      }
      if (table === 'goals') {
        return {
          select: () => ({
            eq: () => ({
              single: mockGoalsSelect,
            }),
          }),
          update: (data: unknown) => ({
            eq: () => mockGoalsUpdate(data),
          }),
        };
      }
      return {};
    },
  },
}));

// Wrapper component
function wrapper({ children }: { children: ReactNode }) {
  return <SupabaseSettingsProvider>{children}</SupabaseSettingsProvider>;
}

describe('useSupabaseSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthLoading = false;
    mockAuthUser = null;
    mockSettingsSelect.mockResolvedValue({ data: null, error: null });
    mockGoalsSelect.mockResolvedValue({ data: null, error: null });
    mockSettingsUpdate.mockResolvedValue({ error: null });
    mockGoalsUpdate.mockResolvedValue({ error: null });
  });

  describe('SupabaseSettingsProvider', () => {
    it('should throw error when used outside provider', () => {
      expect(() => {
        renderHook(() => useSupabaseSettings());
      }).toThrow('useSupabaseSettings must be used within a SupabaseSettingsProvider');
    });

    it('should provide default settings when not authenticated', async () => {
      mockAuthUser = null;

      const { result } = renderHook(() => useSupabaseSettings(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.settings.workDuration).toBe(25);
      expect(result.current.settings.shortBreak).toBe(5);
      expect(result.current.settings.longBreak).toBe(15);
      expect(result.current.settings.sessionsUntilLongBreak).toBe(4);
    });

    it('should provide default tags when not authenticated', async () => {
      mockAuthUser = null;

      const { result } = renderHook(() => useSupabaseSettings(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.tags).toHaveLength(3);
      expect(result.current.tags.map((t) => t.name)).toEqual(['Work', 'Study', 'Personal']);
    });

    it('should fetch settings from Supabase when authenticated', async () => {
      mockAuthUser = mockUser;
      mockSettingsSelect.mockResolvedValue({
        data: {
          work_duration: 30,
          short_break_duration: 10,
          long_break_duration: 20,
          sessions_until_long_break: 6,
          icon_style: 'tomato',
          auto_start: true,
          notifications_enabled: false,
          sound_enabled: false,
          sound_volume: 0.8,
          tags: ['Custom Tag 1', 'Custom Tag 2'],
        },
        error: null,
      });

      const { result } = renderHook(() => useSupabaseSettings(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.settings.workDuration).toBe(30);
      expect(result.current.settings.shortBreak).toBe(10);
      expect(result.current.settings.longBreak).toBe(20);
      expect(result.current.settings.sessionsUntilLongBreak).toBe(6);
      expect(result.current.settings.icon).toBe('tomato');
      expect(result.current.settings.autoStart).toBe(true);
      expect(result.current.settings.soundVolume).toBe(80);
      expect(result.current.tags).toHaveLength(2);
      expect(result.current.tags.map((t) => t.name)).toEqual(['Custom Tag 1', 'Custom Tag 2']);
    });

    it('should handle fetch error gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockAuthUser = mockUser;
      mockSettingsSelect.mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      const { result } = renderHook(() => useSupabaseSettings(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should still use defaults
      expect(result.current.settings.workDuration).toBe(25);
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('setSettings', () => {
    it('should update settings locally', async () => {
      mockAuthUser = null;

      const { result } = renderHook(() => useSupabaseSettings(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setSettings({ workDuration: 50 });
      });

      expect(result.current.settings.workDuration).toBe(50);
    });

    it('should save to Supabase when authenticated', async () => {
      mockAuthUser = mockUser;
      mockSettingsSelect.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useSupabaseSettings(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setSettings({ workDuration: 45 });
      });

      await waitFor(() => {
        expect(mockSettingsUpdate).toHaveBeenCalled();
      });

      const savedData = mockSettingsUpdate.mock.calls[0][0];
      expect(savedData.work_duration).toBe(45);
    });
  });

  describe('resetSettings', () => {
    it('should reset settings to defaults', async () => {
      mockAuthUser = null;

      const { result } = renderHook(() => useSupabaseSettings(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // First modify settings
      act(() => {
        result.current.setSettings({ workDuration: 60, shortBreak: 15 });
      });

      expect(result.current.settings.workDuration).toBe(60);
      expect(result.current.settings.shortBreak).toBe(15);

      // Then reset
      act(() => {
        result.current.resetSettings();
      });

      expect(result.current.settings.workDuration).toBe(25);
      expect(result.current.settings.shortBreak).toBe(5);
    });
  });

  describe('tag management', () => {
    it('should add a new tag', async () => {
      mockAuthUser = null;

      const { result } = renderHook(() => useSupabaseSettings(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let newTag: ReturnType<typeof result.current.addTag>;
      act(() => {
        newTag = result.current.addTag('New Tag', '#ff0000');
      });

      expect(result.current.tags).toHaveLength(4);
      expect(result.current.tags[3].name).toBe('New Tag');
      expect(result.current.tags[3].color).toBe('#ff0000');
      expect(newTag!.name).toBe('New Tag');
    });

    it('should remove a tag', async () => {
      mockAuthUser = null;

      const { result } = renderHook(() => useSupabaseSettings(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const tagToRemove = result.current.tags[0];

      act(() => {
        result.current.removeTag(tagToRemove.id);
      });

      expect(result.current.tags).toHaveLength(2);
      expect(result.current.tags.find((t) => t.id === tagToRemove.id)).toBeUndefined();
    });

    it('should update a tag', async () => {
      mockAuthUser = null;

      const { result } = renderHook(() => useSupabaseSettings(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const tagToUpdate = result.current.tags[0];

      act(() => {
        result.current.updateTag(tagToUpdate.id, { name: 'Updated Name', color: '#00ff00' });
      });

      const updatedTag = result.current.tags.find((t) => t.id === tagToUpdate.id);
      expect(updatedTag?.name).toBe('Updated Name');
      expect(updatedTag?.color).toBe('#00ff00');
    });

    it('should get tag by id', async () => {
      mockAuthUser = null;

      const { result } = renderHook(() => useSupabaseSettings(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const firstTag = result.current.tags[0];
      const foundTag = result.current.getTagById(firstTag.id);

      expect(foundTag).toEqual(firstTag);
    });

    it('should get tag by name (case insensitive)', async () => {
      mockAuthUser = null;

      const { result } = renderHook(() => useSupabaseSettings(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const foundTag = result.current.getTagByName('WORK');

      expect(foundTag?.name).toBe('Work');
    });

    it('should save tags to Supabase when authenticated', async () => {
      mockAuthUser = mockUser;
      mockSettingsSelect.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useSupabaseSettings(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.addTag('Remote Work');
      });

      await waitFor(() => {
        expect(mockSettingsUpdate).toHaveBeenCalled();
      });

      const savedData = mockSettingsUpdate.mock.calls[0][0];
      expect(savedData.tags).toContain('Remote Work');
    });
  });
});

describe('useSettings (compatibility hook)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthLoading = false;
    mockAuthUser = null;
    mockSettingsSelect.mockResolvedValue({ data: null, error: null });
  });

  it('should provide settings, setSettings, and resetSettings', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });

    await waitFor(() => {
      expect(result.current.settings).toBeDefined();
    });

    expect(result.current.setSettings).toBeDefined();
    expect(result.current.resetSettings).toBeDefined();
  });
});

describe('useTags (compatibility hook)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthLoading = false;
    mockAuthUser = null;
    mockSettingsSelect.mockResolvedValue({ data: null, error: null });
  });

  it('should provide tag management functions', async () => {
    const { result } = renderHook(() => useTags(), { wrapper });

    await waitFor(() => {
      expect(result.current.tags).toBeDefined();
    });

    expect(result.current.addTag).toBeDefined();
    expect(result.current.removeTag).toBeDefined();
    expect(result.current.updateTag).toBeDefined();
    expect(result.current.getTagById).toBeDefined();
    expect(result.current.getTagByName).toBeDefined();
  });
});
