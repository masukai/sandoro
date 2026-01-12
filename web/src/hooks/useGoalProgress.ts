import { useMemo } from 'react';
import { useSettings, GoalSettings } from './useSettings';
import { useSessionStorage } from './useSessionStorage';

export interface GoalProgress {
  daily: {
    sessions: { current: number; goal: number; percentage: number };
    minutes: { current: number; goal: number; percentage: number };
  };
  weekly: {
    sessions: { current: number; goal: number; percentage: number };
    minutes: { current: number; goal: number; percentage: number };
  };
}

export function useGoalProgress(): GoalProgress {
  const { settings } = useSettings();
  const { getTodayStats, getWeekStats } = useSessionStorage();

  return useMemo(() => {
    const todayStats = getTodayStats();
    const weekStats = getWeekStats();
    const { goals } = settings;

    const todayMinutes = Math.floor(todayStats.totalWorkSeconds / 60);
    const weekMinutes = Math.floor(weekStats.totalWorkSeconds / 60);

    const calcPercentage = (current: number, goal: number): number => {
      if (goal === 0) return 0;
      return Math.min(100, Math.round((current / goal) * 100));
    };

    return {
      daily: {
        sessions: {
          current: todayStats.sessionsCompleted,
          goal: goals.dailySessionsGoal,
          percentage: calcPercentage(todayStats.sessionsCompleted, goals.dailySessionsGoal),
        },
        minutes: {
          current: todayMinutes,
          goal: goals.dailyMinutesGoal,
          percentage: calcPercentage(todayMinutes, goals.dailyMinutesGoal),
        },
      },
      weekly: {
        sessions: {
          current: weekStats.sessionsCompleted,
          goal: goals.weeklySessionsGoal,
          percentage: calcPercentage(weekStats.sessionsCompleted, goals.weeklySessionsGoal),
        },
        minutes: {
          current: weekMinutes,
          goal: goals.weeklyMinutesGoal,
          percentage: calcPercentage(weekMinutes, goals.weeklyMinutesGoal),
        },
      },
    };
  }, [settings, getTodayStats, getWeekStats]);
}

// Check if any goals are set
export function hasGoalsEnabled(goals: GoalSettings): boolean {
  return (
    goals.dailySessionsGoal > 0 ||
    goals.dailyMinutesGoal > 0 ||
    goals.weeklySessionsGoal > 0 ||
    goals.weeklyMinutesGoal > 0
  );
}
