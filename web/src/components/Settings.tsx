import { useTheme, ThemeMode } from '../hooks/useTheme';
import { useSettings, IconType } from '../hooks/useSettings';

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

export function Settings() {
  const { mode, setMode } = useTheme();
  const { settings, setSettings, resetSettings } = useSettings();

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-bold">Settings</h2>

      {/* Theme Section */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--sandoro-secondary)' }}>Appearance</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm w-14" style={{ color: 'var(--sandoro-fg)' }}>Theme:</span>
          <div className="flex gap-1 rounded-lg p-1 bg-sandoro-secondary/20">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setMode(option.value)}
                className="px-3 py-1 text-sm rounded-md transition-colors"
                style={{
                  backgroundColor: mode === option.value ? 'var(--sandoro-primary)' : 'transparent',
                  color: mode === option.value ? 'var(--sandoro-bg)' : 'var(--sandoro-fg)',
                  fontWeight: mode === option.value ? 'bold' : 'normal',
                }}
                title={option.label}
              >
                <span className="mr-1">{option.icon}</span>
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm w-14" style={{ color: 'var(--sandoro-fg)' }}>Icon:</span>
          <div className="flex gap-1 rounded-lg p-1 bg-sandoro-secondary/20">
            {ICON_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setSettings({ icon: option.value })}
                className="px-3 py-1 text-sm rounded-md transition-colors"
                style={{
                  backgroundColor: settings.icon === option.value ? 'var(--sandoro-primary)' : 'transparent',
                  color: settings.icon === option.value ? 'var(--sandoro-bg)' : 'var(--sandoro-fg)',
                  fontWeight: settings.icon === option.value ? 'bold' : 'normal',
                }}
                title={option.label}
              >
                <span className="mr-1">{option.icon}</span>
                {option.label}
              </button>
            ))}
          </div>
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
