import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSupabaseSession, useSessionStorage } from '../useSupabaseSession';

// Mock useAuth
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
};

let mockAuthUser: typeof mockUser | null = null;

vi.mock('../useAuth', () => ({
  useAuth: () => ({
    user: mockAuthUser,
  }),
}));

// Mock Supabase
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'sessions') {
        return {
          select: () => ({
            eq: () => ({
              order: () => mockSelect(),
            }),
          }),
          insert: (data: unknown) => ({
            select: () => ({
              single: () => mockInsert(data),
            }),
          }),
          update: (data: unknown) => ({
            eq: () => ({
              eq: () => mockUpdate(data),
            }),
          }),
          delete: () => ({
            eq: () => ({
              eq: () => mockDelete(),
            }),
          }),
        };
      }
      return {};
    },
  },
}));

// Mock crypto.randomUUID
const mockUUID = 'test-uuid-123';
vi.stubGlobal('crypto', {
  randomUUID: () => mockUUID,
});

describe('useSupabaseSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = null;
    mockSelect.mockResolvedValue({ data: [], error: null });
    mockInsert.mockResolvedValue({ data: null, error: null });
    mockUpdate.mockResolvedValue({ error: null });
    mockDelete.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should return empty sessions when not authenticated', async () => {
      mockAuthUser = null;

      const { result } = renderHook(() => useSupabaseSession());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.sessions).toEqual([]);
    });

    it('should fetch sessions when authenticated', async () => {
      mockAuthUser = mockUser;
      const mockSessions = [
        {
          id: 'session-1',
          user_id: mockUser.id,
          session_type: 'work',
          duration_seconds: 1500,
          completed_at: '2025-01-19T10:00:00Z',
          tag: 'work-tag',
        },
        {
          id: 'session-2',
          user_id: mockUser.id,
          session_type: 'short_break',
          duration_seconds: 300,
          completed_at: '2025-01-19T10:30:00Z',
          tag: null,
        },
      ];
      mockSelect.mockResolvedValue({ data: mockSessions, error: null });

      const { result } = renderHook(() => useSupabaseSession());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.sessions).toHaveLength(2);
      expect(result.current.sessions[0].id).toBe('session-1');
      expect(result.current.sessions[0].type).toBe('work');
      expect(result.current.sessions[0].durationSeconds).toBe(1500);
    });

    it('should handle fetch error gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockAuthUser = mockUser;
      mockSelect.mockResolvedValue({ data: null, error: new Error('Fetch failed') });

      const { result } = renderHook(() => useSupabaseSession());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.sessions).toEqual([]);
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('startSession', () => {
    it('should return a local ID when not authenticated', async () => {
      mockAuthUser = null;

      const { result } = renderHook(() => useSupabaseSession());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let sessionId: string = '';
      act(() => {
        sessionId = result.current.startSession('work');
      });

      expect(sessionId).toMatch(/^local-\d+$/);
    });

    it('should return a UUID when authenticated', async () => {
      mockAuthUser = mockUser;

      const { result } = renderHook(() => useSupabaseSession());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let sessionId: string = '';
      act(() => {
        sessionId = result.current.startSession('work', 'my-tag');
      });

      expect(sessionId).toBe(mockUUID);
    });
  });

  describe('completeSession', () => {
    it('should do nothing when not authenticated', async () => {
      mockAuthUser = null;

      const { result } = renderHook(() => useSupabaseSession());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.completeSession('any-id', 1500);
      });

      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('should save session to Supabase when authenticated', async () => {
      mockAuthUser = mockUser;
      const savedSession = {
        id: 'saved-session-id',
        user_id: mockUser.id,
        session_type: 'work',
        duration_seconds: 1500,
        completed_at: expect.any(String),
        tag: 'my-tag',
      };
      mockInsert.mockResolvedValue({ data: savedSession, error: null });

      const { result } = renderHook(() => useSupabaseSession());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Start session first
      let sessionId: string = '';
      act(() => {
        sessionId = result.current.startSession('work', 'my-tag');
      });

      // Complete the session
      await act(async () => {
        await result.current.completeSession(sessionId, 1500);
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser.id,
          session_type: 'work',
          duration_seconds: 1500,
          tag: 'my-tag',
        })
      );
    });

    it('should map shortBreak to short_break', async () => {
      mockAuthUser = mockUser;
      mockInsert.mockResolvedValue({ data: { id: 'break-id' }, error: null });

      const { result } = renderHook(() => useSupabaseSession());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let sessionId: string = '';
      act(() => {
        sessionId = result.current.startSession('shortBreak');
      });

      await act(async () => {
        await result.current.completeSession(sessionId, 300);
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          session_type: 'short_break',
        })
      );
    });
  });

  describe('cancelSession', () => {
    it('should clear pending session', async () => {
      mockAuthUser = mockUser;

      const { result } = renderHook(() => useSupabaseSession());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let sessionId: string = '';
      act(() => {
        sessionId = result.current.startSession('work');
      });

      act(() => {
        result.current.cancelSession(sessionId);
      });

      // After cancel, completing should warn and not save
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await act(async () => {
        await result.current.completeSession(sessionId, 1500);
      });

      expect(mockInsert).not.toHaveBeenCalled();
      consoleWarn.mockRestore();
    });
  });

  describe('deleteSession', () => {
    it('should do nothing when not authenticated', async () => {
      mockAuthUser = null;

      const { result } = renderHook(() => useSupabaseSession());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteSession('any-id');
      });

      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('should delete session from Supabase and local state', async () => {
      mockAuthUser = mockUser;
      const mockSessions = [
        {
          id: 'session-to-delete',
          user_id: mockUser.id,
          session_type: 'work',
          duration_seconds: 1500,
          completed_at: '2025-01-19T10:00:00Z',
          tag: null,
        },
      ];
      mockSelect.mockResolvedValue({ data: mockSessions, error: null });

      const { result } = renderHook(() => useSupabaseSession());

      await waitFor(() => {
        expect(result.current.sessions).toHaveLength(1);
      });

      await act(async () => {
        await result.current.deleteSession('session-to-delete');
      });

      expect(mockDelete).toHaveBeenCalled();
      expect(result.current.sessions).toHaveLength(0);
    });
  });

  describe('updateSessionTag', () => {
    it('should update session tag in Supabase and local state', async () => {
      mockAuthUser = mockUser;
      const mockSessions = [
        {
          id: 'session-1',
          user_id: mockUser.id,
          session_type: 'work',
          duration_seconds: 1500,
          completed_at: '2025-01-19T10:00:00Z',
          tag: null,
        },
      ];
      mockSelect.mockResolvedValue({ data: mockSessions, error: null });

      const { result } = renderHook(() => useSupabaseSession());

      await waitFor(() => {
        expect(result.current.sessions).toHaveLength(1);
      });

      await act(async () => {
        await result.current.updateSessionTag('session-1', 'new-tag');
      });

      expect(mockUpdate).toHaveBeenCalledWith({ tag: 'new-tag' });
      expect(result.current.sessions[0].tagId).toBe('new-tag');
    });
  });

  describe('stats functions', () => {
    it('should calculate today stats correctly', async () => {
      mockAuthUser = mockUser;
      const today = new Date().toISOString();
      const mockSessions = [
        {
          id: 'session-1',
          user_id: mockUser.id,
          session_type: 'work',
          duration_seconds: 1500,
          completed_at: today,
          tag: null,
        },
        {
          id: 'session-2',
          user_id: mockUser.id,
          session_type: 'work',
          duration_seconds: 1800,
          completed_at: today,
          tag: null,
        },
      ];
      mockSelect.mockResolvedValue({ data: mockSessions, error: null });

      const { result } = renderHook(() => useSupabaseSession());

      await waitFor(() => {
        expect(result.current.sessions).toHaveLength(2);
      });

      const todayStats = result.current.getTodayStats();
      expect(todayStats.sessionsCompleted).toBe(2);
      expect(todayStats.totalWorkSeconds).toBe(3300);
    });

    it('should calculate streak correctly', async () => {
      mockAuthUser = mockUser;
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);

      const mockSessions = [
        {
          id: 's1',
          user_id: mockUser.id,
          session_type: 'work',
          duration_seconds: 1500,
          completed_at: today.toISOString(),
          tag: null,
        },
        {
          id: 's2',
          user_id: mockUser.id,
          session_type: 'work',
          duration_seconds: 1500,
          completed_at: yesterday.toISOString(),
          tag: null,
        },
        {
          id: 's3',
          user_id: mockUser.id,
          session_type: 'work',
          duration_seconds: 1500,
          completed_at: twoDaysAgo.toISOString(),
          tag: null,
        },
      ];
      mockSelect.mockResolvedValue({ data: mockSessions, error: null });

      const { result } = renderHook(() => useSupabaseSession());

      await waitFor(() => {
        expect(result.current.sessions).toHaveLength(3);
      });

      const streak = result.current.getStreak();
      expect(streak.current).toBe(3);
      expect(streak.longest).toBe(3);
    });

    it('should return zero streak when no sessions', async () => {
      mockAuthUser = mockUser;
      mockSelect.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useSupabaseSession());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const streak = result.current.getStreak();
      expect(streak.current).toBe(0);
      expect(streak.longest).toBe(0);
    });
  });

  describe('export functions', () => {
    it('should export to JSON', async () => {
      mockAuthUser = mockUser;
      const mockSessions = [
        {
          id: 'session-1',
          user_id: mockUser.id,
          session_type: 'work',
          duration_seconds: 1500,
          completed_at: '2025-01-19T10:00:00Z',
          tag: 'my-tag',
        },
      ];
      mockSelect.mockResolvedValue({ data: mockSessions, error: null });

      const { result } = renderHook(() => useSupabaseSession());

      await waitFor(() => {
        expect(result.current.sessions).toHaveLength(1);
      });

      const json = result.current.exportToJSON();
      const parsed = JSON.parse(json);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('session-1');
    });

    it('should export to CSV', async () => {
      mockAuthUser = mockUser;
      const mockSessions = [
        {
          id: 'session-1',
          user_id: mockUser.id,
          session_type: 'work',
          duration_seconds: 1500,
          completed_at: '2025-01-19T10:00:00Z',
          tag: 'my-tag',
        },
      ];
      mockSelect.mockResolvedValue({ data: mockSessions, error: null });

      const { result } = renderHook(() => useSupabaseSession());

      await waitFor(() => {
        expect(result.current.sessions).toHaveLength(1);
      });

      const csv = result.current.exportToCSV();

      expect(csv).toContain('id,startedAt,endedAt,durationSeconds,type,completed,tagId');
      expect(csv).toContain('session-1');
    });
  });
});

describe('useSessionStorage (alias)', () => {
  it('should be the same as useSupabaseSession', () => {
    expect(useSessionStorage).toBe(useSupabaseSession);
  });
});
