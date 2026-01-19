import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { Tables } from '../lib/database.types';

// Session type from Supabase
type SupabaseSession = Tables<'sessions'>;

export interface Session {
  id: string;
  startedAt: string; // ISO string (maps to completed_at - when the session was completed)
  endedAt: string | null; // Not used in new schema, kept for compatibility
  durationSeconds: number | null;
  type: 'work' | 'shortBreak' | 'longBreak';
  completed: boolean;
  tagId?: string; // Maps to 'tag' in Supabase
}

export interface DailyStats {
  date: string;
  totalWorkSeconds: number;
  sessionsCompleted: number;
}

export interface StreakInfo {
  current: number;
  longest: number;
}

// Convert Supabase session to local format
function toLocalSession(s: SupabaseSession): Session {
  return {
    id: s.id,
    startedAt: s.completed_at,
    endedAt: s.completed_at,
    durationSeconds: s.duration_seconds,
    type: s.session_type as 'work' | 'shortBreak' | 'longBreak',
    completed: true, // All Supabase sessions are completed
    tagId: s.tag || undefined,
  };
}

// Helper to format date as YYYY-MM-DD in local timezone
function formatDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Alias for backwards compatibility
export const useSessionStorage = useSupabaseSession;

export function useSupabaseSession() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch sessions from Supabase on mount and when user changes
  useEffect(() => {
    if (!user) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const fetchSessions = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch sessions:', error);
        setSessions([]);
      } else {
        setSessions((data || []).map(toLocalSession));
      }
      setLoading(false);
    };

    fetchSessions();
  }, [user]);

  // Start session - returns session ID (but doesn't save to Supabase yet)
  // We track the pending session locally until it's completed
  const [pendingSession, setPendingSession] = useState<{
    id: string;
    type: 'work' | 'shortBreak' | 'longBreak';
    tagId?: string;
    startTime: Date;
  } | null>(null);

  const startSession = useCallback(
    (type: 'work' | 'shortBreak' | 'longBreak', tagId?: string): string => {
      // If not logged in, return a dummy ID
      if (!user) {
        return `local-${Date.now()}`;
      }

      const id = crypto.randomUUID();
      setPendingSession({
        id,
        type,
        tagId,
        startTime: new Date(),
      });
      return id;
    },
    [user]
  );

  // Complete session - saves to Supabase
  const completeSession = useCallback(
    async (sessionId: string, durationSeconds: number): Promise<void> => {
      // If not logged in, do nothing
      if (!user) {
        setPendingSession(null);
        return;
      }

      if (!pendingSession || pendingSession.id !== sessionId) {
        console.warn('No pending session to complete');
        return;
      }

      const completedAt = new Date().toISOString();

      // Map session type for Supabase (shortBreak -> short_break, etc.)
      const sessionType = pendingSession.type === 'shortBreak'
        ? 'short_break'
        : pendingSession.type === 'longBreak'
        ? 'long_break'
        : 'work';

      const { data, error } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          session_type: sessionType,
          duration_seconds: durationSeconds,
          completed_at: completedAt,
          tag: pendingSession.tagId || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to save session:', error);
      } else if (data) {
        // Add to local state
        setSessions((prev) => [toLocalSession(data), ...prev]);
      }

      setPendingSession(null);
    },
    [user, pendingSession]
  );

  // Cancel session - just clear pending
  const cancelSession = useCallback((_sessionId: string): void => {
    setPendingSession(null);
  }, []);

  // Delete a session
  const deleteSession = useCallback(
    async (sessionId: string): Promise<void> => {
      if (!user) return;

      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to delete session:', error);
      } else {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      }
    },
    [user]
  );

  // Update session tag
  const updateSessionTag = useCallback(
    async (sessionId: string, tagId: string | undefined): Promise<void> => {
      if (!user) return;

      const { error } = await supabase
        .from('sessions')
        .update({ tag: tagId || null })
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to update session tag:', error);
      } else {
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, tagId } : s))
        );
      }
    },
    [user]
  );

  // Get today's stats
  const getTodayStats = useCallback((): DailyStats => {
    const today = formatDateStr(new Date());
    const todaySessions = sessions.filter(
      (s) =>
        formatDateStr(new Date(s.startedAt)) === today &&
        s.type === 'work' &&
        s.completed
    );

    return {
      date: today,
      totalWorkSeconds: todaySessions.reduce(
        (acc, s) => acc + (s.durationSeconds || 0),
        0
      ),
      sessionsCompleted: todaySessions.length,
    };
  }, [sessions]);

  // Get week stats
  const getWeekStats = useCallback((): DailyStats => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekSessions = sessions.filter(
      (s) =>
        new Date(s.startedAt) >= weekAgo && s.type === 'work' && s.completed
    );

    return {
      date: 'Last 7 days',
      totalWorkSeconds: weekSessions.reduce(
        (acc, s) => acc + (s.durationSeconds || 0),
        0
      ),
      sessionsCompleted: weekSessions.length,
    };
  }, [sessions]);

  // Get month stats
  const getMonthStats = useCallback((): DailyStats => {
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const monthSessions = sessions.filter(
      (s) =>
        new Date(s.startedAt) >= monthAgo && s.type === 'work' && s.completed
    );

    return {
      date: 'Last 30 days',
      totalWorkSeconds: monthSessions.reduce(
        (acc, s) => acc + (s.durationSeconds || 0),
        0
      ),
      sessionsCompleted: monthSessions.length,
    };
  }, [sessions]);

  // Get daily breakdown
  const getDailyBreakdown = useCallback(
    (days: number): DailyStats[] => {
      const now = new Date();
      const result: DailyStats[] = [];

      for (let i = 0; i < days; i++) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = formatDateStr(date);
        const daySessions = sessions.filter(
          (s) =>
            formatDateStr(new Date(s.startedAt)) === dateStr &&
            s.type === 'work' &&
            s.completed
        );

        if (daySessions.length > 0) {
          result.push({
            date: dateStr,
            totalWorkSeconds: daySessions.reduce(
              (acc, s) => acc + (s.durationSeconds || 0),
              0
            ),
            sessionsCompleted: daySessions.length,
          });
        }
      }

      return result;
    },
    [sessions]
  );

  // Get heatmap data
  const getHeatmapData = useCallback(
    (weeks: number = 12): Map<string, DailyStats> => {
      const now = new Date();
      const result = new Map<string, DailyStats>();
      const days = weeks * 7;

      // Initialize all days with 0
      for (let i = 0; i < days; i++) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = formatDateStr(date);
        result.set(dateStr, {
          date: dateStr,
          totalWorkSeconds: 0,
          sessionsCompleted: 0,
        });
      }

      // Fill in actual data
      sessions
        .filter((s) => s.type === 'work' && s.completed)
        .forEach((s) => {
          const dateStr = formatDateStr(new Date(s.startedAt));
          const existing = result.get(dateStr);
          if (existing) {
            existing.totalWorkSeconds += s.durationSeconds || 0;
            existing.sessionsCompleted += 1;
          }
        });

      return result;
    },
    [sessions]
  );

  // Get streak info
  const getStreak = useCallback((): StreakInfo => {
    const workDates = new Set<string>();
    sessions
      .filter((s) => s.type === 'work' && s.completed)
      .forEach((s) => {
        workDates.add(formatDateStr(new Date(s.startedAt)));
      });

    if (workDates.size === 0) {
      return { current: 0, longest: 0 };
    }

    const sortedDates = Array.from(workDates).sort().reverse();
    const today = formatDateStr(new Date());
    let currentStreak = 0;
    const checkDate = new Date();

    if (!workDates.has(today)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (workDates.has(formatDateStr(checkDate))) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 0; i < sortedDates.length - 1; i++) {
      const current = new Date(sortedDates[i]);
      const next = new Date(sortedDates[i + 1]);
      const diffDays = Math.round(
        (current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return { current: currentStreak, longest: longestStreak };
  }, [sessions]);

  // Export to JSON
  const exportToJSON = useCallback((): string => {
    return JSON.stringify(sessions, null, 2);
  }, [sessions]);

  // Export to CSV
  const exportToCSV = useCallback((): string => {
    const headers = [
      'id',
      'startedAt',
      'endedAt',
      'durationSeconds',
      'type',
      'completed',
      'tagId',
    ];
    const rows = sessions.map((s) => [
      s.id,
      s.startedAt,
      s.endedAt || '',
      s.durationSeconds?.toString() || '',
      s.type,
      s.completed.toString(),
      s.tagId || '',
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }, [sessions]);

  // Get stats by tag
  const getStatsByTag = useCallback(
    (
      days: number
    ): Map<string | undefined, { totalSeconds: number; sessionsCount: number }> => {
      const now = new Date();
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const result = new Map<
        string | undefined,
        { totalSeconds: number; sessionsCount: number }
      >();

      sessions
        .filter(
          (s) =>
            s.type === 'work' &&
            s.completed &&
            new Date(s.startedAt) >= cutoff
        )
        .forEach((s) => {
          const key = s.tagId;
          const existing = result.get(key) || { totalSeconds: 0, sessionsCount: 0 };
          existing.totalSeconds += s.durationSeconds || 0;
          existing.sessionsCount += 1;
          result.set(key, existing);
        });

      return result;
    },
    [sessions]
  );

  return {
    sessions,
    loading,
    startSession,
    completeSession,
    cancelSession,
    deleteSession,
    updateSessionTag,
    getTodayStats,
    getWeekStats,
    getMonthStats,
    getDailyBreakdown,
    getHeatmapData,
    getStreak,
    exportToJSON,
    exportToCSV,
    getStatsByTag,
  };
}
