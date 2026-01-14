import { useState, useMemo, useRef, useCallback } from 'react';
import { Timer } from './components/Timer/Timer';
import { Settings } from './components/Settings';
import { Stats } from './components/Stats';
import { IconPreview } from './components/IconPreview';
import { Footer } from './components/Footer';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { useTheme } from './hooks/useTheme';
import { useSettings } from './hooks/useSettings';
import { useClock } from './hooks/useClock';

type ViewType = 'timer' | 'stats' | 'settings' | 'privacy';

function App() {
  const [view, setView] = useState<ViewType>('timer');
  const previousViewRef = useRef<ViewType>('timer');

  // Track previous view for "back" navigation
  const navigateTo = useCallback((newView: ViewType) => {
    if (view !== 'privacy') {
      previousViewRef.current = view;
    }
    setView(newView);
  }, [view]);

  const goBack = useCallback(() => {
    setView(previousViewRef.current);
  }, []);

  // Debug mode: ?debug=true でアイコンプレビューモード
  const isDebugMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('debug') === 'true';
  }, []);
  // Initialize theme hook to apply theme on mount
  const { accentColor } = useTheme();
  const isRainbow = accentColor === 'rainbow';
  const { settings } = useSettings();
  const currentTime = useClock();

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--sandoro-bg)', color: 'var(--sandoro-fg)' }}
    >
      <header className="flex justify-between items-center p-4 border-b border-sandoro-secondary">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">sandoro</h1>
          <span className="text-sm text-sandoro-secondary">v0.1.0</span>
        </div>
        <span className="text-sm text-sandoro-secondary font-mono">{currentTime}</span>
      </header>

      <main className="p-4 pb-16">
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
            {view === 'privacy' && <PrivacyPolicy />}
          </>
        )}
      </main>

      {view === 'privacy' ? (
        <nav
          className="fixed bottom-0 left-0 right-0 py-2 border-t border-sandoro-secondary z-50"
          style={{ backgroundColor: 'var(--sandoro-bg)' }}
        >
          <div className="flex justify-center">
            <button
              onClick={goBack}
              className={`px-4 py-1 text-sm ${isRainbow ? 'rainbow-gradient' : 'text-sandoro-primary'}`}
            >
              &larr; Back
            </button>
          </div>
        </nav>
      ) : (
        <>
          <Footer onPrivacyClick={() => navigateTo('privacy')} />
          <nav
            className="fixed bottom-0 left-0 right-0 flex justify-around py-2 border-t border-sandoro-secondary z-50"
            style={{ backgroundColor: 'var(--sandoro-bg)' }}
          >
            <button
              onClick={() => navigateTo('timer')}
              className={`px-3 py-1 text-sm ${
                view === 'timer'
                  ? isRainbow ? 'rainbow-gradient' : 'text-sandoro-primary'
                  : 'text-sandoro-secondary'
              }`}
            >
              Timer
            </button>
            <button
              onClick={() => navigateTo('stats')}
              className={`px-3 py-1 text-sm ${
                view === 'stats'
                  ? isRainbow ? 'rainbow-gradient' : 'text-sandoro-primary'
                  : 'text-sandoro-secondary'
              }`}
            >
              Stats
            </button>
            <button
              onClick={() => navigateTo('settings')}
              className={`px-3 py-1 text-sm ${
                view === 'settings'
                  ? isRainbow ? 'rainbow-gradient' : 'text-sandoro-primary'
                  : 'text-sandoro-secondary'
              }`}
            >
              Settings
            </button>
          </nav>
        </>
      )}
    </div>
  );
}

export default App;
