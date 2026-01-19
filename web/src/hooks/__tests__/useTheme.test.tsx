import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ThemeProvider, useTheme, ACCENT_COLORS, RAINBOW_COLORS } from '../useTheme';
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
const mockThemeSelect = vi.fn();
const mockThemeUpdate = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mockThemeSelect,
        }),
      }),
      update: (data: unknown) => ({
        eq: () => mockThemeUpdate(data),
      }),
    }),
  },
}));

// Mock matchMedia
const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
  matches: query === '(prefers-color-scheme: dark)',
  media: query,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

Object.defineProperty(window, 'matchMedia', { value: matchMediaMock });

// Wrapper component for providing ThemeContext
function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('useTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthLoading = false;
    mockAuthUser = null;
    mockThemeSelect.mockResolvedValue({ data: null, error: null });
    mockThemeUpdate.mockResolvedValue({ error: null });
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-accent');
  });

  describe('ThemeProvider', () => {
    it('should provide default theme values when not authenticated', async () => {
      mockAuthUser = null;

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.mode).toBe('system');
      expect(result.current.accentColor).toBe('cyan');
      expect(result.current.resolvedTheme).toBe('dark'); // matchMedia mock returns dark
    });

    it('should throw error when used outside ThemeProvider', () => {
      expect(() => {
        renderHook(() => useTheme());
      }).toThrow('useTheme must be used within a ThemeProvider');
    });

    it('should fetch theme from Supabase when authenticated', async () => {
      mockAuthUser = mockUser;
      mockThemeSelect.mockResolvedValue({
        data: {
          theme: 'light',
          accent_color: 'purple',
        },
        error: null,
      });

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.mode).toBe('light');
      expect(result.current.accentColor).toBe('purple');
    });

    it('should map default theme to system mode', async () => {
      mockAuthUser = mockUser;
      mockThemeSelect.mockResolvedValue({
        data: {
          theme: 'default',
          accent_color: 'cyan',
        },
        error: null,
      });

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.mode).toBe('system');
    });
  });

  describe('setMode', () => {
    it('should update mode to light', async () => {
      mockAuthUser = null;

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setMode('light');
      });

      expect(result.current.mode).toBe('light');
      expect(result.current.resolvedTheme).toBe('light');
    });

    it('should update mode to dark', async () => {
      mockAuthUser = null;

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setMode('dark');
      });

      expect(result.current.mode).toBe('dark');
      expect(result.current.resolvedTheme).toBe('dark');
    });

    it('should update mode to system', async () => {
      mockAuthUser = null;

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // First set to light
      act(() => {
        result.current.setMode('light');
      });

      // Then back to system
      act(() => {
        result.current.setMode('system');
      });

      expect(result.current.mode).toBe('system');
      expect(result.current.resolvedTheme).toBe('dark'); // matchMedia mock returns dark
    });

    it('should save to Supabase when authenticated', async () => {
      mockAuthUser = mockUser;
      mockThemeSelect.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setMode('dark');
      });

      await waitFor(() => {
        expect(mockThemeUpdate).toHaveBeenCalled();
      });

      const savedData = mockThemeUpdate.mock.calls[0][0];
      expect(savedData.theme).toBe('dark');
    });
  });

  describe('setAccentColor', () => {
    it('should update accent color to rainbow', async () => {
      mockAuthUser = null;

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setAccentColor('rainbow');
      });

      expect(result.current.accentColor).toBe('rainbow');
    });

    it('should update accent color from rainbow to cyan', async () => {
      mockAuthUser = null;

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setAccentColor('rainbow');
      });

      act(() => {
        result.current.setAccentColor('cyan');
      });

      expect(result.current.accentColor).toBe('cyan');
    });

    it('should update accent color to any valid color', async () => {
      mockAuthUser = null;

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const testColors = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'purple', 'pink'] as const;

      for (const color of testColors) {
        act(() => {
          result.current.setAccentColor(color);
        });

        expect(result.current.accentColor).toBe(color);
      }
    });

    it('should save to Supabase when authenticated', async () => {
      mockAuthUser = mockUser;
      mockThemeSelect.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setAccentColor('purple');
      });

      await waitFor(() => {
        expect(mockThemeUpdate).toHaveBeenCalled();
      });

      const savedData = mockThemeUpdate.mock.calls[0][0];
      expect(savedData.accent_color).toBe('purple');
    });
  });

  describe('document attributes', () => {
    it('should set data-theme attribute on document', async () => {
      mockAuthUser = null;

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should set data-accent attribute on document', async () => {
      mockAuthUser = null;

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(document.documentElement.getAttribute('data-accent')).toBe('cyan');
    });

    it('should update data-accent when accent color changes', async () => {
      mockAuthUser = null;

      const { result } = renderHook(() => useTheme(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setAccentColor('rainbow');
      });

      expect(document.documentElement.getAttribute('data-accent')).toBe('rainbow');
    });
  });
});

describe('ACCENT_COLORS', () => {
  it('should contain all expected colors', () => {
    const expectedColors = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'purple', 'cyan', 'pink', 'rainbow'];
    const colorValues = ACCENT_COLORS.map((c) => c.value);

    expect(colorValues).toEqual(expectedColors);
  });

  it('should have color values for each accent', () => {
    for (const accent of ACCENT_COLORS) {
      expect(accent.color).toBeDefined();
      expect(typeof accent.color).toBe('string');
      expect(accent.label).toBeDefined();
    }
  });

  it('should have gradient for rainbow', () => {
    const rainbow = ACCENT_COLORS.find((c) => c.value === 'rainbow');
    expect(rainbow?.color).toContain('linear-gradient');
  });
});

describe('RAINBOW_COLORS', () => {
  it('should contain 7 colors', () => {
    expect(RAINBOW_COLORS).toHaveLength(7);
  });

  it('should contain valid hex colors', () => {
    for (const color of RAINBOW_COLORS) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
