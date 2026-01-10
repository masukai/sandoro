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

  return {
    sessions,
    startSession,
    completeSession,
    cancelSession,
    getTodayStats,
    getWeekStats,
    getMonthStats,
    getDailyBreakdown,
  };
}
