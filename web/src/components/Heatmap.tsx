import { useMemo, useState } from 'react';
import { type DailyStats } from '../hooks/useSupabaseSession';
import { useTheme, AccentColor } from '../hooks/useTheme';

type WeekRange = number;

interface HeatmapProps {
  data: Map<string, DailyStats>;
  weeks?: WeekRange;
  onWeeksChange?: (weeks: WeekRange) => void;
}

// Activity levels based on work time
function getActivityLevel(totalSeconds: number): number {
  if (totalSeconds === 0) return 0;
  if (totalSeconds < 30 * 60) return 1; // < 30min
  if (totalSeconds < 60 * 60) return 2; // < 1h
  if (totalSeconds < 120 * 60) return 3; // < 2h
  return 4; // 2h+
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
}

// Accent color to RGB mapping (matching CSS values for dark mode)
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
  rainbow: [168, 85, 247], // Use purple as fallback for rainbow
};

// Get level colors based on accent color
function getLevelColors(accentColor: AccentColor): string[] {
  const [r, g, b] = ACCENT_RGB[accentColor] || ACCENT_RGB.cyan;

  return [
    'rgba(128, 128, 128, 0.15)', // 0: no activity - subtle gray
    `rgba(${r}, ${g}, ${b}, 0.3)`, // 1: low
    `rgba(${r}, ${g}, ${b}, 0.5)`, // 2: medium
    `rgba(${r}, ${g}, ${b}, 0.75)`, // 3: high
    `rgba(${r}, ${g}, ${b}, 1)`, // 4: very high
  ];
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEK_PRESETS = [4, 12, 24, 52];

// Tooltip component
function Tooltip({ day, position }: { day: DailyStats; position: { x: number; y: number } }) {
  return (
    <div
      className="fixed z-50 px-3 py-2 text-xs rounded-lg shadow-lg pointer-events-none"
      style={{
        left: position.x,
        top: position.y - 60,
        backgroundColor: 'var(--sandoro-bg)',
        border: '1px solid var(--sandoro-secondary)',
        transform: 'translateX(-50%)',
      }}
    >
      <div className="font-semibold text-sandoro-fg">{formatDate(day.date)}</div>
      <div className="text-sandoro-secondary mt-1">
        {day.totalWorkSeconds === 0 ? (
          <span>No activity</span>
        ) : (
          <>
            <span className="text-sandoro-primary">{formatDuration(day.totalWorkSeconds)}</span>
            <span className="mx-1">·</span>
            <span>{day.sessionsCompleted} session{day.sessionsCompleted !== 1 ? 's' : ''}</span>
          </>
        )}
      </div>
    </div>
  );
}

export function Heatmap({ data, weeks = 12, onWeeksChange }: HeatmapProps) {
  const { accentColor } = useTheme();
  const isRainbow = accentColor === 'rainbow';
  const [hoveredDay, setHoveredDay] = useState<{ day: DailyStats; position: { x: number; y: number } } | null>(null);
  const [customWeeks, setCustomWeeks] = useState<string>('');

  // Get level colors based on current accent color
  const levelColors = useMemo(() => getLevelColors(accentColor), [accentColor]);

  // Organize data into weeks (columns) and days (rows)
  const grid = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentDayOfWeek = today.getDay(); // 0 = Sunday

    // Helper to format date as YYYY-MM-DD in local timezone
    const formatDateStr = (d: Date): string => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = formatDateStr(today);

    // Calculate the start date (Sunday of the first week)
    // We want exactly `weeks` columns, with the last column containing today
    // Start from the Sunday of (weeks - 1) weeks ago
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - currentDayOfWeek - (weeks - 1) * 7);

    const result: (DailyStats | null)[][] = [];

    for (let week = 0; week < weeks; week++) {
      const weekData: (DailyStats | null)[] = [];
      for (let day = 0; day < 7; day++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + week * 7 + day);
        const dateStr = formatDateStr(date);

        // Don't show future dates
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
  }, [data, weeks]);

  // Generate month labels
  const monthLabels = useMemo(() => {
    const labels: { month: string; colStart: number }[] = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentDayOfWeek = today.getDay();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - currentDayOfWeek - (weeks - 1) * 7);

    let currentMonth = -1;
    for (let week = 0; week < weeks; week++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + week * 7);
      const month = date.getMonth();

      if (month !== currentMonth) {
        currentMonth = month;
        labels.push({
          month: date.toLocaleString('en', { month: 'short' }),
          colStart: week,
        });
      }
    }

    return labels;
  }, [weeks]);

  return (
    <div className="space-y-3">
      {/* Header with range selector */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm text-sandoro-secondary">Activity</h3>
        {onWeeksChange && (
          <div className="flex items-center gap-1">
            {WEEK_PRESETS.map((w) => (
              <button
                key={w}
                onClick={() => {
                  onWeeksChange(w);
                  setCustomWeeks('');
                }}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  weeks === w && !customWeeks
                    ? 'bg-sandoro-primary/20 text-sandoro-primary'
                    : 'text-sandoro-secondary hover:text-sandoro-fg'
                }`}
              >
                {w}w
              </button>
            ))}
            <span className="text-sandoro-secondary text-xs mx-1">|</span>
            <input
              type="number"
              min="1"
              max="520"
              placeholder="∞"
              value={customWeeks}
              onChange={(e) => {
                setCustomWeeks(e.target.value);
                const val = parseInt(e.target.value, 10);
                if (val > 0 && val <= 520) {
                  onWeeksChange(val);
                }
              }}
              className="w-12 px-1 py-0.5 text-xs rounded bg-transparent border border-sandoro-secondary/50 text-sandoro-fg text-center focus:outline-none focus:border-sandoro-primary"
            />
            <span className="text-sandoro-secondary text-xs">w</span>
          </div>
        )}
      </div>

      {/* Scrollable container */}
      <div className="overflow-x-auto pb-2">
        {/* Month labels */}
        <div className="flex text-xs text-sandoro-secondary ml-8 relative h-4 min-w-max">
          {monthLabels.map((label, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: `${label.colStart * 14}px`,
              }}
            >
              {label.month}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex min-w-max">
          {/* Day labels */}
          <div className="flex flex-col gap-[2px] mr-2 text-xs text-sandoro-secondary sticky left-0 z-10" style={{ backgroundColor: 'var(--sandoro-bg)' }}>
            {DAY_LABELS.map((day) => (
              <div key={day} className="h-[12px] flex items-center text-[10px]">
                {day}
              </div>
            ))}
          </div>

          {/* Heatmap cells */}
          <div className="flex gap-[2px]">
            {grid.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-[2px]">
                {week.map((day, dayIdx) => {
                  if (day === null) {
                    return <div key={dayIdx} className="w-[12px] h-[12px]" />;
                  }

                  const level = getActivityLevel(day.totalWorkSeconds);
                  const rainbowClass = isRainbow ? `rainbow-heatmap-${level}` : '';
                  return (
                    <div
                      key={dayIdx}
                      className={`w-[12px] h-[12px] rounded-sm cursor-pointer transition-all duration-150 hover:scale-125 hover:ring-2 hover:ring-sandoro-primary hover:ring-offset-1 ${rainbowClass}`}
                      style={{
                        backgroundColor: isRainbow ? undefined : levelColors[level],
                        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
                      }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredDay({
                          day,
                          position: { x: rect.left + rect.width / 2, y: rect.top },
                        });
                      }}
                      onMouseLeave={() => setHoveredDay(null)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDay && <Tooltip day={hoveredDay.day} position={hoveredDay.position} />}

      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-sandoro-secondary">
        <span>Less</span>
        {levelColors.map((color, i) => {
          const rainbowClass = isRainbow ? `rainbow-heatmap-${i}` : '';
          return (
            <div
              key={i}
              className={`w-[12px] h-[12px] rounded-sm ${rainbowClass}`}
              style={{
                backgroundColor: isRainbow ? undefined : color,
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
              }}
            />
          );
        })}
        <span>More</span>
      </div>
    </div>
  );
}

export type { WeekRange };
