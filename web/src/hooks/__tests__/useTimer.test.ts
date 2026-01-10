import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimer } from '../useTimer';

describe('useTimer', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useTimer());

    expect(result.current.state).toBe('work');
    expect(result.current.remainingTime).toBe(25 * 60); // 25 minutes
    expect(result.current.isRunning).toBe(false);
    expect(result.current.sessionCount).toBe(1);
    expect(result.current.formattedTime).toBe('25:00');
    expect(result.current.progress).toBe(0);
  });

  it('should initialize with custom options', () => {
    const { result } = renderHook(() =>
      useTimer({
        workDuration: 30 * 60,
        shortBreakDuration: 10 * 60,
        longBreakDuration: 20 * 60,
        sessionsUntilLongBreak: 2,
      })
    );

    expect(result.current.remainingTime).toBe(30 * 60);
    expect(result.current.formattedTime).toBe('30:00');
  });

  it('should toggle pause/resume', () => {
    const { result } = renderHook(() => useTimer());

    expect(result.current.isRunning).toBe(false);

    act(() => {
      result.current.togglePause();
    });

    expect(result.current.isRunning).toBe(true);

    act(() => {
      result.current.togglePause();
    });

    expect(result.current.isRunning).toBe(false);
  });

  it('should reset timer to initial duration', () => {
    const { result } = renderHook(() => useTimer({ workDuration: 60 }));

    // Start timer and let it run briefly is not tested here
    // Just verify reset returns to initial state
    act(() => {
      result.current.togglePause(); // Start
    });

    act(() => {
      result.current.reset(); // Reset
    });

    expect(result.current.remainingTime).toBe(60);
    expect(result.current.isRunning).toBe(false);
  });

  it('should skip to next state', () => {
    const { result } = renderHook(() => useTimer());

    expect(result.current.state).toBe('work');

    act(() => {
      result.current.skip();
    });

    expect(result.current.state).toBe('shortBreak');
    expect(result.current.isRunning).toBe(false);
  });

  it('should format time correctly', () => {
    const { result } = renderHook(() => useTimer({ workDuration: 3661 })); // 1:01:01

    // Note: Current implementation only shows minutes:seconds
    expect(result.current.formattedTime).toBe('61:01');
  });

  it('should format single digit minutes and seconds with padding', () => {
    const { result } = renderHook(() => useTimer({ workDuration: 65 })); // 1:05

    expect(result.current.formattedTime).toBe('01:05');
  });

  it('should increment session count after work period', () => {
    const { result } = renderHook(() => useTimer());

    expect(result.current.sessionCount).toBe(1);

    act(() => {
      result.current.skip(); // work -> shortBreak
    });

    expect(result.current.sessionCount).toBe(2);

    act(() => {
      result.current.skip(); // shortBreak -> work
    });

    expect(result.current.sessionCount).toBe(2);
  });

  it('should transition to long break after configured sessions', () => {
    const { result } = renderHook(() =>
      useTimer({ sessionsUntilLongBreak: 2 })
    );

    expect(result.current.state).toBe('work');

    // First work session -> short break
    act(() => {
      result.current.skip();
    });
    expect(result.current.state).toBe('shortBreak');

    // Short break -> work
    act(() => {
      result.current.skip();
    });
    expect(result.current.state).toBe('work');

    // Second work session -> long break (because sessionsUntilLongBreak = 2)
    act(() => {
      result.current.skip();
    });
    expect(result.current.state).toBe('longBreak');
  });

  it('should reset session count after long break', () => {
    const { result } = renderHook(() =>
      useTimer({ sessionsUntilLongBreak: 1 })
    );

    // First session -> long break
    act(() => {
      result.current.skip();
    });
    expect(result.current.state).toBe('longBreak');
    expect(result.current.sessionCount).toBe(1); // Reset to 1

    // Long break -> work
    act(() => {
      result.current.skip();
    });
    expect(result.current.state).toBe('work');
    expect(result.current.sessionCount).toBe(1);
  });

  it('should calculate initial progress as 0', () => {
    const { result } = renderHook(() => useTimer({ workDuration: 100 }));

    expect(result.current.progress).toBe(0);
  });

  it('should update remaining time when state changes', () => {
    const { result } = renderHook(() =>
      useTimer({
        workDuration: 25 * 60,
        shortBreakDuration: 5 * 60,
      })
    );

    expect(result.current.remainingTime).toBe(25 * 60);

    act(() => {
      result.current.skip(); // work -> shortBreak
    });

    expect(result.current.remainingTime).toBe(5 * 60);
  });
});
