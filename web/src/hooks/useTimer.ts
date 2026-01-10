import { useState, useEffect, useCallback, useRef } from 'react';

type TimerState = 'work' | 'shortBreak' | 'longBreak';

interface UseTimerOptions {
  workDuration?: number; // in seconds
  shortBreakDuration?: number;
  longBreakDuration?: number;
  sessionsUntilLongBreak?: number;
  autoStart?: boolean;
}

const DEFAULT_WORK_DURATION = 25 * 60;
const DEFAULT_SHORT_BREAK = 5 * 60;
const DEFAULT_LONG_BREAK = 15 * 60;
const DEFAULT_SESSIONS = 4;

export function useTimer(options: UseTimerOptions = {}) {
  const workDuration = options.workDuration ?? DEFAULT_WORK_DURATION;
  const shortBreakDuration = options.shortBreakDuration ?? DEFAULT_SHORT_BREAK;
  const longBreakDuration = options.longBreakDuration ?? DEFAULT_LONG_BREAK;
  const sessionsUntilLongBreak = options.sessionsUntilLongBreak ?? DEFAULT_SESSIONS;
  const autoStart = options.autoStart ?? false;

  const [state, setState] = useState<TimerState>('work');
  const [remainingTime, setRemainingTime] = useState(workDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(1);

  const intervalRef = useRef<number | null>(null);
  // Track if this is an automatic transition (vs settings change)
  const isAutoTransition = useRef(false);

  const getDurationForState = useCallback(
    (s: TimerState) => {
      switch (s) {
        case 'work':
          return workDuration;
        case 'shortBreak':
          return shortBreakDuration;
        case 'longBreak':
          return longBreakDuration;
      }
    },
    [workDuration, shortBreakDuration, longBreakDuration]
  );

  // Use ref to avoid recreating interval when transitionToNextState changes
  const transitionRef = useRef<() => void>(() => {});

  // Use ref for session count to avoid stale closure issues
  const sessionCountRef = useRef(sessionCount);
  useEffect(() => {
    sessionCountRef.current = sessionCount;
  }, [sessionCount]);

  // Use ref for state to read current value synchronously
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const transitionToNextState = useCallback(() => {
    // Mark this as an automatic transition for the state change effect
    isAutoTransition.current = autoStart;

    // Pause first (unless autoStart will keep it running)
    if (!autoStart) {
      setIsRunning(false);
    }

    // Read current values from refs to avoid stale closures
    const currentState = stateRef.current;
    const currentSessionCount = sessionCountRef.current;

    if (currentState === 'work') {
      // Check if we should go to long break after this session
      if (currentSessionCount >= sessionsUntilLongBreak) {
        setState('longBreak');
      } else {
        setState('shortBreak');
      }
    } else if (currentState === 'shortBreak') {
      // Increment session when returning to work from short break
      setSessionCount(currentSessionCount + 1);
      setState('work');
    } else {
      // Long break -> reset session count
      setSessionCount(1);
      setState('work');
    }
  }, [sessionsUntilLongBreak, autoStart]);

  // Keep ref updated
  useEffect(() => {
    transitionRef.current = transitionToNextState;
  }, [transitionToNextState]);

  // Update remaining time when state changes or durations change
  useEffect(() => {
    setRemainingTime(getDurationForState(state));
    // Only stop timer if this is NOT an auto-transition with autoStart enabled
    if (!(isAutoTransition.current && autoStart)) {
      setIsRunning(false);
    }
    isAutoTransition.current = false;
  }, [state, getDurationForState, autoStart]);

  // Timer tick
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setRemainingTime((time) => {
        if (time <= 1) {
          transitionRef.current();
          return time;
        }
        return time - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const togglePause = useCallback(() => {
    setIsRunning((r) => !r);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setRemainingTime(getDurationForState(state));
  }, [state, getDurationForState]);

  const skip = useCallback(() => {
    transitionToNextState();
  }, [transitionToNextState]);

  const fullReset = useCallback(() => {
    setIsRunning(false);
    setState('work');
    setRemainingTime(workDuration);
    setSessionCount(1);
  }, [workDuration]);

  const formattedTime = `${String(Math.floor(remainingTime / 60)).padStart(2, '0')}:${String(remainingTime % 60).padStart(2, '0')}`;

  const totalDuration = getDurationForState(state);
  const progress = ((totalDuration - remainingTime) / totalDuration) * 100;

  return {
    state,
    remainingTime,
    formattedTime,
    isRunning,
    progress,
    sessionCount,
    togglePause,
    reset,
    skip,
    fullReset,
  };
}
