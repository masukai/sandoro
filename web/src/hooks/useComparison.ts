import { useMemo } from 'react';
import { useSessionStorage } from './useSupabaseSession';

export interface PeriodStats {
  totalWorkSeconds: number;
  sessionsCompleted: number;
  averageSessionDuration: number; // in seconds
  activeDays: number;
}

export interface ComparisonData {
  current: PeriodStats;
  previous: PeriodStats;
  change: {
    totalWorkSeconds: number; // percentage change
    sessionsCompleted: number;
    averageSessionDuration: number;
    activeDays: number;
  };
}

function calculatePeriodStats(sessions: { durationSeconds: number | null; startedAt: string }[], startDate: Date, endDate: Date): PeriodStats {
  const filteredSessions = sessions.filter((s) => {
    const sessionDate = new Date(s.startedAt);
    return sessionDate >= startDate && sessionDate < endDate;
  });

  const totalWorkSeconds = filteredSessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  const sessionsCompleted = filteredSessions.length;
  const averageSessionDuration = sessionsCompleted > 0 ? totalWorkSeconds / sessionsCompleted : 0;

  // Count unique active days
  const activeDaysSet = new Set<string>();
  filteredSessions.forEach((s) => {
    const dateStr = new Date(s.startedAt).toISOString().split('T')[0];
    activeDaysSet.add(dateStr);
  });

  return {
    totalWorkSeconds,
    sessionsCompleted,
    averageSessionDuration,
    activeDays: activeDaysSet.size,
  };
}

function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

export function useComparison() {
  const { sessions } = useSessionStorage();

  const workSessions = useMemo(
    () => sessions.filter((s) => s.type === 'work' && s.completed),
    [sessions]
  );

  // Week comparison: This week vs Last week
  const weekComparison = useMemo((): ComparisonData => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = today.getDay();

    // Start of this week (Sunday)
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - dayOfWeek);

    // Start of last week
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);

    // End of this week (for current, use now)
    const thisWeekEnd = new Date(now.getTime() + 1); // Include current moment

    // End of last week (same day of week as now, but last week)
    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setDate(lastWeekStart.getDate() + dayOfWeek);
    lastWeekEnd.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    const current = calculatePeriodStats(workSessions, thisWeekStart, thisWeekEnd);
    const previous = calculatePeriodStats(workSessions, lastWeekStart, lastWeekEnd);

    return {
      current,
      previous,
      change: {
        totalWorkSeconds: calculatePercentageChange(current.totalWorkSeconds, previous.totalWorkSeconds),
        sessionsCompleted: calculatePercentageChange(current.sessionsCompleted, previous.sessionsCompleted),
        averageSessionDuration: calculatePercentageChange(current.averageSessionDuration, previous.averageSessionDuration),
        activeDays: calculatePercentageChange(current.activeDays, previous.activeDays),
      },
    };
  }, [workSessions]);

  // Month comparison: This month vs Last month
  const monthComparison = useMemo((): ComparisonData => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Start of this month
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Start of last month
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    // End of this month (for current, use now)
    const thisMonthEnd = new Date(now.getTime() + 1);

    // End of last month (same day of month as now, or end of month if current day > days in last month)
    const lastMonthEnd = new Date(lastMonthStart);
    const currentDayOfMonth = today.getDate();
    const daysInLastMonth = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    lastMonthEnd.setDate(Math.min(currentDayOfMonth, daysInLastMonth));
    lastMonthEnd.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    const current = calculatePeriodStats(workSessions, thisMonthStart, thisMonthEnd);
    const previous = calculatePeriodStats(workSessions, lastMonthStart, lastMonthEnd);

    return {
      current,
      previous,
      change: {
        totalWorkSeconds: calculatePercentageChange(current.totalWorkSeconds, previous.totalWorkSeconds),
        sessionsCompleted: calculatePercentageChange(current.sessionsCompleted, previous.sessionsCompleted),
        averageSessionDuration: calculatePercentageChange(current.averageSessionDuration, previous.averageSessionDuration),
        activeDays: calculatePercentageChange(current.activeDays, previous.activeDays),
      },
    };
  }, [workSessions]);

  return {
    weekComparison,
    monthComparison,
  };
}
