import { forwardRef, useMemo } from 'react';
import { DailyStats, StreakInfo } from '../hooks/useSessionStorage';
import { AccentColor, ACCENT_COLORS } from '../hooks/useTheme';
import { IconType } from '../hooks/useSettings';

export interface ShareCardData {
  todayStats: DailyStats;
  weekStats: DailyStats;
  monthStats: DailyStats;
  streak: StreakInfo;
  heatmapData?: Map<string, DailyStats>;
}

export interface ShareCardTheme {
  accentColor: AccentColor;
  resolvedTheme: 'light' | 'dark';
  icon: IconType;
}

interface ShareCardProps {
  data: ShareCardData;
  theme?: ShareCardTheme;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Get icon emoji based on IconType
function getIconEmoji(icon: IconType): string {
  switch (icon) {
    case 'tomato':
      return '🍅';
    case 'coffee':
      return '☕';
    case 'hourglass':
      return '⏳';
    case 'progress':
      return '▓';
    default:
      return '🍅';
  }
}

// Get activity level for heatmap
function getActivityLevel(totalSeconds: number): number {
  if (totalSeconds === 0) return 0;
  if (totalSeconds < 30 * 60) return 1;
  if (totalSeconds < 60 * 60) return 2;
  if (totalSeconds < 120 * 60) return 3;
  return 4;
}

// Accent color RGB values
const ACCENT_RGB: Record<AccentColor, [number, number, number]> = {
  red: [239, 68, 68],
  orange: [249, 115, 22],
  yellow: [234, 179, 8],
  green: [34, 197, 94],
  blue: [59, 130, 246],
  indigo: [99, 102, 241],
  purple: [168, 85, 247],
  cyan: [34, 211, 238],
  pink: [236, 72, 153],
  rainbow: [168, 85, 247],
};

// Get color hex from accent color
function getAccentHex(accentColor: AccentColor): string {
  const found = ACCENT_COLORS.find((c) => c.value === accentColor);
  return found?.color || '#22d3ee';
}

// Mini heatmap component for share card
function MiniHeatmap({
  data,
  accentColor,
  isDark,
}: {
  data: Map<string, DailyStats>;
  accentColor: AccentColor;
  isDark: boolean;
}) {
  const [r, g, b] = ACCENT_RGB[accentColor] || ACCENT_RGB.cyan;

  // Get level colors
  const levelColors = [
    isDark ? 'rgba(128, 128, 128, 0.15)' : 'rgba(128, 128, 128, 0.1)',
    `rgba(${r}, ${g}, ${b}, 0.3)`,
    `rgba(${r}, ${g}, ${b}, 0.5)`,
    `rgba(${r}, ${g}, ${b}, 0.75)`,
    `rgba(${r}, ${g}, ${b}, 1)`,
  ];

  // Generate 8 weeks of data (56 days)
  const grid = useMemo(() => {
    const weeks = 8;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentDayOfWeek = today.getDay();

    const formatDateStr = (d: Date): string => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = formatDateStr(today);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - currentDayOfWeek - (weeks - 1) * 7);

    const result: (DailyStats | null)[][] = [];

    for (let week = 0; week < weeks; week++) {
      const weekData: (DailyStats | null)[] = [];
      for (let day = 0; day < 7; day++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + week * 7 + day);
        const dateStr = formatDateStr(date);

        if (dateStr > todayStr) {
          weekData.push(null);
        } else {
          weekData.push(
            data.get(dateStr) || {
              date: dateStr,
              totalWorkSeconds: 0,
              sessionsCompleted: 0,
            }
          );
        }
      }
      result.push(weekData);
    }

    return result;
  }, [data]);

  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {grid.map((week, weekIdx) => (
        <div key={weekIdx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {week.map((day, dayIdx) => {
            if (day === null) {
              return <div key={dayIdx} style={{ width: '8px', height: '8px' }} />;
            }
            const level = getActivityLevel(day.totalWorkSeconds);
            return (
              <div
                key={dayIdx}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '2px',
                  backgroundColor: levelColors[level],
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  function ShareCard({ data, theme }, ref) {
    const { todayStats, weekStats, monthStats, streak, heatmapData } = data;

    // Default theme values
    const accentColor = theme?.accentColor || 'cyan';
    const isDark = theme?.resolvedTheme !== 'light';
    const icon = theme?.icon || 'tomato';

    // Theme-based colors
    const accentHex = getAccentHex(accentColor);
    const isRainbow = accentColor === 'rainbow';

    // Background gradient based on theme
    const bgGradient = isDark
      ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
      : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)';

    const textColor = isDark ? '#e8e8e8' : '#1e293b';
    const secondaryTextColor = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
    const cardBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    // Rainbow gradient for text
    const rainbowGradient =
      'linear-gradient(135deg, #00bfff, #8000ff, #ff00ff, #ff0000, #ffff00, #00ff00, #00ffff)';

    return (
      <div
        ref={ref}
        className="w-[600px] p-8 rounded-2xl"
        style={{
          background: bgGradient,
          color: textColor,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="text-3xl">{getIconEmoji(icon)}</div>
          <div>
            <h1
              className="text-2xl font-bold tracking-tight"
              style={
                isRainbow
                  ? {
                      background: rainbowGradient,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }
                  : { color: accentHex }
              }
            >
              Sandoro
            </h1>
            <p className="text-sm" style={{ color: secondaryTextColor }}>
              Pomodoro Focus Stats
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Today */}
          <div className="p-4 rounded-xl" style={{ background: cardBg }}>
            <div className="text-sm mb-1" style={{ color: secondaryTextColor }}>
              Today
            </div>
            <div
              className="text-2xl font-bold"
              style={
                isRainbow
                  ? {
                      background: rainbowGradient,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }
                  : { color: accentHex }
              }
            >
              {formatDuration(todayStats.totalWorkSeconds)}
            </div>
            <div className="text-sm" style={{ color: secondaryTextColor }}>
              {todayStats.sessionsCompleted} sessions
            </div>
          </div>

          {/* This Week */}
          <div className="p-4 rounded-xl" style={{ background: cardBg }}>
            <div className="text-sm mb-1" style={{ color: secondaryTextColor }}>
              This Week
            </div>
            <div className="text-2xl font-bold" style={{ color: isDark ? '#60a5fa' : '#3b82f6' }}>
              {formatDuration(weekStats.totalWorkSeconds)}
            </div>
            <div className="text-sm" style={{ color: secondaryTextColor }}>
              {weekStats.sessionsCompleted} sessions
            </div>
          </div>

          {/* This Month */}
          <div className="p-4 rounded-xl" style={{ background: cardBg }}>
            <div className="text-sm mb-1" style={{ color: secondaryTextColor }}>
              This Month
            </div>
            <div className="text-2xl font-bold" style={{ color: isDark ? '#a78bfa' : '#8b5cf6' }}>
              {formatDuration(monthStats.totalWorkSeconds)}
            </div>
            <div className="text-sm" style={{ color: secondaryTextColor }}>
              {monthStats.sessionsCompleted} sessions
            </div>
          </div>

          {/* Streak */}
          <div className="p-4 rounded-xl" style={{ background: cardBg }}>
            <div className="text-sm mb-1" style={{ color: secondaryTextColor }}>
              Streak
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className="text-2xl font-bold"
                style={{ color: isDark ? '#f97316' : '#ea580c' }}
              >
                {streak.current}
              </span>
              <span className="text-sm" style={{ color: secondaryTextColor }}>
                days
              </span>
            </div>
            <div className="text-sm" style={{ color: secondaryTextColor }}>
              Best: {streak.longest} days
            </div>
          </div>
        </div>

        {/* Heatmap Section */}
        {heatmapData && heatmapData.size > 0 && (
          <div
            className="mb-6 p-4 rounded-xl"
            style={{ background: cardBg }}
          >
            <div className="text-sm mb-3" style={{ color: secondaryTextColor }}>
              Activity (Last 8 weeks)
            </div>
            <MiniHeatmap data={heatmapData} accentColor={accentColor} isDark={isDark} />
          </div>
        )}

        {/* Footer */}
        <div
          className="flex justify-between items-center pt-4"
          style={{ borderTop: `1px solid ${borderColor}` }}
        >
          <div className="text-sm" style={{ color: secondaryTextColor, opacity: 0.7 }}>
            {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </div>
          <div
            className="text-sm"
            style={
              isRainbow
                ? {
                    background: rainbowGradient,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    opacity: 0.7,
                  }
                : { color: accentHex, opacity: 0.7 }
            }
          >
            sandoro.vercel.app
          </div>
        </div>
      </div>
    );
  }
);
