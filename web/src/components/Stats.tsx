import { useState, useCallback, useMemo } from 'react';
import { useSessionStorage, DailyStats, Session } from '../hooks/useSessionStorage';
import { useGoalProgress, hasGoalsEnabled } from '../hooks/useGoalProgress';
import { useComparison, ComparisonData } from '../hooks/useComparison';
import { useSettings } from '../hooks/useSettings';
import { useTheme } from '../hooks/useTheme';
import { useTags, Tag } from '../hooks/useTags';
import { useAuth } from '../hooks/useAuth';
import { Heatmap } from './Heatmap';
import { ShareModal } from './ShareModal';
import { LoginRequired } from './LoginRequired';

type StatsView = 'today' | 'week' | 'month';
type ExportFormat = 'json' | 'csv';

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

interface GoalBarProps {
  label: string;
  current: number;
  goal: number;
  percentage: number;
  unit: string;
  isRainbow?: boolean;
}

function GoalBar({ label, current, goal, percentage, unit, isRainbow = false }: GoalBarProps) {
  if (goal === 0) return null;
  const isComplete = percentage >= 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span className="font-mono">
          {current}/{goal} {unit}
        </span>
      </div>
      <div className="h-2 bg-sandoro-secondary/30 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isRainbow && !isComplete ? 'rainbow-gradient-bg' : ''
          }`}
          style={{
            width: `${Math.min(100, percentage)}%`,
            backgroundColor: isRainbow && !isComplete ? undefined : isComplete ? 'var(--sandoro-work)' : 'var(--sandoro-primary)',
          }}
        />
      </div>
    </div>
  );
}

function GoalProgress() {
  const { settings } = useSettings();
  const { accentColor } = useTheme();
  const isRainbow = accentColor === 'rainbow';
  const progress = useGoalProgress();

  if (!hasGoalsEnabled(settings.goals)) {
    return null;
  }

  return (
    <div
      className="p-4 rounded-lg border border-sandoro-secondary space-y-3"
      style={{ backgroundColor: 'var(--sandoro-bg)' }}
    >
      <h3 className="text-sm font-semibold text-sandoro-secondary">Goals</h3>

      {/* Daily Goals */}
      {(settings.goals.dailySessionsGoal > 0 || settings.goals.dailyMinutesGoal > 0) && (
        <div className="space-y-2">
          <div className="text-xs text-sandoro-secondary/70">Daily</div>
          <GoalBar
            label="Sessions"
            current={progress.daily.sessions.current}
            goal={progress.daily.sessions.goal}
            percentage={progress.daily.sessions.percentage}
            unit=""
            isRainbow={isRainbow}
          />
          <GoalBar
            label="Minutes"
            current={progress.daily.minutes.current}
            goal={progress.daily.minutes.goal}
            percentage={progress.daily.minutes.percentage}
            unit="min"
            isRainbow={isRainbow}
          />
        </div>
      )}

      {/* Weekly Goals */}
      {(settings.goals.weeklySessionsGoal > 0 || settings.goals.weeklyMinutesGoal > 0) && (
        <div className="space-y-2">
          <div className="text-xs text-sandoro-secondary/70">Weekly</div>
          <GoalBar
            label="Sessions"
            current={progress.weekly.sessions.current}
            goal={progress.weekly.sessions.goal}
            percentage={progress.weekly.sessions.percentage}
            unit=""
            isRainbow={isRainbow}
          />
          <GoalBar
            label="Minutes"
            current={progress.weekly.minutes.current}
            goal={progress.weekly.minutes.goal}
            percentage={progress.weekly.minutes.percentage}
            unit="min"
            isRainbow={isRainbow}
          />
        </div>
      )}
    </div>
  );
}

interface ChangeIndicatorProps {
  value: number;
  showPercent?: boolean;
}

function ChangeIndicator({ value, showPercent = true }: ChangeIndicatorProps) {
  if (value === 0) {
    return <span className="text-sandoro-secondary text-xs">--</span>;
  }
  const isPositive = value > 0;
  const color = isPositive ? 'text-sandoro-work' : 'text-red-400';
  const arrow = isPositive ? '↑' : '↓';

  return (
    <span className={`text-xs font-mono ${color}`}>
      {arrow}{Math.abs(value)}{showPercent ? '%' : ''}
    </span>
  );
}

interface ComparisonCardProps {
  title: string;
  data: ComparisonData;
}

function ComparisonCard({ title, data }: ComparisonCardProps) {
  return (
    <div
      className="p-4 rounded-lg border border-sandoro-secondary"
      style={{ backgroundColor: 'var(--sandoro-bg)' }}
    >
      <h3 className="text-sm text-sandoro-secondary mb-3">{title}</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span>Sessions</span>
          <div className="flex items-center gap-2">
            <span className="font-mono">
              {data.current.sessionsCompleted}
              <span className="text-sandoro-secondary text-xs mx-1">vs</span>
              {data.previous.sessionsCompleted}
            </span>
            <ChangeIndicator value={data.change.sessionsCompleted} />
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span>Total time</span>
          <div className="flex items-center gap-2">
            <span className="font-mono">
              {formatDuration(data.current.totalWorkSeconds)}
              <span className="text-sandoro-secondary text-xs mx-1">vs</span>
              {formatDuration(data.previous.totalWorkSeconds)}
            </span>
            <ChangeIndicator value={data.change.totalWorkSeconds} />
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span>Active days</span>
          <div className="flex items-center gap-2">
            <span className="font-mono">
              {data.current.activeDays}
              <span className="text-sandoro-secondary text-xs mx-1">vs</span>
              {data.previous.activeDays}
            </span>
            <ChangeIndicator value={data.change.activeDays} />
          </div>
        </div>
      </div>
    </div>
  );
}

interface SessionHistoryProps {
  sessions: Session[];
  tags: Tag[];
  getTagById: (id: string) => Tag | undefined;
  onUpdateTag: (sessionId: string, tagId: string | undefined) => void;
  onDelete: (sessionId: string) => void;
  isRainbow: boolean;
}

function SessionHistory({
  sessions,
  tags,
  getTagById,
  onUpdateTag,
  onDelete,
  isRainbow,
}: SessionHistoryProps) {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter and sort: only completed work sessions, newest first
  const workSessions = useMemo(() => {
    return sessions
      .filter((s) => s.type === 'work' && s.completed)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, 20); // Show last 20 sessions
  }, [sessions]);

  if (workSessions.length === 0) {
    return (
      <p className="text-sandoro-secondary text-sm">No work sessions recorded yet.</p>
    );
  }

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-2">
      {workSessions.map((session) => {
        const tag = session.tagId ? getTagById(session.tagId) : undefined;
        const isEditing = editingSessionId === session.id;
        const isDeleting = deleteConfirmId === session.id;

        return (
          <div
            key={session.id}
            className="flex items-center justify-between text-sm font-mono py-2 px-3 border border-sandoro-secondary/30 rounded-lg"
            style={{ backgroundColor: 'var(--sandoro-bg)' }}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-sandoro-secondary whitespace-nowrap">
                {formatDateTime(session.startedAt)}
              </span>
              <span className="whitespace-nowrap">
                {formatDuration(session.durationSeconds || 0)}
              </span>
              {isEditing ? (
                <select
                  value={session.tagId || ''}
                  onChange={(e) => {
                    onUpdateTag(session.id, e.target.value || undefined);
                    setEditingSessionId(null);
                  }}
                  onBlur={() => setEditingSessionId(null)}
                  autoFocus
                  className="px-2 py-0.5 text-xs rounded border border-sandoro-secondary bg-transparent"
                >
                  <option value="">No tag</option>
                  {tags.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span
                  className={`text-xs truncate cursor-pointer hover:underline ${
                    tag ? '' : 'text-sandoro-secondary'
                  }`}
                  onClick={() => setEditingSessionId(session.id)}
                  title="Click to change tag"
                >
                  {tag?.name || 'No tag'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 ml-2">
              {isDeleting ? (
                <>
                  <button
                    onClick={() => {
                      onDelete(session.id);
                      setDeleteConfirmId(null);
                    }}
                    className="px-2 py-0.5 text-xs rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="px-2 py-0.5 text-xs rounded border border-sandoro-secondary hover:bg-sandoro-secondary/20 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditingSessionId(session.id)}
                    className={`px-2 py-0.5 text-xs rounded border border-sandoro-secondary hover:bg-sandoro-secondary/20 transition-colors ${
                      isRainbow ? 'hover:rainbow-gradient-bg hover:border-transparent' : ''
                    }`}
                    title="Change tag"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(session.id)}
                    className="px-2 py-0.5 text-xs rounded border border-red-400 text-red-400 hover:bg-red-400 hover:text-white transition-colors"
                    title="Delete session"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Stats() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<StatsView>('today');
  const [heatmapWeeks, setHeatmapWeeks] = useState<number>(12);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const { settings } = useSettings();
  const { accentColor, resolvedTheme } = useTheme();
  const isRainbow = accentColor === 'rainbow';
  const {
    sessions,
    getTodayStats,
    getWeekStats,
    getMonthStats,
    getDailyBreakdown,
    getHeatmapData,
    getStreak,
    exportToJSON,
    exportToCSV,
    getStatsByTag,
    deleteSession,
    updateSessionTag,
  } = useSessionStorage();
  const { tags, getTagById } = useTags();
  const { weekComparison, monthComparison } = useComparison();

  const handleExport = useCallback(
    (format: ExportFormat) => {
      const content = format === 'json' ? exportToJSON() : exportToCSV();
      const mimeType = format === 'json' ? 'application/json' : 'text/csv';
      const filename = `sandoro-sessions.${format}`;

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    [exportToJSON, exportToCSV]
  );

  const tagStats = getStatsByTag(30);

  // Convert tag stats to array for rendering
  const tagStatsArray = useMemo(() => {
    const result: Array<{
      tagId: string | undefined;
      tagName: string;
      totalSeconds: number;
      sessionsCount: number;
    }> = [];
    tagStats.forEach((stats, tagId) => {
      const tag = tagId ? getTagById(tagId) : undefined;
      result.push({
        tagId,
        tagName: tag?.name || 'No tag',
        totalSeconds: stats.totalSeconds,
        sessionsCount: stats.sessionsCount,
      });
    });
    // Sort by total seconds descending
    result.sort((a, b) => b.totalSeconds - a.totalSeconds);
    return result;
  }, [tagStats, getTagById]);

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
        title="Sign in to view stats"
        description="Track your focus sessions, view streaks, and analyze your productivity."
        features={[
          'Session history and daily breakdown',
          'Streak tracking',
          'Activity heatmap',
          'Export to JSON/CSV',
        ]}
      />
    );
  }

  const todayStats = getTodayStats();
  const weekStats = getWeekStats();
  const monthStats = getMonthStats();
  const heatmapData = getHeatmapData(heatmapWeeks);
  const streak = getStreak();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Statistics</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setIsShareModalOpen(true)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              isRainbow
                ? 'rainbow-gradient-bg text-white'
                : 'bg-sandoro-primary text-white hover:opacity-80'
            }`}
          >
            Share
          </button>
          <button
            onClick={() => handleExport('json')}
            className="px-2 py-1 text-xs border border-sandoro-secondary rounded hover:bg-sandoro-secondary/20 transition-colors"
          >
            JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="px-2 py-1 text-xs border border-sandoro-secondary rounded hover:bg-sandoro-secondary/20 transition-colors"
          >
            CSV
          </button>
        </div>
      </div>

      {/* Streak Display */}
      <div
        className="flex gap-4 p-3 rounded-lg border border-sandoro-secondary"
        style={{ backgroundColor: 'var(--sandoro-bg)' }}
      >
        <div className="flex-1 text-center">
          <div className={`text-2xl font-mono ${isRainbow ? 'rainbow-gradient' : 'text-sandoro-primary'}`}>
            {streak.current}
          </div>
          <div className="text-xs text-sandoro-secondary">Current Streak</div>
        </div>
        <div className="w-px bg-sandoro-secondary/30" />
        <div className="flex-1 text-center">
          <div className="text-2xl font-mono" style={{ color: 'var(--sandoro-fg)' }}>
            {streak.longest}
          </div>
          <div className="text-xs text-sandoro-secondary">Longest Streak</div>
        </div>
      </div>

      {/* Goal Progress */}
      <GoalProgress />

      {/* View Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('today')}
          className={`px-3 py-1 rounded text-sm ${
            view === 'today'
              ? isRainbow
                ? 'rainbow-gradient-bg'
                : 'bg-sandoro-primary text-white'
              : 'border border-sandoro-secondary'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setView('week')}
          className={`px-3 py-1 rounded text-sm ${
            view === 'week'
              ? isRainbow
                ? 'rainbow-gradient-bg'
                : 'bg-sandoro-primary text-white'
              : 'border border-sandoro-secondary'
          }`}
        >
          Week
        </button>
        <button
          onClick={() => setView('month')}
          className={`px-3 py-1 rounded text-sm ${
            view === 'month'
              ? isRainbow
                ? 'rainbow-gradient-bg'
                : 'bg-sandoro-primary text-white'
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

      {/* Period Comparison */}
      <div className="pt-4 border-t border-sandoro-secondary/30">
        <h3 className="text-sm font-semibold text-sandoro-secondary mb-3">Comparison</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ComparisonCard title="This Week vs Last Week" data={weekComparison} />
          <ComparisonCard title="This Month vs Last Month" data={monthComparison} />
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="pt-4 border-t border-sandoro-secondary/30">
        <Heatmap
          data={heatmapData}
          weeks={heatmapWeeks}
          onWeeksChange={setHeatmapWeeks}
        />
      </div>

      {/* Tag Stats */}
      {tagStatsArray.length > 0 && (
        <div className="pt-4 border-t border-sandoro-secondary/30">
          <h3 className="text-sm font-semibold text-sandoro-secondary mb-3">Stats by Tag (Last 30 days)</h3>
          <div
            className="p-4 rounded-lg border border-sandoro-secondary space-y-2"
            style={{ backgroundColor: 'var(--sandoro-bg)' }}
          >
            {tagStatsArray.map((stat) => (
              <div
                key={stat.tagId ?? 'no-tag'}
                className="flex justify-between items-center text-sm font-mono py-1 border-b border-sandoro-secondary/30 last:border-0"
              >
                <span className={stat.tagId ? '' : 'text-sandoro-secondary'}>
                  {stat.tagName}
                </span>
                <div className="flex gap-4">
                  <span>{formatDuration(stat.totalSeconds)}</span>
                  <span className="text-sandoro-secondary">{stat.sessionsCount} sessions</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session History */}
      <div className="pt-4 border-t border-sandoro-secondary/30">
        <h3 className="text-sm font-semibold text-sandoro-secondary mb-3">Recent Sessions</h3>
        <SessionHistory
          sessions={sessions}
          tags={tags}
          getTagById={getTagById}
          onUpdateTag={updateSessionTag}
          onDelete={deleteSession}
          isRainbow={isRainbow}
        />
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        data={{
          todayStats,
          weekStats,
          monthStats,
          streak,
          heatmapData: getHeatmapData(8),
        }}
        theme={{
          accentColor,
          resolvedTheme,
          icon: settings.icon,
        }}
      />
    </div>
  );
}
