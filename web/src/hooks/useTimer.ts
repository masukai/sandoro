import { useState, useEffect, useCallback, useRef } from 'react';
import type { FocusMode } from './useSupabaseSettings';

export type TimerState = 'work' | 'shortBreak' | 'longBreak';

interface UseTimerOptions {
  workDuration?: number; // in seconds
  shortBreakDuration?: number;
  longBreakDuration?: number;
  sessionsUntilLongBreak?: number;
  autoStart?: boolean;
  focusMode?: FocusMode;
  onSessionStart?: (state: TimerState) => void;
  onSessionComplete?: (state: TimerState, durationSeconds: number) => void;
  onSessionCancel?: () => void;
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
  const focusMode = options.focusMode ?? 'classic';
  const onSessionStart = options.onSessionStart;
  const onSessionComplete = options.onSessionComplete;
  const onSessionCancel = options.onSessionCancel;

  const isFlowtime = focusMode === 'flowtime';

  const [state, setState] = useState<TimerState>('work');
  // For flowtime: elapsed time (counts up from 0); for classic: remaining time (counts down)
  const [elapsedTime, setElapsedTime] = useState(0);
  const [remainingTime, setRemainingTime] = useState(workDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(1);
  // For flowtime: calculated break duration based on work time
  const [flowtimeBreakDuration, setFlowtimeBreakDuration] = useState(0);

  const intervalRef = useRef<number | null>(null);
  // Track if this is an automatic transition (vs settings change)
  const isAutoTransition = useRef(false);
  // Track if session recording has started
  const sessionStartedRef = useRef(false);

  // Refs for callbacks to avoid stale closures
  const onSessionStartRef = useRef(onSessionStart);
  const onSessionCompleteRef = useRef(onSessionComplete);
  const onSessionCancelRef = useRef(onSessionCancel);

  useEffect(() => {
    onSessionStartRef.current = onSessionStart;
    onSessionCompleteRef.current = onSessionComplete;
    onSessionCancelRef.current = onSessionCancel;
  }, [onSessionStart, onSessionComplete, onSessionCancel]);

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

    // Call session complete callback if session was started
    if (sessionStartedRef.current) {
      const duration =
        currentState === 'work'
          ? workDuration
          : currentState === 'shortBreak'
            ? shortBreakDuration
            : longBreakDuration;
      onSessionCompleteRef.current?.(currentState, duration);
      sessionStartedRef.current = false;
    }

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
  }, [sessionsUntilLongBreak, autoStart, workDuration, shortBreakDuration, longBreakDuration]);

  // Keep ref updated
  useEffect(() => {
    transitionRef.current = transitionToNextState;
  }, [transitionToNextState]);

  // Update remaining time when state changes or durations change
  useEffect(() => {
    if (isFlowtime && state === 'work') {
      // Flowtime work: start at 0 and count up
      setElapsedTime(0);
      setRemainingTime(0); // Not used in flowtime work, but keep in sync
    } else if (isFlowtime && state !== 'work') {
      // Flowtime break: use calculated break duration (minimum 60 seconds)
      // Use Math.max to handle the case where flowtimeBreakDuration hasn't been set yet
      setRemainingTime(Math.max(60, flowtimeBreakDuration));
    } else {
      // Classic mode: use fixed durations
      setRemainingTime(getDurationForState(state));
    }
    // Only stop timer if this is NOT an auto-transition with autoStart enabled
    if (!(isAutoTransition.current && autoStart)) {
      setIsRunning(false);
    }
    isAutoTransition.current = false;
  }, [state, getDurationForState, autoStart, isFlowtime, flowtimeBreakDuration]);

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
      if (isFlowtime && stateRef.current === 'work') {
        // Flowtime work: count up (no auto-transition)
        setElapsedTime((time) => time + 1);
      } else {
        // Classic mode or flowtime break: count down
        setRemainingTime((time) => {
          if (time <= 1) {
            transitionRef.current();
            return time;
          }
          return time - 1;
        });
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isFlowtime]);

  const togglePause = useCallback(() => {
    setIsRunning((r) => {
      // If starting timer and session not yet started, call onSessionStart
      if (!r && !sessionStartedRef.current) {
        sessionStartedRef.current = true;
        onSessionStartRef.current?.(stateRef.current);
      }
      return !r;
    });
  }, []);

  const reset = useCallback(() => {
    // Cancel current session if started
    if (sessionStartedRef.current) {
      onSessionCancelRef.current?.();
      sessionStartedRef.current = false;
    }
    setIsRunning(false);
    if (isFlowtime && state === 'work') {
      // Flowtime work: reset elapsed time to 0
      setElapsedTime(0);
    } else if (isFlowtime && state !== 'work') {
      // Flowtime break: use the calculated break duration (minimum 60 seconds)
      setRemainingTime(Math.max(60, flowtimeBreakDuration));
    } else {
      // Classic mode: use fixed durations
      setRemainingTime(getDurationForState(state));
    }
  }, [state, getDurationForState, isFlowtime, flowtimeBreakDuration]);

  // End work session (for flowtime mode) - transitions to break with calculated duration
  const endWork = useCallback(() => {
    if (!isFlowtime || state !== 'work') return;

    const workTimeSeconds = elapsedTime;
    // Calculate break duration: work time / 5 (minimum 1 minute)
    const calculatedBreak = Math.max(60, Math.floor(workTimeSeconds / 5));
    setFlowtimeBreakDuration(calculatedBreak);

    // Complete the work session
    if (sessionStartedRef.current) {
      onSessionCompleteRef.current?.('work', workTimeSeconds);
      sessionStartedRef.current = false;
    }

    // Transition to short break (flowtime doesn't use long breaks)
    isAutoTransition.current = autoStart;
    if (!autoStart) {
      setIsRunning(false);
    }
    setState('shortBreak');
  }, [isFlowtime, state, elapsedTime, autoStart]);

  const skip = useCallback(() => {
    // In flowtime work mode, use endWork instead
    if (isFlowtime && state === 'work') {
      endWork();
    } else {
      transitionToNextState();
    }
  }, [transitionToNextState, isFlowtime, state, endWork]);

  const fullReset = useCallback(() => {
    // Cancel current session if started
    if (sessionStartedRef.current) {
      onSessionCancelRef.current?.();
      sessionStartedRef.current = false;
    }
    setIsRunning(false);
    setState('work');
    setElapsedTime(0);
    setRemainingTime(workDuration);
    setSessionCount(1);
    setFlowtimeBreakDuration(0);
  }, [workDuration]);

  // Add time to current timer (for snooze functionality)
  const addTime = useCallback((seconds: number) => {
    setRemainingTime((time) => time + seconds);
  }, []);

  // Display time: for flowtime work, show elapsed time; otherwise show remaining time
  const displayTime = isFlowtime && state === 'work' ? elapsedTime : remainingTime;
  // Format: MM:SS for <100 min, or M...M:SS for longer sessions (e.g., 100:00, 150:30)
  const minutes = Math.floor(displayTime / 60);
  const seconds = displayTime % 60;
  const formattedTime = minutes >= 100
    ? `${minutes}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Progress: for flowtime work, no progress bar (infinite); otherwise calculate normally
  const totalDuration = isFlowtime && state === 'work' ? 1 : getDurationForState(state);
  const progress = isFlowtime && state === 'work'
    ? 0 // No progress in flowtime work mode
    : ((totalDuration - remainingTime) / totalDuration) * 100;

  return {
    state,
    remainingTime,
    elapsedTime,
    formattedTime,
    isRunning,
    progress,
    sessionCount,
    togglePause,
    reset,
    skip,
    fullReset,
    addTime,
    endWork,
    isFlowtime,
  };
}
