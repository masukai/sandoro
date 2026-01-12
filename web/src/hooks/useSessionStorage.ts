import { useState, useCallback, useEffect } from 'react';

export interface Session {
  id: string;
  startedAt: string; // ISO string
  endedAt: string | null;
  durationSeconds: number | null;
  type: 'work' | 'shortBreak' | 'longBreak';
  completed: boolean;
}

export interface DailyStats {
  date: string;
  totalWorkSeconds: number;
  sessionsCompleted: number;
}

export interface StreakInfo {
  current: number; // Current consecutive days
  longest: number; // Longest streak ever
}

const STORAGE_KEY = 'sandoro_sessions';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function loadSessions(): Session[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: Session[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function useSessionStorage() {
  const [sessions, setSessions] = useState<Session[]>([]);

  // Load sessions on mount
  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  const startSession = useCallback(
    (type: 'work' | 'shortBreak' | 'longBreak'): string => {
      const session: Session = {
        id: generateId(),
        startedAt: new Date().toISOString(),
        endedAt: null,
        durationSeconds: null,
        type,
        completed: false,
      };

      setSessions((prev) => {
        const updated = [...prev, session];
        saveSessions(updated);
        return updated;
      });

      return session.id;
    },
    []
  );

  const completeSession = useCallback(
    (sessionId: string, durationSeconds: number): void => {
      setSessions((prev) => {
        const updated = prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                endedAt: new Date().toISOString(),
                durationSeconds,
                completed: true,
              }
            : s
        );
        saveSessions(updated);
        return updated;
      });
    },
    []
  );

  const cancelSession = useCallback((sessionId: string): void => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);
      saveSessions(updated);
      return updated;
    });
  }, []);

  const getTodayStats = useCallback((): DailyStats => {
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = sessions.filter(
      (s) =>
        s.startedAt.startsWith(today) && s.type === 'work' && s.completed
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

  const getWeekStats = useCallback((): DailyStats => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekSessions = sessions.filter(
      (s) =>
        new Date(s.startedAt) >= weekAgo &&
        s.type === 'work' &&
        s.completed
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

  const getMonthStats = useCallback((): DailyStats => {
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const monthSessions = sessions.filter(
      (s) =>
        new Date(s.startedAt) >= monthAgo &&
        s.type === 'work' &&
        s.completed
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

  const getDailyBreakdown = useCallback(
    (days: number): DailyStats[] => {
      const now = new Date();
      const result: DailyStats[] = [];

      for (let i = 0; i < days; i++) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const daySessions = sessions.filter(
          (s) =>
            s.startedAt.startsWith(dateStr) &&
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

  // Get heatmap data for the past N weeks (includes all days, even with 0 activity)
  const getHeatmapData = useCallback(
    (weeks: number = 12): Map<string, DailyStats> => {
      const now = new Date();
      const result = new Map<string, DailyStats>();
      const days = weeks * 7;

      // Helper to format date as YYYY-MM-DD in local timezone
      const formatDateStr = (d: Date): string => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

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
          // Parse ISO string and format in local timezone
          const sessionDate = new Date(s.startedAt);
          const dateStr = formatDateStr(sessionDate);
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

  // Get streak information
  const getStreak = useCallback((): StreakInfo => {
    // Helper to format date as YYYY-MM-DD in local timezone
    const formatDateStr = (d: Date): string => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Get unique dates with completed work sessions
    const workDates = new Set<string>();
    sessions
      .filter((s) => s.type === 'work' && s.completed)
      .forEach((s) => {
        const sessionDate = new Date(s.startedAt);
        workDates.add(formatDateStr(sessionDate));
      });

    if (workDates.size === 0) {
      return { current: 0, longest: 0 };
    }

    // Sort dates in descending order
    const sortedDates = Array.from(workDates).sort().reverse();

    // Calculate current streak (from today backwards)
    const today = formatDateStr(new Date());
    let currentStreak = 0;
    const checkDate = new Date();

    // Check if today has activity, if not start from yesterday
    if (!workDates.has(today)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (workDates.has(formatDateStr(checkDate))) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 0; i < sortedDates.length - 1; i++) {
      const current = new Date(sortedDates[i]);
      const next = new Date(sortedDates[i + 1]);
      const diffDays = Math.round((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24));

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

  // Export sessions to JSON
  const exportToJSON = useCallback((): string => {
    return JSON.stringify(sessions, null, 2);
  }, [sessions]);

  // Export sessions to CSV
  const exportToCSV = useCallback((): string => {
    const headers = ['id', 'startedAt', 'endedAt', 'durationSeconds', 'type', 'completed'];
    const rows = sessions.map((s) => [
      s.id,
      s.startedAt,
      s.endedAt || '',
      s.durationSeconds?.toString() || '',
      s.type,
      s.completed.toString(),
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }, [sessions]);

  return {
    sessions,
    startSession,
    completeSession,
    cancelSession,
    getTodayStats,
    getWeekStats,
    getMonthStats,
    getDailyBreakdown,
    getHeatmapData,
    getStreak,
    exportToJSON,
    exportToCSV,
  };
}
