import { describe, it, expect } from 'vitest';

// Test the percentage change calculation logic
describe('useComparison percentage calculation', () => {
  function calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return Math.round(((current - previous) / previous) * 100);
  }

  it('should return 0 when both values are 0', () => {
    expect(calculatePercentageChange(0, 0)).toBe(0);
  });

  it('should return 100 when previous is 0 and current is positive', () => {
    expect(calculatePercentageChange(10, 0)).toBe(100);
  });

  it('should calculate positive percentage change correctly', () => {
    expect(calculatePercentageChange(150, 100)).toBe(50);
  });

  it('should calculate negative percentage change correctly', () => {
    expect(calculatePercentageChange(50, 100)).toBe(-50);
  });

  it('should return 0 when current equals previous', () => {
    expect(calculatePercentageChange(100, 100)).toBe(0);
  });

  it('should return -100 when current is 0 and previous is positive', () => {
    expect(calculatePercentageChange(0, 100)).toBe(-100);
  });

  it('should round to nearest integer', () => {
    expect(calculatePercentageChange(133, 100)).toBe(33);
    expect(calculatePercentageChange(166, 100)).toBe(66);
  });
});

// Test the period stats calculation logic
describe('PeriodStats calculation', () => {
  interface MockSession {
    durationSeconds: number | null;
    startedAt: string;
  }

  function calculatePeriodStats(
    sessions: MockSession[],
    startDate: Date,
    endDate: Date
  ) {
    const filteredSessions = sessions.filter((s) => {
      const sessionDate = new Date(s.startedAt);
      return sessionDate >= startDate && sessionDate < endDate;
    });

    const totalWorkSeconds = filteredSessions.reduce(
      (acc, s) => acc + (s.durationSeconds || 0),
      0
    );
    const sessionsCompleted = filteredSessions.length;
    const averageSessionDuration =
      sessionsCompleted > 0 ? totalWorkSeconds / sessionsCompleted : 0;

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

  it('should return zeros for empty sessions', () => {
    const stats = calculatePeriodStats(
      [],
      new Date('2025-01-01'),
      new Date('2025-01-07')
    );
    expect(stats.totalWorkSeconds).toBe(0);
    expect(stats.sessionsCompleted).toBe(0);
    expect(stats.averageSessionDuration).toBe(0);
    expect(stats.activeDays).toBe(0);
  });

  it('should filter sessions by date range', () => {
    const sessions: MockSession[] = [
      { durationSeconds: 1500, startedAt: '2025-01-01T10:00:00Z' },
      { durationSeconds: 1500, startedAt: '2025-01-03T10:00:00Z' },
      { durationSeconds: 1500, startedAt: '2025-01-10T10:00:00Z' }, // Outside range
    ];

    const stats = calculatePeriodStats(
      sessions,
      new Date('2025-01-01'),
      new Date('2025-01-07')
    );

    expect(stats.sessionsCompleted).toBe(2);
    expect(stats.totalWorkSeconds).toBe(3000);
  });

  it('should count unique active days', () => {
    const sessions: MockSession[] = [
      { durationSeconds: 1500, startedAt: '2025-01-01T09:00:00Z' },
      { durationSeconds: 1500, startedAt: '2025-01-01T14:00:00Z' }, // Same day
      { durationSeconds: 1500, startedAt: '2025-01-02T10:00:00Z' },
    ];

    const stats = calculatePeriodStats(
      sessions,
      new Date('2025-01-01'),
      new Date('2025-01-07')
    );

    expect(stats.activeDays).toBe(2); // Only 2 unique days
  });

  it('should calculate average session duration', () => {
    const sessions: MockSession[] = [
      { durationSeconds: 1500, startedAt: '2025-01-01T10:00:00Z' },
      { durationSeconds: 1800, startedAt: '2025-01-02T10:00:00Z' },
      { durationSeconds: 1200, startedAt: '2025-01-03T10:00:00Z' },
    ];

    const stats = calculatePeriodStats(
      sessions,
      new Date('2025-01-01'),
      new Date('2025-01-07')
    );

    expect(stats.averageSessionDuration).toBe(1500); // (1500 + 1800 + 1200) / 3
  });

  it('should handle null duration seconds', () => {
    const sessions: MockSession[] = [
      { durationSeconds: 1500, startedAt: '2025-01-01T10:00:00Z' },
      { durationSeconds: null, startedAt: '2025-01-02T10:00:00Z' },
    ];

    const stats = calculatePeriodStats(
      sessions,
      new Date('2025-01-01'),
      new Date('2025-01-07')
    );

    expect(stats.totalWorkSeconds).toBe(1500);
    expect(stats.sessionsCompleted).toBe(2);
  });
});
