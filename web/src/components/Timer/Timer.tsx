import { useTimer } from '../../hooks/useTimer';
import { useSettings, IconType } from '../../hooks/useSettings';
import { AsciiIcon } from './AsciiIcon';

interface TimerProps {
  workDuration?: number;
  shortBreakDuration?: number;
  longBreakDuration?: number;
  sessionsUntilLongBreak?: number;
  icon?: IconType;
}

export function Timer({
  workDuration,
  shortBreakDuration,
  longBreakDuration,
  sessionsUntilLongBreak = 4,
  icon,
}: TimerProps) {
  const { settings } = useSettings();
  const iconType = icon || settings.icon || 'hourglass';
  const { state, formattedTime, isRunning, progress, sessionCount, togglePause, reset, skip } =
    useTimer({
      workDuration,
      shortBreakDuration,
      longBreakDuration,
      sessionsUntilLongBreak,
    });

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
        >
          Reset
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
        Session: {sessionCount}/{sessionsUntilLongBreak} | Today: 0h 0m
      </div>
    </div>
  );
}
