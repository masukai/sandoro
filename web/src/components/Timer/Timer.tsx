import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { useTimer } from '../../hooks/useTimer';
import { useSettings, IconType } from '../../hooks/useSettings';
import { useSessionStorage } from '../../hooks/useSessionStorage';
import { useNotification } from '../../hooks/useNotification';
import { useSound } from '../../hooks/useSound';
import { useTheme } from '../../hooks/useTheme';
import { useContextMessage, UserStats } from '../../hooks/useContextMessage';
import { useTags } from '../../hooks/useTags';
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
  const { accentColor } = useTheme();
  const isRainbow = accentColor === 'rainbow';
  const iconType = icon || settings.icon || 'hourglass';
  const { sessions, startSession, completeSession, cancelSession, getTodayStats, getStreak, getWeekStats, getDailyBreakdown } =
    useSessionStorage();
  const { tags } = useTags();
  const [selectedTagId, setSelectedTagId] = useState<string | undefined>(undefined);
  const { notifySessionComplete, permission, requestPermission } = useNotification();
  const { playSessionComplete } = useSound();

  // Request notification permission on first timer start if enabled but not granted
  const hasRequestedPermission = useRef(false);

  // Track current session ID
  const currentSessionIdRef = useRef<string | null>(null);

  const handleSessionStart = useCallback(
    (state: 'work' | 'shortBreak' | 'longBreak') => {
      // Only apply tag to work sessions
      const tagId = state === 'work' ? selectedTagId : undefined;
      currentSessionIdRef.current = startSession(state, tagId);
    },
    [startSession, selectedTagId]
  );

  const handleSessionComplete = useCallback(
    (state: 'work' | 'shortBreak' | 'longBreak', durationSeconds: number) => {
      if (currentSessionIdRef.current) {
        completeSession(currentSessionIdRef.current, durationSeconds);
        currentSessionIdRef.current = null;
      }

      // Play sound and show notification
      playSessionComplete(state);
      notifySessionComplete(state);
    },
    [completeSession, playSessionComplete, notifySessionComplete]
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

  // Rotation tick for message variety (changes every 10 seconds)
  const [rotationTick, setRotationTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setRotationTick((prev) => prev + 1);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Calculate user stats for context messages
  const userStats: UserStats = useMemo(() => {
    const streak = getStreak();
    const weekStats = getWeekStats();
    const dailyBreakdown = getDailyBreakdown(2); // Get yesterday and today

    // Calculate yesterday's work seconds
    const today = new Date().toISOString().split('T')[0];
    const yesterdayStats = dailyBreakdown.find(d => d.date !== today);
    const yesterdaySeconds = yesterdayStats?.totalWorkSeconds || 0;

    // Weekly average (excluding today)
    const weekAvgSeconds = weekStats.totalWorkSeconds > 0
      ? Math.floor(weekStats.totalWorkSeconds / 7)
      : 0;

    // Total sessions ever
    const totalSessions = sessions.filter(s => s.type === 'work' && s.completed).length;

    return {
      todayWorkSeconds: todayStats.totalWorkSeconds,
      todaySessions: todayStats.sessionsCompleted,
      currentStreak: streak.current,
      longestStreak: streak.longest,
      weekAvgSeconds,
      yesterdaySeconds,
      totalSessions,
    };
  }, [sessions, todayStats, getStreak, getWeekStats, getDailyBreakdown]);

  // Get context-aware message
  const contextMessage = useContextMessage(state, isRunning, settings.language, rotationTick, userStats);

  // Handle start/pause with permission request
  const handleTogglePause = useCallback(() => {
    // Request notification permission on first start if notifications are enabled but permission not granted
    if (!isRunning && settings.notificationsEnabled && permission !== 'granted' && !hasRequestedPermission.current) {
      hasRequestedPermission.current = true;
      requestPermission(); // Fire and forget - don't block timer start
    }
    togglePause();
  }, [isRunning, settings.notificationsEnabled, permission, requestPermission, togglePause]);

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
    <div className="flex flex-col items-center gap-3 py-2">
      {/* ASCII Art Icon */}
      <div className="text-center">
        <AsciiIcon type={iconType} progress={progress} isBreak={state !== 'work'} isPaused={!isRunning} />
      </div>

      {/* Timer Display */}
      <div className="timer-display">{formattedTime}</div>

      {/* State Label */}
      <div className={`text-base font-bold ${isRunning ? stateColor : 'text-yellow-500'}`}>
        [ {stateLabel}{!isRunning ? ' - PAUSED' : ''} ]
      </div>

      {/* Tag Selection */}
      {tags.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-sandoro-secondary">Tag:</span>
          <select
            value={selectedTagId || ''}
            onChange={(e) => setSelectedTagId(e.target.value || undefined)}
            className="px-3 py-1 text-sm rounded border border-sandoro-secondary bg-transparent hover:bg-sandoro-secondary/20 transition-colors focus:outline-none focus:border-sandoro-primary"
            style={{ color: 'var(--sandoro-fg)' }}
          >
            <option value="" style={{ backgroundColor: 'var(--sandoro-bg)' }}>
              No tag
            </option>
            {tags.map((tag) => (
              <option
                key={tag.id}
                value={tag.id}
                style={{ backgroundColor: 'var(--sandoro-bg)' }}
              >
                {tag.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-1.5">
        <button
          onClick={handleTogglePause}
          className={`px-3 py-1 text-xs text-sandoro-bg rounded font-bold hover:opacity-80 transition-opacity ${
            isRainbow ? 'rainbow-gradient-bg' : 'bg-sandoro-primary'
          }`}
        >
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={reset}
          className="px-3 py-1 text-xs border border-sandoro-secondary rounded hover:bg-sandoro-secondary/20 transition-colors"
          title="Reset current timer"
        >
          Reset
        </button>
        <button
          onClick={fullReset}
          className="px-3 py-1 text-xs border border-red-500 text-red-500 rounded hover:bg-red-500/20 transition-colors"
          title="Reset timer and session count"
        >
          Full Reset
        </button>
        <button
          onClick={skip}
          className="px-3 py-1 text-xs border border-sandoro-secondary rounded hover:bg-sandoro-secondary/20 transition-colors"
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

      {/* Context Message */}
      <div className="text-sm italic" style={{ color: 'var(--sandoro-fg)', opacity: 0.7 }}>
        {contextMessage}
      </div>
    </div>
  );
}
