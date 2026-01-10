import { useRef, useCallback } from 'react';
import { useTimer } from '../../hooks/useTimer';
import { useSettings, IconType } from '../../hooks/useSettings';
import { useSessionStorage } from '../../hooks/useSessionStorage';
import { AsciiIcon } from './AsciiIcon';

interface TimerProps {
  workDuration?: number;
  shortBreakDuration?: number;
  longBreakDuration?: number;
  sessionsUntilLongBreak?: number;
  icon?: IconType;
  autoStart?: boolean;
}

export function Timer({
  workDuration,
  shortBreakDuration,
  longBreakDuration,
  sessionsUntilLongBreak = 4,
  icon,
  autoStart = false,
}: TimerProps) {
  const { settings } = useSettings();
  const iconType = icon || settings.icon || 'hourglass';
  const { startSession, completeSession, cancelSession, getTodayStats } =
    useSessionStorage();

  // Track current session ID
  const currentSessionIdRef = useRef<string | null>(null);

  const handleSessionStart = useCallback(
    (state: 'work' | 'shortBreak' | 'longBreak') => {
      currentSessionIdRef.current = startSession(state);
    },
    [startSession]
  );

  const handleSessionComplete = useCallback(
    (_state: 'work' | 'shortBreak' | 'longBreak', durationSeconds: number) => {
      if (currentSessionIdRef.current) {
        completeSession(currentSessionIdRef.current, durationSeconds);
        currentSessionIdRef.current = null;
      }
    },
    [completeSession]
  );

  const handleSessionCancel = useCallback(() => {
    if (currentSessionIdRef.current) {
      cancelSession(currentSessionIdRef.current);
      currentSessionIdRef.current = null;
    }
  }, [cancelSession]);

  const { state, formattedTime, isRunning, progress, sessionCount, togglePause, reset, skip, fullReset } =
    useTimer({
      workDuration,
      shortBreakDuration,
      longBreakDuration,
      sessionsUntilLongBreak,
      autoStart,
      onSessionStart: handleSessionStart,
      onSessionComplete: handleSessionComplete,
      onSessionCancel: handleSessionCancel,
    });

  // Get today's stats for display
  const todayStats = getTodayStats();

  const stateLabel = {
    work: 'WORKING',
    shortBreak: 'SHORT BREAK',
    longBreak: 'LONG BREAK',
  }[state];

  const stateColor = {
    work: 'text-sandoro-work',
    shortBreak: 'text-sandoro-short-break',
    longBreak: 'text-sandoro-long-break',
  }[state];

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      {/* ASCII Art Icon */}
      <div className="ascii-art text-center">
        <AsciiIcon type={iconType} progress={progress} isBreak={state !== 'work'} isPaused={!isRunning} />
      </div>

      {/* Timer Display */}
      <div className="timer-display">{formattedTime}</div>

      {/* State Label */}
      <div className={`text-lg font-bold ${isRunning ? stateColor : 'text-yellow-500'}`}>
        [ {stateLabel}{!isRunning ? ' - PAUSED' : ''} ]
      </div>

      {/* Controls */}
      <div className="flex gap-4">
        <button
          onClick={togglePause}
          className="px-6 py-3 bg-sandoro-primary text-sandoro-bg rounded-lg font-bold hover:opacity-80 transition-opacity"
        >
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={reset}
          className="px-6 py-3 border border-sandoro-secondary rounded-lg hover:bg-sandoro-secondary/20 transition-colors"
          title="Reset current timer"
        >
          Reset
        </button>
        <button
          onClick={fullReset}
          className="px-6 py-3 border border-red-500 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
          title="Reset timer and session count"
        >
          Full Reset
        </button>
        <button
          onClick={skip}
          className="px-6 py-3 border border-sandoro-secondary rounded-lg hover:bg-sandoro-secondary/20 transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Session Info */}
      <div className="text-sm text-sandoro-secondary">
        Session: {sessionCount}/{sessionsUntilLongBreak} | Today:{' '}
        {todayStats.totalWorkSeconds >= 3600
          ? `${Math.floor(todayStats.totalWorkSeconds / 3600)}h ${Math.floor((todayStats.totalWorkSeconds % 3600) / 60)}m`
          : `${Math.floor(todayStats.totalWorkSeconds / 60)}m`}
      </div>
    </div>
  );
}
