import { useState, useEffect } from 'react';
import { useTheme, ThemeMode, ACCENT_COLORS } from '../hooks/useTheme';
import { useSettings, useTags, type IconType, type Language, type FocusMode } from '../hooks/useSupabaseSettings';
import { useNotification } from '../hooks/useNotification';
import { useSound, SOUND_PATTERN_OPTIONS } from '../hooks/useSound';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { LoginRequired } from './LoginRequired';

const LANGUAGE_OPTIONS: { value: Language; label: string; icon: string }[] = [
  { value: 'ja', label: '日本語', icon: '🇯🇵' },
  { value: 'en', label: 'English', icon: '🇺🇸' },
];

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

const FOCUS_MODE_OPTIONS: { value: FocusMode; label: string; icon: string; descriptionEn: string; descriptionJa: string }[] = [
  { value: 'classic', label: 'Classic', icon: '🍅', descriptionEn: 'Classic Pomodoro: fixed work/break intervals', descriptionJa: 'クラシック：固定の作業/休憩時間' },
  { value: 'flowtime', label: 'Flow', icon: '🌊', descriptionEn: 'Flowtime: work until you want to stop, break = work time / 5', descriptionJa: 'フロー：好きなだけ作業、休憩 = 作業時間 ÷ 5' },
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
      <span className="text-xs" style={{ color: 'var(--sandoro-fg)' }}>{label}</span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-6 h-6 rounded font-bold text-sm"
          style={{
            backgroundColor: 'var(--sandoro-secondary)',
            color: 'var(--sandoro-bg)',
          }}
        >
          -
        </button>
        <span
          className="w-16 text-center font-mono text-xs"
          style={{ color: 'var(--sandoro-fg)' }}
        >
          {value}{unit ? ` ${unit}` : ''}
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + step))}
          className="w-6 h-6 rounded font-bold text-sm"
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
      <span className="text-xs" style={{ color: 'var(--sandoro-fg)' }}>{label}</span>
      <div className="flex items-center gap-1.5">
        {extra}
        <button
          onClick={onToggle}
          className={`px-3 py-0.5 text-xs rounded transition-colors ${
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

// Preview component for unauthenticated users
function SettingsPreview() {
  return (
    <div className="flex flex-col gap-4 select-none">
      <h2 className="text-base font-bold">Settings</h2>

      {/* Appearance Section */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold" style={{ color: 'var(--sandoro-secondary)' }}>Appearance</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs w-12" style={{ color: 'var(--sandoro-fg)' }}>Mode:</span>
          <div className="flex gap-0.5 rounded-lg p-0.5 bg-sandoro-secondary/20">
            <div className="px-2 py-0.5 text-xs rounded bg-sandoro-primary/30">○ Light</div>
            <div className="px-2 py-0.5 text-xs rounded">● Dark</div>
            <div className="px-2 py-0.5 text-xs rounded">◐ System</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs w-12" style={{ color: 'var(--sandoro-fg)' }}>Accent:</span>
          <div className="flex gap-1 flex-wrap">
            {['#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#22d3ee'].map((color) => (
              <div
                key={color}
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Timer Section */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold text-sandoro-secondary">Timer</h3>
        <div className="flex flex-col gap-2 bg-sandoro-secondary/10 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--sandoro-fg)' }}>Work Duration</span>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded bg-sandoro-secondary/50 flex items-center justify-center text-xs">-</div>
              <span className="w-16 text-center font-mono text-xs">25 min</span>
              <div className="w-6 h-6 rounded bg-sandoro-secondary/50 flex items-center justify-center text-xs">+</div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--sandoro-fg)' }}>Short Break</span>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded bg-sandoro-secondary/50 flex items-center justify-center text-xs">-</div>
              <span className="w-16 text-center font-mono text-xs">5 min</span>
              <div className="w-6 h-6 rounded bg-sandoro-secondary/50 flex items-center justify-center text-xs">+</div>
            </div>
          </div>
        </div>
      </div>

      {/* Goals Section */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold text-sandoro-secondary">Goals</h3>
        <div className="flex flex-col gap-2 bg-sandoro-secondary/10 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--sandoro-fg)' }}>Daily Sessions</span>
            <span className="font-mono text-xs">5</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--sandoro-fg)' }}>Daily Minutes</span>
            <span className="font-mono text-xs">120 min</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Settings() {
  const { user, loading } = useAuth();
  const { mode, accentColor, setMode, setAccentColor } = useTheme();
  const isRainbow = accentColor === 'rainbow';
  const { settings, setSettings, resetSettings } = useSettings();
  const { permission, isSupported, requestPermission } = useNotification();
  const { testSound, testSoundWithPattern } = useSound();
  const { tags, addTag, removeTag, updateTag } = useTags();
  const { getInfo, createCheckout, openPortal, loading: subscriptionLoading } = useSubscription();
  const [newTagName, setNewTagName] = useState('');
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState('');
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Check URL params for success/canceled
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      setShowSuccessMessage(true);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      // Hide message after 5 seconds
      setTimeout(() => setShowSuccessMessage(false), 5000);
    }
    if (params.get('canceled') === 'true') {
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const subscriptionInfo = getInfo();

  // Show login required screen if not authenticated
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-sandoro-secondary">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginRequired
        title="Make it yours"
        titleJa="自分好みにカスタマイズ"
        description="Personalize your timer, themes, sounds, and more."
        descriptionJa="タイマー、テーマ、サウンドなどを自由に設定できます。"
        icon="⚙️"
        features={[
          'Customize work and break durations',
          'Choose your favorite theme',
          'Set up notifications and sounds',
          'Organize with custom tags',
        ]}
        featuresJa={[
          '作業・休憩時間をカスタマイズ',
          'お気に入りのテーマを選択',
          '通知とサウンドを設定',
          'タグで整理',
        ]}
        previewContent={<SettingsPreview />}
      />
    );
  }

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
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-bold">{settings.language === 'ja' ? '設定' : 'Settings'}</h2>

      {/* Theme Section */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold" style={{ color: 'var(--sandoro-secondary)' }}>
          {settings.language === 'ja' ? '外観' : 'Appearance'}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs w-12" style={{ color: 'var(--sandoro-fg)' }}>
            {settings.language === 'ja' ? 'モード:' : 'Mode:'}
          </span>
          <div className="flex gap-0.5 rounded-lg p-0.5 bg-sandoro-secondary/20">
            {THEME_OPTIONS.map((option) => {
              const isSelected = mode === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setMode(option.value)}
                  className={`px-2 py-0.5 text-xs rounded transition-colors ${
                    isSelected && isRainbow ? 'rainbow-gradient-bg' : ''
                  }`}
                  style={{
                    backgroundColor: isSelected && !isRainbow ? 'var(--sandoro-primary)' : !isSelected ? 'transparent' : undefined,
                    color: isSelected && !isRainbow ? 'var(--sandoro-bg)' : !isSelected ? 'var(--sandoro-fg)' : undefined,
                    fontWeight: isSelected ? 'bold' : 'normal',
                  }}
                  title={option.label}
                >
                  <span className="mr-0.5">{option.icon}</span>
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs w-12" style={{ color: 'var(--sandoro-fg)' }}>
            {settings.language === 'ja' ? 'カラー:' : 'Accent:'}
          </span>
          <div className="flex gap-0.5 flex-wrap rounded-lg p-0.5 bg-sandoro-secondary/20">
            {ACCENT_COLORS.map((accent) => {
              const isSelected = accentColor === accent.value;
              const isRainbowSelected = isSelected && accent.value === 'rainbow';
              return (
                <button
                  key={accent.value}
                  onClick={() => setAccentColor(accent.value)}
                  className={`px-1.5 py-0.5 text-xs rounded transition-colors flex items-center gap-0.5 ${
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
                    className="w-2.5 h-2.5 rounded-full"
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
          <span className="text-xs w-12" style={{ color: 'var(--sandoro-fg)' }}>
            {settings.language === 'ja' ? 'アイコン:' : 'Icon:'}
          </span>
          <div className="flex gap-0.5 rounded-lg p-0.5 bg-sandoro-secondary/20">
            {ICON_OPTIONS.map((option) => {
              const isSelected = settings.icon === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setSettings({ icon: option.value })}
                  className={`px-2 py-0.5 text-xs rounded transition-colors ${
                    isSelected && isRainbow ? 'rainbow-gradient-bg' : ''
                  }`}
                  style={{
                    backgroundColor: isSelected && !isRainbow ? 'var(--sandoro-primary)' : !isSelected ? 'transparent' : undefined,
                    color: isSelected && !isRainbow ? 'var(--sandoro-bg)' : !isSelected ? 'var(--sandoro-fg)' : undefined,
                    fontWeight: isSelected ? 'bold' : 'normal',
                  }}
                  title={option.label}
                >
                  <span className="mr-0.5">{option.icon}</span>
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs w-12" style={{ color: 'var(--sandoro-fg)' }}>
            {settings.language === 'ja' ? '言語:' : 'Lang:'}
          </span>
          <div className="flex gap-0.5 rounded-lg p-0.5 bg-sandoro-secondary/20">
            {LANGUAGE_OPTIONS.map((option) => {
              const isSelected = settings.language === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setSettings({ language: option.value })}
                  className={`px-2 py-0.5 text-xs rounded transition-colors ${
                    isSelected && isRainbow ? 'rainbow-gradient-bg' : ''
                  }`}
                  style={{
                    backgroundColor: isSelected && !isRainbow ? 'var(--sandoro-primary)' : !isSelected ? 'transparent' : undefined,
                    color: isSelected && !isRainbow ? 'var(--sandoro-bg)' : !isSelected ? 'var(--sandoro-fg)' : undefined,
                    fontWeight: isSelected ? 'bold' : 'normal',
                  }}
                  title={option.label}
                >
                  <span className="mr-0.5">{option.icon}</span>
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Notifications & Sound Section */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold text-sandoro-secondary">
          {settings.language === 'ja' ? '通知とサウンド' : 'Notifications & Sound'}
        </h3>
        <div className="flex flex-col gap-2 bg-sandoro-secondary/10 rounded-lg p-3">
          <ToggleButton
            label={settings.language === 'ja' ? '通知' : 'Notifications'}
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
            label={settings.language === 'ja' ? 'サウンド' : 'Sound'}
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
                  {settings.language === 'ja' ? 'テスト' : 'Test'}
                </button>
              )
            }
          />
          {settings.soundEnabled && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--sandoro-fg)' }}>
                  {settings.language === 'ja' ? '音量' : 'Volume'}
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={settings.soundVolume}
                    onChange={(e) => setSettings({ soundVolume: parseInt(e.target.value, 10) })}
                    className="w-20 accent-sandoro-primary"
                  />
                  <span className="w-8 text-xs font-mono text-sandoro-secondary">{settings.soundVolume}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--sandoro-fg)' }}>
                  {settings.language === 'ja' ? 'サウンドの種類' : 'Sound Type'}
                </span>
                <div className="flex gap-0.5 flex-wrap rounded-lg p-0.5 bg-sandoro-secondary/20">
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
                        className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
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
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold text-sandoro-secondary">
          {settings.language === 'ja' ? 'タイマー' : 'Timer'}
        </h3>
        <p className="text-xs text-sandoro-secondary/70">
          {settings.language === 'ja'
            ? '* タイマー設定を変更すると現在のセッションがリセットされます'
            : '* Changing timer settings will reset the current session'}
        </p>
        <div className="flex flex-col gap-2 bg-sandoro-secondary/10 rounded-lg p-3">
          <NumberInput
            label={settings.language === 'ja' ? '作業時間' : 'Work Duration'}
            value={settings.workDuration}
            min={5}
            max={60}
            step={5}
            unit={settings.language === 'ja' ? '分' : 'min'}
            onChange={(v) => setSettings({ workDuration: v })}
          />
          <NumberInput
            label={settings.language === 'ja' ? '短い休憩' : 'Short Break'}
            value={settings.shortBreak}
            min={1}
            max={30}
            step={1}
            unit={settings.language === 'ja' ? '分' : 'min'}
            onChange={(v) => setSettings({ shortBreak: v })}
          />
          <NumberInput
            label={settings.language === 'ja' ? '長い休憩' : 'Long Break'}
            value={settings.longBreak}
            min={5}
            max={60}
            step={5}
            unit={settings.language === 'ja' ? '分' : 'min'}
            onChange={(v) => setSettings({ longBreak: v })}
          />
          <NumberInput
            label={settings.language === 'ja' ? '長い休憩までのセッション数' : 'Sessions until long break'}
            value={settings.sessionsUntilLongBreak}
            min={2}
            max={8}
            step={1}
            unit=""
            onChange={(v) => setSettings({ sessionsUntilLongBreak: v })}
          />
          <ToggleButton
            label={settings.language === 'ja' ? '自動開始' : 'Auto Start'}
            enabled={settings.autoStart}
            onToggle={() => setSettings({ autoStart: !settings.autoStart })}
            isRainbow={isRainbow}
          />
        </div>
      </div>

      {/* Focus Mode Section */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold text-sandoro-secondary">
          {settings.language === 'ja' ? 'フォーカスモード' : 'Focus Mode'}
        </h3>
        <p className="text-xs text-sandoro-secondary/70">
          {settings.language === 'ja'
            ? '* 新しいセッションのデフォルトモード。タイマーでも変更できます。'
            : '* Default mode for new sessions. You can also change this in the timer.'}
        </p>
        <div className="flex flex-col gap-3 bg-sandoro-secondary/10 rounded-lg p-3">
          <div className="flex flex-col gap-2">
            <span className="text-xs" style={{ color: 'var(--sandoro-fg)' }}>
              {settings.language === 'ja' ? 'デフォルトモード:' : 'Default Mode:'}
            </span>
            <div className="flex gap-0.5 rounded-lg p-0.5 bg-sandoro-secondary/20">
              {FOCUS_MODE_OPTIONS.map((option) => {
                const isSelected = settings.focusMode === option.value;
                const description = settings.language === 'ja' ? option.descriptionJa : option.descriptionEn;
                return (
                  <button
                    key={option.value}
                    onClick={() => setSettings({ focusMode: option.value })}
                    className={`px-2 py-0.5 text-xs rounded transition-colors ${
                      isSelected && isRainbow ? 'rainbow-gradient-bg' : ''
                    }`}
                    style={{
                      backgroundColor: isSelected && !isRainbow ? 'var(--sandoro-primary)' : !isSelected ? 'transparent' : undefined,
                      color: isSelected && !isRainbow ? 'var(--sandoro-bg)' : !isSelected ? 'var(--sandoro-fg)' : undefined,
                      fontWeight: isSelected ? 'bold' : 'normal',
                    }}
                    title={description}
                  >
                    <span className="mr-0.5">{option.icon}</span>
                    {option.label}
                  </button>
                );
              })}
            </div>
            {/* Mode description */}
            <p className="text-xs text-sandoro-secondary/70 pl-1">
              {(() => {
                const option = FOCUS_MODE_OPTIONS.find(o => o.value === settings.focusMode);
                return settings.language === 'ja' ? option?.descriptionJa : option?.descriptionEn;
              })()}
            </p>
          </div>
          <ToggleButton
            label={settings.language === 'ja' ? '休憩延長' : 'Break Snooze'}
            enabled={settings.breakSnoozeEnabled}
            onToggle={() => setSettings({ breakSnoozeEnabled: !settings.breakSnoozeEnabled })}
            isRainbow={isRainbow}
            extra={
              <span className="text-xs text-sandoro-secondary/70 mr-2">
                {settings.language === 'ja' ? 'ONにすると休憩中に延長ボタンが表示されます' : 'Shows extend button during breaks when ON'}
              </span>
            }
          />
        </div>
      </div>

      {/* Goals Section */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold text-sandoro-secondary">
          {settings.language === 'ja' ? '目標' : 'Goals'}
        </h3>
        <p className="text-xs text-sandoro-secondary/70">
          {settings.language === 'ja'
            ? '* 0に設定すると無効。日次変更は週次(×7)に自動反映されます。'
            : '* Set to 0 to disable a goal. Daily changes auto-update weekly (×7).'}
        </p>
        <div className="flex flex-col gap-2 bg-sandoro-secondary/10 rounded-lg p-3">
          <NumberInput
            label={settings.language === 'ja' ? '1日のセッション数' : 'Daily Sessions'}
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
            label={settings.language === 'ja' ? '1日の作業時間' : 'Daily Minutes'}
            value={settings.goals.dailyMinutesGoal}
            min={0}
            max={480}
            step={30}
            unit={settings.language === 'ja' ? '分' : 'min'}
            onChange={(v) => setSettings({
              goals: {
                ...settings.goals,
                dailyMinutesGoal: v,
                weeklyMinutesGoal: v * 7, // Auto-calculate weekly
              }
            })}
          />
          <NumberInput
            label={settings.language === 'ja' ? '週間セッション数' : 'Weekly Sessions'}
            value={settings.goals.weeklySessionsGoal}
            min={0}
            max={140}
            step={1}
            unit=""
            onChange={(v) => setSettings({ goals: { ...settings.goals, weeklySessionsGoal: v } })}
          />
          <NumberInput
            label={settings.language === 'ja' ? '週間作業時間' : 'Weekly Minutes'}
            value={settings.goals.weeklyMinutesGoal}
            min={0}
            max={3360}
            step={30}
            unit={settings.language === 'ja' ? '分' : 'min'}
            onChange={(v) => setSettings({ goals: { ...settings.goals, weeklyMinutesGoal: v } })}
          />
        </div>
      </div>

      {/* Tags Section */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold text-sandoro-secondary">
          {settings.language === 'ja' ? 'タグ' : 'Tags'}
        </h3>
        <p className="text-xs text-sandoro-secondary/70">
          {settings.language === 'ja'
            ? '* タグで作業セッションを分類できます'
            : '* Tags help categorize your work sessions'}
        </p>
        <div className="flex flex-col gap-2 bg-sandoro-secondary/10 rounded-lg p-3">
          {/* Add new tag */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder={settings.language === 'ja' ? '新しいタグ名...' : 'New tag name...'}
              className="flex-1 px-3 py-1.5 text-sm rounded border border-sandoro-secondary/50 bg-transparent focus:outline-none focus:border-sandoro-primary transition-colors"
              style={{ color: 'var(--sandoro-fg)' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTagName.trim()) {
                  addTag(newTagName.trim());
                  setNewTagName('');
                }
              }}
            />
            <button
              onClick={() => {
                if (newTagName.trim()) {
                  addTag(newTagName.trim());
                  setNewTagName('');
                }
              }}
              disabled={!newTagName.trim()}
              className={`px-3 py-1.5 text-sm rounded transition-colors ${
                newTagName.trim()
                  ? isRainbow
                    ? 'rainbow-gradient-bg'
                    : 'bg-sandoro-primary text-white hover:opacity-80'
                  : 'bg-sandoro-secondary/30 text-sandoro-secondary cursor-not-allowed'
              }`}
            >
              {settings.language === 'ja' ? '追加' : 'Add'}
            </button>
          </div>

          {/* Tag list */}
          {tags.length === 0 ? (
            <p className="text-sm text-sandoro-secondary text-center py-2">
              {settings.language === 'ja' ? 'タグがありません。上から追加してください！' : 'No tags yet. Add one above!'}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-2 rounded border border-sandoro-secondary/30 hover:border-sandoro-secondary/50 transition-colors"
                >
                  {editingTagId === tag.id ? (
                    <input
                      type="text"
                      value={editingTagName}
                      onChange={(e) => setEditingTagName(e.target.value)}
                      className="flex-1 px-2 py-0.5 text-sm rounded border border-sandoro-primary bg-transparent focus:outline-none"
                      style={{ color: 'var(--sandoro-fg)' }}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && editingTagName.trim()) {
                          updateTag(tag.id, { name: editingTagName.trim() });
                          setEditingTagId(null);
                          setEditingTagName('');
                        } else if (e.key === 'Escape') {
                          setEditingTagId(null);
                          setEditingTagName('');
                        }
                      }}
                      onBlur={() => {
                        if (editingTagName.trim()) {
                          updateTag(tag.id, { name: editingTagName.trim() });
                        }
                        setEditingTagId(null);
                        setEditingTagName('');
                      }}
                    />
                  ) : (
                    <span
                      className="text-sm cursor-pointer hover:text-sandoro-primary transition-colors"
                      style={{ color: 'var(--sandoro-fg)' }}
                      onClick={() => {
                        setEditingTagId(tag.id);
                        setEditingTagName(tag.name);
                      }}
                      title="Click to edit"
                    >
                      {tag.name}
                    </span>
                  )}
                  <button
                    onClick={() => removeTag(tag.id)}
                    className="px-2 py-0.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                    title="Delete tag"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pro Subscription Section */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold text-sandoro-secondary">
          {settings.language === 'ja' ? 'サブスクリプション' : 'Subscription'}
        </h3>

        {/* Success message */}
        {showSuccessMessage && (
          <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/50">
            <p className="text-sm text-green-400">
              {settings.language === 'ja'
                ? '🎉 Pro プランへのアップグレードありがとうございます！'
                : '🎉 Thank you for upgrading to Pro!'}
            </p>
          </div>
        )}

        {/* Error message */}
        {upgradeError && (
          <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50">
            <p className="text-sm text-red-400">{upgradeError}</p>
          </div>
        )}

        <div className="flex flex-col gap-3 bg-sandoro-secondary/10 rounded-lg p-3">
          {subscriptionLoading ? (
            <p className="text-sm text-sandoro-secondary">Loading...</p>
          ) : subscriptionInfo.isPro ? (
            /* Pro user view */
            <>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold">
                  PRO
                </span>
                <span className="text-sm" style={{ color: 'var(--sandoro-fg)' }}>
                  {settings.language === 'ja' ? 'Pro プラン有効' : 'Pro Plan Active'}
                </span>
              </div>
              {subscriptionInfo.currentPeriodEnd && (
                <p className="text-xs text-sandoro-secondary">
                  {subscriptionInfo.cancelAtPeriodEnd
                    ? settings.language === 'ja'
                      ? `${subscriptionInfo.currentPeriodEnd.toLocaleDateString()} に終了予定`
                      : `Ends on ${subscriptionInfo.currentPeriodEnd.toLocaleDateString()}`
                    : settings.language === 'ja'
                    ? `次回更新: ${subscriptionInfo.currentPeriodEnd.toLocaleDateString()}`
                    : `Renews on ${subscriptionInfo.currentPeriodEnd.toLocaleDateString()}`}
                </p>
              )}
              <button
                onClick={async () => {
                  try {
                    setUpgradeError(null);
                    await openPortal();
                  } catch (err) {
                    setUpgradeError(err instanceof Error ? err.message : 'Failed to open portal');
                  }
                }}
                className="px-4 py-2 text-sm rounded border border-sandoro-secondary/50 hover:border-sandoro-primary transition-colors"
                style={{ color: 'var(--sandoro-fg)' }}
              >
                {settings.language === 'ja' ? '購読を管理' : 'Manage Subscription'}
              </button>
            </>
          ) : (
            /* Free user view */
            <>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs rounded-full bg-sandoro-secondary/50 text-sandoro-fg font-bold">
                  FREE
                </span>
                <span className="text-sm" style={{ color: 'var(--sandoro-fg)' }}>
                  {settings.language === 'ja' ? '無料プラン' : 'Free Plan'}
                </span>
              </div>
              <div className="flex flex-col gap-1 text-xs text-sandoro-secondary">
                <p className="font-semibold" style={{ color: 'var(--sandoro-fg)' }}>
                  {settings.language === 'ja' ? 'Pro で解放される機能:' : 'Unlock with Pro:'}
                </p>
                <ul className="list-disc list-inside pl-2 space-y-0.5">
                  <li>{settings.language === 'ja' ? '🍅 トマト、🐱 猫などの Pro アイコン' : '🍅 Tomato, 🐱 Cat, and more Pro icons'}</li>
                  <li>{settings.language === 'ja' ? '🌈 全10色 + レインボー + カスタムカラー' : '🌈 All 10 colors + rainbow + custom'}</li>
                  <li>{settings.language === 'ja' ? '📊 CSV エクスポート' : '📊 CSV export'}</li>
                  <li>{settings.language === 'ja' ? '🚫 広告なし' : '🚫 Ad-free experience'}</li>
                </ul>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={async () => {
                    try {
                      setUpgradeLoading(true);
                      setUpgradeError(null);
                      await createCheckout(import.meta.env.VITE_STRIPE_PRICE_MONTHLY || '');
                    } catch (err) {
                      setUpgradeError(err instanceof Error ? err.message : 'Failed to start checkout');
                    } finally {
                      setUpgradeLoading(false);
                    }
                  }}
                  disabled={upgradeLoading}
                  className={`px-4 py-2 text-sm rounded font-bold transition-colors ${
                    isRainbow ? 'rainbow-gradient-bg' : ''
                  }`}
                  style={{
                    backgroundColor: !isRainbow ? 'var(--sandoro-primary)' : undefined,
                    color: !isRainbow ? 'var(--sandoro-bg)' : undefined,
                    opacity: upgradeLoading ? 0.5 : 1,
                  }}
                >
                  {upgradeLoading
                    ? '...'
                    : settings.language === 'ja'
                    ? '$1.99/月'
                    : '$1.99/mo'}
                </button>
                <button
                  onClick={async () => {
                    try {
                      setUpgradeLoading(true);
                      setUpgradeError(null);
                      await createCheckout(import.meta.env.VITE_STRIPE_PRICE_YEARLY || '');
                    } catch (err) {
                      setUpgradeError(err instanceof Error ? err.message : 'Failed to start checkout');
                    } finally {
                      setUpgradeLoading(false);
                    }
                  }}
                  disabled={upgradeLoading}
                  className="px-4 py-2 text-sm rounded border border-sandoro-primary/50 hover:border-sandoro-primary transition-colors"
                  style={{
                    color: 'var(--sandoro-primary)',
                    opacity: upgradeLoading ? 0.5 : 1,
                  }}
                >
                  {settings.language === 'ja' ? '$12/年 (50% OFF)' : '$12/yr (50% OFF)'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reset Button */}
      <button
        onClick={resetSettings}
        className="self-start px-3 py-1 text-xs text-sandoro-secondary hover:text-sandoro-fg border border-sandoro-secondary/30 rounded hover:border-sandoro-secondary transition-colors"
      >
        {settings.language === 'ja' ? 'デフォルトに戻す' : 'Reset to defaults'}
      </button>
    </div>
  );
}
