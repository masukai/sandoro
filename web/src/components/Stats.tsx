import { useState } from 'react';
import { useSessionStorage, DailyStats } from '../hooks/useSessionStorage';

type StatsView = 'today' | 'week' | 'month';

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function StatsCard({
  title,
  stats,
}: {
  title: string;
  stats: DailyStats;
}) {
  return (
    <div
      className="p-4 rounded-lg border border-sandoro-secondary"
      style={{ backgroundColor: 'var(--sandoro-bg)' }}
    >
      <h3 className="text-sm text-sandoro-secondary mb-2">{title}</h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Total time</span>
          <span className="font-mono">{formatDuration(stats.totalWorkSeconds)}</span>
        </div>
        <div className="flex justify-between">
          <span>Sessions</span>
          <span className="font-mono">{stats.sessionsCompleted}</span>
        </div>
      </div>
    </div>
  );
}

function DailyBreakdown({ days }: { days: DailyStats[] }) {
  if (days.length === 0) {
    return (
      <p className="text-sandoro-secondary text-sm">No sessions recorded yet.</p>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm text-sandoro-secondary">Daily breakdown</h3>
      <div className="space-y-1">
        {days.map((day) => (
          <div
            key={day.date}
            className="flex justify-between text-sm font-mono py-1 border-b border-sandoro-secondary/30"
          >
            <span>{day.date}</span>
            <span>{formatDuration(day.totalWorkSeconds)}</span>
            <span>{day.sessionsCompleted} sessions</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Stats() {
  const [view, setView] = useState<StatsView>('today');
  const {
    getTodayStats,
    getWeekStats,
    getMonthStats,
    getDailyBreakdown,
  } = useSessionStorage();

  const todayStats = getTodayStats();
  const weekStats = getWeekStats();
  const monthStats = getMonthStats();

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Statistics</h2>

      {/* View Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('today')}
          className={`px-3 py-1 rounded text-sm ${
            view === 'today'
              ? 'bg-sandoro-primary text-white'
              : 'border border-sandoro-secondary'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setView('week')}
          className={`px-3 py-1 rounded text-sm ${
            view === 'week'
              ? 'bg-sandoro-primary text-white'
              : 'border border-sandoro-secondary'
          }`}
        >
          Week
        </button>
        <button
          onClick={() => setView('month')}
          className={`px-3 py-1 rounded text-sm ${
            view === 'month'
              ? 'bg-sandoro-primary text-white'
              : 'border border-sandoro-secondary'
          }`}
        >
          Month
        </button>
      </div>

      {/* Stats Display */}
      {view === 'today' && (
        <StatsCard title={`Today (${todayStats.date})`} stats={todayStats} />
      )}

      {view === 'week' && (
        <div className="space-y-4">
          <StatsCard title="Last 7 Days" stats={weekStats} />
          <DailyBreakdown days={getDailyBreakdown(7)} />
        </div>
      )}

      {view === 'month' && (
        <div className="space-y-4">
          <StatsCard title="Last 30 Days" stats={monthStats} />
          <DailyBreakdown days={getDailyBreakdown(30).slice(0, 10)} />
          {getDailyBreakdown(30).length > 10 && (
            <p className="text-sandoro-secondary text-sm">
              ... and {getDailyBreakdown(30).length - 10} more days
            </p>
          )}
        </div>
      )}
    </div>
  );
}
