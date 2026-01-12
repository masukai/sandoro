import { useState, useMemo } from 'react';
import { Timer } from './components/Timer/Timer';
import { Settings } from './components/Settings';
import { Stats } from './components/Stats';
import { IconPreview } from './components/IconPreview';
import { useTheme } from './hooks/useTheme';
import { useSettings } from './hooks/useSettings';

function App() {
  const [view, setView] = useState<'timer' | 'stats' | 'settings'>('timer');

  // Debug mode: ?debug=true でアイコンプレビューモード
  const isDebugMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('debug') === 'true';
  }, []);
  // Initialize theme hook to apply theme on mount
  const { accentColor } = useTheme();
  const isRainbow = accentColor === 'rainbow';
  const { settings } = useSettings();

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--sandoro-bg)', color: 'var(--sandoro-fg)' }}
    >
      <header className="flex justify-between items-center p-4 border-b border-sandoro-secondary">
        <h1 className="text-xl font-bold">sandoro</h1>
        <span className="text-sm text-sandoro-secondary">v0.1.0</span>
      </header>

      <main className="p-4 pb-32">
        {isDebugMode ? (
          <IconPreview />
        ) : (
          <>
            {/* Timerは常にレンダリングし、非表示時はhiddenにして状態を保持 */}
            <div className={view === 'timer' ? '' : 'hidden'}>
              <Timer
                key={`${settings.workDuration}-${settings.shortBreak}-${settings.longBreak}-${settings.sessionsUntilLongBreak}`}
                workDuration={settings.workDuration * 60}
                shortBreakDuration={settings.shortBreak * 60}
                longBreakDuration={settings.longBreak * 60}
                sessionsUntilLongBreak={settings.sessionsUntilLongBreak}
                autoStart={settings.autoStart}
              />
            </div>
            {view === 'stats' && <Stats />}
            {view === 'settings' && <Settings />}
          </>
        )}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 flex justify-around p-4 border-t border-sandoro-secondary z-50"
        style={{ backgroundColor: 'var(--sandoro-bg)' }}
      >
        <button
          onClick={() => setView('timer')}
          className={`px-4 py-2 ${
            view === 'timer'
              ? isRainbow ? 'rainbow-gradient' : 'text-sandoro-primary'
              : 'text-sandoro-secondary'
          }`}
        >
          Timer
        </button>
        <button
          onClick={() => setView('stats')}
          className={`px-4 py-2 ${
            view === 'stats'
              ? isRainbow ? 'rainbow-gradient' : 'text-sandoro-primary'
              : 'text-sandoro-secondary'
          }`}
        >
          Stats
        </button>
        <button
          onClick={() => setView('settings')}
          className={`px-4 py-2 ${
            view === 'settings'
              ? isRainbow ? 'rainbow-gradient' : 'text-sandoro-primary'
              : 'text-sandoro-secondary'
          }`}
        >
          Settings
        </button>
      </nav>
    </div>
  );
}

export default App;
