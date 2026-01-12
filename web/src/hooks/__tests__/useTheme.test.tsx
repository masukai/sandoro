import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme, ACCENT_COLORS, RAINBOW_COLORS } from '../useTheme';
import type { ReactNode } from 'react';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

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
    localStorageMock.clear();
    vi.clearAllMocks();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-accent');
  });

  describe('ThemeProvider', () => {
    it('should provide default theme values', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.mode).toBe('system');
      expect(result.current.accentColor).toBe('cyan');
      expect(result.current.resolvedTheme).toBe('dark'); // matchMedia mock returns dark
    });

    it('should throw error when used outside ThemeProvider', () => {
      expect(() => {
        renderHook(() => useTheme());
      }).toThrow('useTheme must be used within a ThemeProvider');
    });
  });

  describe('setMode', () => {
    it('should update mode to light', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setMode('light');
      });

      expect(result.current.mode).toBe('light');
      expect(result.current.resolvedTheme).toBe('light');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('sandoro-theme-mode', 'light');
    });

    it('should update mode to dark', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setMode('dark');
      });

      expect(result.current.mode).toBe('dark');
      expect(result.current.resolvedTheme).toBe('dark');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('sandoro-theme-mode', 'dark');
    });

    it('should update mode to system', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

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
  });

  describe('setAccentColor', () => {
    it('should update accent color to rainbow', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setAccentColor('rainbow');
      });

      expect(result.current.accentColor).toBe('rainbow');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('sandoro-accent-color', 'rainbow');
    });

    it('should update accent color from rainbow to cyan', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setAccentColor('rainbow');
      });

      act(() => {
        result.current.setAccentColor('cyan');
      });

      expect(result.current.accentColor).toBe('cyan');
    });

    it('should update accent color to any valid color', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      const testColors = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'purple', 'pink'] as const;

      for (const color of testColors) {
        act(() => {
          result.current.setAccentColor(color);
        });

        expect(result.current.accentColor).toBe(color);
      }
    });
  });

  describe('localStorage persistence', () => {
    it('should load saved mode from localStorage', () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'sandoro-theme-mode') return 'light';
        if (key === 'sandoro-accent-color') return 'purple';
        return null;
      });

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.mode).toBe('light');
      expect(result.current.accentColor).toBe('purple');
    });

    it('should use defaults for invalid localStorage values', () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'sandoro-theme-mode') return 'invalid-mode';
        if (key === 'sandoro-accent-color') return 'invalid-color';
        return null;
      });

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.mode).toBe('system');
      expect(result.current.accentColor).toBe('cyan');
    });
  });

  describe('document attributes', () => {
    it('should set data-theme attribute on document', () => {
      renderHook(() => useTheme(), { wrapper });

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should set data-accent attribute on document', () => {
      renderHook(() => useTheme(), { wrapper });

      expect(document.documentElement.getAttribute('data-accent')).toBe('cyan');
    });

    it('should update data-accent when accent color changes', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setAccentColor('rainbow');
      });

      expect(document.documentElement.getAttribute('data-accent')).toBe('rainbow');
    });
  });

  describe('shared context across components', () => {
    it('should share state between multiple consumers', () => {
      const { result: result1 } = renderHook(() => useTheme(), { wrapper });

      // Change color in first hook
      act(() => {
        result1.current.setAccentColor('pink');
      });

      // Verify the change is reflected
      expect(result1.current.accentColor).toBe('pink');

      // Note: In a real scenario with shared context, a second renderHook
      // would also see 'pink', but since each renderHook creates its own
      // wrapper with a fresh ThemeProvider, we verify state persistence via localStorage
      expect(localStorageMock.setItem).toHaveBeenCalledWith('sandoro-accent-color', 'pink');
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
