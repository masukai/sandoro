import { useTheme, ThemeMode, ACCENT_COLORS } from '../hooks/useTheme';
import { useSettings, IconType } from '../hooks/useSettings';
import { useNotification } from '../hooks/useNotification';
import { useSound, SOUND_PATTERN_OPTIONS } from '../hooks/useSound';

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '○' },
  { value: 'dark', label: 'Dark', icon: '●' },
  { value: 'system', label: 'System', icon: '◐' },
];

const ICON_OPTIONS: { value: IconType; label: string; icon: string }[] = [
  { value: 'none', label: 'None', icon: '○' },
  { value: 'progress', label: 'Bar', icon: '▓' },
  { value: 'hourglass', label: 'Glass', icon: '⏳' },
  { value: 'tomato', label: 'Tomato', icon: '🍅' },
  { value: 'coffee', label: 'Coffee', icon: '☕' },
];

interface NumberInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}

function NumberInput({ label, value, min, max, step, unit, onChange }: NumberInputProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: 'var(--sandoro-fg)' }}>{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-8 h-8 rounded font-bold text-lg"
          style={{
            backgroundColor: 'var(--sandoro-secondary)',
            color: 'var(--sandoro-bg)',
          }}
        >
          -
        </button>
        <span
          className="w-20 text-center font-mono"
          style={{ color: 'var(--sandoro-fg)' }}
        >
          {value}{unit ? ` ${unit}` : ''}
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          className="w-8 h-8 rounded font-bold text-lg"
          style={{
            backgroundColor: 'var(--sandoro-secondary)',
            color: 'var(--sandoro-bg)',
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

interface ToggleButtonProps {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  extra?: React.ReactNode;
  isRainbow?: boolean;
}

function ToggleButton({ label, enabled, onToggle, extra, isRainbow = false }: ToggleButtonProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: 'var(--sandoro-fg)' }}>{label}</span>
      <div className="flex items-center gap-2">
        {extra}
        <button
          onClick={onToggle}
          className={`px-4 py-1 text-sm rounded-md transition-colors ${
            enabled && isRainbow ? 'rainbow-gradient-bg' : ''
          }`}
          style={{
            backgroundColor: enabled && !isRainbow ? 'var(--sandoro-primary)' : !enabled ? 'var(--sandoro-secondary)' : undefined,
            color: enabled && !isRainbow ? 'var(--sandoro-bg)' : !enabled ? 'var(--sandoro-fg)' : undefined,
            fontWeight: enabled ? 'bold' : 'normal',
          }}
        >
          {enabled ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
}

export function Settings() {
  const { mode, accentColor, setMode, setAccentColor } = useTheme();
  const isRainbow = accentColor === 'rainbow';
  const { settings, setSettings, resetSettings } = useSettings();
  const { permission, isSupported, requestPermission } = useNotification();
  const { testSound, testSoundWithPattern } = useSound();

  const handleNotificationToggle = async () => {
    if (!settings.notificationsEnabled) {
      // Turning on - request permission if needed
      if (permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          return; // Don't enable if permission denied
        }
      }
    }
    setSettings({ notificationsEnabled: !settings.notificationsEnabled });
  };

  const handleSoundToggle = () => {
    setSettings({ soundEnabled: !settings.soundEnabled });
  };

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-bold">Settings</h2>

      {/* Theme Section */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--sandoro-secondary)' }}>Appearance</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm w-14" style={{ color: 'var(--sandoro-fg)' }}>Mode:</span>
          <div className="flex gap-1 rounded-lg p-1 bg-sandoro-secondary/20">
            {THEME_OPTIONS.map((option) => {
              const isSelected = mode === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setMode(option.value)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    isSelected && isRainbow ? 'rainbow-gradient-bg' : ''
                  }`}
                  style={{
                    backgroundColor: isSelected && !isRainbow ? 'var(--sandoro-primary)' : !isSelected ? 'transparent' : undefined,
                    color: isSelected && !isRainbow ? 'var(--sandoro-bg)' : !isSelected ? 'var(--sandoro-fg)' : undefined,
                    fontWeight: isSelected ? 'bold' : 'normal',
                  }}
                  title={option.label}
                >
                  <span className="mr-1">{option.icon}</span>
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm w-14" style={{ color: 'var(--sandoro-fg)' }}>Accent:</span>
          <div className="flex gap-1 flex-wrap rounded-lg p-1 bg-sandoro-secondary/20">
            {ACCENT_COLORS.map((accent) => {
              const isSelected = accentColor === accent.value;
              const isRainbowSelected = isSelected && accent.value === 'rainbow';
              return (
                <button
                  key={accent.value}
                  onClick={() => setAccentColor(accent.value)}
                  className={`px-2 py-1 text-xs rounded-md transition-colors flex items-center gap-1 ${
                    isRainbowSelected ? 'rainbow-gradient-bg' : ''
                  }`}
                  style={{
                    backgroundColor: isSelected && !isRainbowSelected ? 'var(--sandoro-primary)' : !isSelected ? 'transparent' : undefined,
                    color: isSelected && !isRainbowSelected ? 'var(--sandoro-bg)' : !isSelected ? 'var(--sandoro-fg)' : undefined,
                    fontWeight: isSelected ? 'bold' : 'normal',
                  }}
                  title={accent.label}
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{
                      background: accent.color,
                    }}
                  />
                  {accent.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm w-14" style={{ color: 'var(--sandoro-fg)' }}>Icon:</span>
          <div className="flex gap-1 rounded-lg p-1 bg-sandoro-secondary/20">
            {ICON_OPTIONS.map((option) => {
              const isSelected = settings.icon === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setSettings({ icon: option.value })}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    isSelected && isRainbow ? 'rainbow-gradient-bg' : ''
                  }`}
                  style={{
                    backgroundColor: isSelected && !isRainbow ? 'var(--sandoro-primary)' : !isSelected ? 'transparent' : undefined,
                    color: isSelected && !isRainbow ? 'var(--sandoro-bg)' : !isSelected ? 'var(--sandoro-fg)' : undefined,
                    fontWeight: isSelected ? 'bold' : 'normal',
                  }}
                  title={option.label}
                >
                  <span className="mr-1">{option.icon}</span>
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Notifications & Sound Section */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-sandoro-secondary">Notifications & Sound</h3>
        <div className="flex flex-col gap-4 bg-sandoro-secondary/10 rounded-lg p-4">
          <ToggleButton
            label="Notifications"
            enabled={settings.notificationsEnabled && permission === 'granted'}
            onToggle={handleNotificationToggle}
            isRainbow={isRainbow}
            extra={
              !isSupported ? (
                <span className="text-xs text-sandoro-secondary">Not supported</span>
              ) : permission === 'denied' ? (
                <span className="text-xs text-sandoro-accent">Blocked in browser</span>
              ) : null
            }
          />
          <ToggleButton
            label="Sound"
            enabled={settings.soundEnabled}
            onToggle={handleSoundToggle}
            isRainbow={isRainbow}
            extra={
              settings.soundEnabled && (
                <button
                  onClick={testSound}
                  className="px-2 py-0.5 text-xs rounded border border-sandoro-secondary/50 hover:border-sandoro-primary transition-colors"
                  style={{ color: 'var(--sandoro-secondary)' }}
                >
                  Test
                </button>
              )
            }
          />
          {settings.soundEnabled && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--sandoro-fg)' }}>Volume</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={settings.soundVolume}
                    onChange={(e) => setSettings({ soundVolume: parseInt(e.target.value, 10) })}
                    className="w-24 accent-sandoro-primary"
                  />
                  <span className="w-10 text-sm font-mono text-sandoro-secondary">{settings.soundVolume}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--sandoro-fg)' }}>Sound Type</span>
                <div className="flex gap-1 flex-wrap rounded-lg p-1 bg-sandoro-secondary/20">
                  {SOUND_PATTERN_OPTIONS.map((option) => {
                    const isSelected = settings.soundPattern === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSettings({ soundPattern: option.value });
                          // Play test sound immediately with the new pattern
                          testSoundWithPattern(option.value);
                        }}
                        className={`px-2 py-1 text-xs rounded-md transition-colors ${
                          isSelected && isRainbow ? 'rainbow-gradient-bg' : ''
                        }`}
                        style={{
                          backgroundColor: isSelected && !isRainbow ? 'var(--sandoro-primary)' : !isSelected ? 'transparent' : undefined,
                          color: isSelected && !isRainbow ? 'var(--sandoro-bg)' : !isSelected ? 'var(--sandoro-fg)' : undefined,
                          fontWeight: isSelected ? 'bold' : 'normal',
                        }}
                        title={option.description}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Timer Section */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-sandoro-secondary">Timer</h3>
        <p className="text-xs text-sandoro-secondary/70">
          * Changing timer settings will reset the current session
        </p>
        <div className="flex flex-col gap-4 bg-sandoro-secondary/10 rounded-lg p-4">
          <NumberInput
            label="Work Duration"
            value={settings.workDuration}
            min={5}
            max={60}
            step={5}
            unit="min"
            onChange={(v) => setSettings({ workDuration: v })}
          />
          <NumberInput
            label="Short Break"
            value={settings.shortBreak}
            min={1}
            max={30}
            step={1}
            unit="min"
            onChange={(v) => setSettings({ shortBreak: v })}
          />
          <NumberInput
            label="Long Break"
            value={settings.longBreak}
            min={5}
            max={60}
            step={5}
            unit="min"
            onChange={(v) => setSettings({ longBreak: v })}
          />
          <NumberInput
            label="Sessions until long break"
            value={settings.sessionsUntilLongBreak}
            min={2}
            max={8}
            step={1}
            unit=""
            onChange={(v) => setSettings({ sessionsUntilLongBreak: v })}
          />
          <ToggleButton
            label="Auto Start"
            enabled={settings.autoStart}
            onToggle={() => setSettings({ autoStart: !settings.autoStart })}
            isRainbow={isRainbow}
          />
        </div>
      </div>

      {/* Goals Section */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-sandoro-secondary">Goals</h3>
        <p className="text-xs text-sandoro-secondary/70">
          * Set to 0 to disable a goal. Daily changes auto-update weekly (×7).
        </p>
        <div className="flex flex-col gap-4 bg-sandoro-secondary/10 rounded-lg p-4">
          <NumberInput
            label="Daily Sessions"
            value={settings.goals.dailySessionsGoal}
            min={0}
            max={20}
            step={1}
            unit=""
            onChange={(v) => setSettings({
              goals: {
                ...settings.goals,
                dailySessionsGoal: v,
                weeklySessionsGoal: v * 7, // Auto-calculate weekly
              }
            })}
          />
          <NumberInput
            label="Daily Minutes"
            value={settings.goals.dailyMinutesGoal}
            min={0}
            max={480}
            step={30}
            unit="min"
            onChange={(v) => setSettings({
              goals: {
                ...settings.goals,
                dailyMinutesGoal: v,
                weeklyMinutesGoal: v * 7, // Auto-calculate weekly
              }
            })}
          />
          <NumberInput
            label="Weekly Sessions"
            value={settings.goals.weeklySessionsGoal}
            min={0}
            max={140}
            step={1}
            unit=""
            onChange={(v) => setSettings({ goals: { ...settings.goals, weeklySessionsGoal: v } })}
          />
          <NumberInput
            label="Weekly Minutes"
            value={settings.goals.weeklyMinutesGoal}
            min={0}
            max={3360}
            step={30}
            unit="min"
            onChange={(v) => setSettings({ goals: { ...settings.goals, weeklyMinutesGoal: v } })}
          />
        </div>
      </div>

      {/* Reset Button */}
      <button
        onClick={resetSettings}
        className="self-start px-4 py-2 text-sm text-sandoro-secondary hover:text-sandoro-fg border border-sandoro-secondary/30 rounded-md hover:border-sandoro-secondary transition-colors"
      >
        Reset to defaults
      </button>
    </div>
  );
}
