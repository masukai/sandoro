import { describe, it, expect } from 'vitest';
import { hasGoalsEnabled } from '../useGoalProgress';
import { GoalSettings } from '../useSettings';

describe('hasGoalsEnabled', () => {
  it('should return false when all goals are 0', () => {
    const goals: GoalSettings = {
      dailySessionsGoal: 0,
      dailyMinutesGoal: 0,
      weeklySessionsGoal: 0,
      weeklyMinutesGoal: 0,
    };
    expect(hasGoalsEnabled(goals)).toBe(false);
  });

  it('should return true when dailySessionsGoal is set', () => {
    const goals: GoalSettings = {
      dailySessionsGoal: 5,
      dailyMinutesGoal: 0,
      weeklySessionsGoal: 0,
      weeklyMinutesGoal: 0,
    };
    expect(hasGoalsEnabled(goals)).toBe(true);
  });

  it('should return true when dailyMinutesGoal is set', () => {
    const goals: GoalSettings = {
      dailySessionsGoal: 0,
      dailyMinutesGoal: 120,
      weeklySessionsGoal: 0,
      weeklyMinutesGoal: 0,
    };
    expect(hasGoalsEnabled(goals)).toBe(true);
  });

  it('should return true when weeklySessionsGoal is set', () => {
    const goals: GoalSettings = {
      dailySessionsGoal: 0,
      dailyMinutesGoal: 0,
      weeklySessionsGoal: 20,
      weeklyMinutesGoal: 0,
    };
    expect(hasGoalsEnabled(goals)).toBe(true);
  });

  it('should return true when weeklyMinutesGoal is set', () => {
    const goals: GoalSettings = {
      dailySessionsGoal: 0,
      dailyMinutesGoal: 0,
      weeklySessionsGoal: 0,
      weeklyMinutesGoal: 600,
    };
    expect(hasGoalsEnabled(goals)).toBe(true);
  });

  it('should return true when multiple goals are set', () => {
    const goals: GoalSettings = {
      dailySessionsGoal: 5,
      dailyMinutesGoal: 120,
      weeklySessionsGoal: 25,
      weeklyMinutesGoal: 600,
    };
    expect(hasGoalsEnabled(goals)).toBe(true);
  });
});
