//! sandoro - Terminal-first Pomodoro timer with ASCII art animations
//!
//! A pomodoro timer featuring hourglass animations and customizable themes.

use anyhow::Result;
use clap::{Parser, Subcommand};

mod app;
mod config;
mod db;
mod icons;
mod messages;
mod notification;

use config::Config;
use db::DailyStats;
mod theme;
mod timer;
mod ui;

#[derive(Parser)]
#[command(name = "sandoro")]
#[command(author, version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// Start a pomodoro session
    Start {
        /// Work duration in minutes (default: 25)
        #[arg(short, long, default_value = "25")]
        work: u32,

        /// Short break duration in minutes (default: 5)
        #[arg(short, long, default_value = "5")]
        short_break: u32,

        /// Long break duration in minutes (default: 15)
        #[arg(short, long, default_value = "15")]
        long_break: u32,
    },
    /// Show statistics
    Stats {
        /// Show daily stats
        #[arg(short, long)]
        day: bool,

        /// Show weekly stats
        #[arg(short, long)]
        week: bool,

        /// Show monthly stats
        #[arg(short, long)]
        month: bool,

        /// Show stats for a specific date (YYYY-MM-DD)
        #[arg(long)]
        date: Option<String>,

        /// Number of weeks to show in heatmap (default: 12)
        #[arg(long, default_value = "12")]
        weeks: i32,

        /// Interactive heatmap navigation mode
        #[arg(short, long)]
        interactive: bool,

        /// Export sessions to file (json or csv)
        #[arg(long, value_name = "FORMAT")]
        export: Option<String>,

        /// Show comparison with previous period
        #[arg(short = 'c', long)]
        compare: bool,

        /// Show goal progress
        #[arg(short = 'g', long)]
        goals: bool,

        /// Show stats grouped by tag
        #[arg(short = 't', long)]
        by_tag: bool,
    },
}

fn format_duration(seconds: i32) -> String {
    let hours = seconds / 3600;
    let minutes = (seconds % 3600) / 60;
    if hours > 0 {
        format!("{}h {}m", hours, minutes)
    } else {
        format!("{}m", minutes)
    }
}

/// Get activity level for heatmap display (0-4)
fn get_activity_level(total_seconds: i32) -> usize {
    if total_seconds == 0 {
        0
    } else if total_seconds < 30 * 60 {
        1 // < 30min
    } else if total_seconds < 60 * 60 {
        2 // < 1h
    } else if total_seconds < 120 * 60 {
        3 // < 2h
    } else {
        4 // 2h+
    }
}

/// Get ANSI color code for accent color at specified opacity level
fn get_accent_ansi(accent: &str, level: usize) -> String {
    use crate::theme::ThemeColor;

    if level == 0 {
        // Gray for no activity
        return "\x1b[38;2;100;100;100m".to_string();
    }

    // For rainbow mode, use different rainbow colors based on level
    if accent == "rainbow" {
        // Map levels 1-4 to different rainbow colors for visual variety
        let (r, g, b) = match level {
            1 => (0, 200, 200), // Cyan (low activity)
            2 => (0, 200, 0),   // Green (medium activity)
            3 => (200, 200, 0), // Yellow (high activity)
            _ => (255, 0, 128), // Pink/Magenta (very high activity)
        };
        return format!("\x1b[38;2;{};{};{}m", r, g, b);
    }

    let color = ThemeColor::from_accent_name(accent);
    let (r, g, b) = match color {
        ThemeColor::Rgb { r, g, b } => (r, g, b),
        ThemeColor::Named(_) => (34, 211, 238), // Default cyan
    };

    // Scale opacity based on level (1-4)
    let opacity = match level {
        1 => 0.4,
        2 => 0.6,
        3 => 0.8,
        _ => 1.0,
    };

    let r = (r as f32 * opacity) as u8;
    let g = (g as f32 * opacity) as u8;
    let b = (b as f32 * opacity) as u8;

    format!("\x1b[38;2;{};{};{}m", r, g, b)
}

/// Get ANSI color code for rainbow heatmap based on activity level
/// Each level gets a distinct, vibrant rainbow color (like the web version)
fn get_rainbow_heatmap_ansi(level: usize) -> String {
    if level == 0 {
        // Dim gray for no activity
        return "\x1b[38;2;60;60;60m".to_string();
    }

    // Assign distinct, vibrant rainbow colors to each activity level
    // Web version uses animated gradient per cell; we use distinct colors per level
    let (r, g, b) = match level {
        1 => (80, 200, 220), // Cyan (low activity)
        2 => (80, 220, 120), // Green (medium)
        3 => (255, 200, 60), // Yellow-orange (high)
        _ => (255, 80, 180), // Magenta-pink (very high)
    };

    format!("\x1b[38;2;{};{};{}m", r, g, b)
}

/// Display heatmap using Unicode block characters with accent color
fn show_heatmap(db: &db::Database, weeks: i32) -> Result<()> {
    use chrono::{Datelike, NaiveDate};

    let config = Config::load().unwrap_or_default();
    let accent = &config.appearance.accent;

    let data = db.get_heatmap_data(weeks)?;
    if data.is_empty() {
        return Ok(());
    }

    // Unicode block character
    let block = '█';

    println!("  Activity (last {} weeks)", weeks);
    println!();

    // Parse dates and organize into weeks
    let parsed: Vec<(NaiveDate, i32)> = data
        .iter()
        .filter_map(|s| {
            NaiveDate::parse_from_str(&s.date, "%Y-%m-%d")
                .ok()
                .map(|d| (d, s.total_work_seconds))
        })
        .collect();

    if parsed.is_empty() {
        return Ok(());
    }

    // Day labels (show Mon, Wed, Fri)
    let day_labels = ["S", "M", "T", "W", "T", "F", "S"];

    // Group by weeks (columns)
    let mut week_columns: Vec<Vec<(u32, i32)>> = Vec::new(); // (day_of_week, seconds)
    let mut current_week: Vec<(u32, i32)> = Vec::new();
    let mut last_week_num = None;

    for (date, seconds) in &parsed {
        let week_num = date.iso_week().week();
        let day_of_week = date.weekday().num_days_from_sunday();

        if last_week_num.is_some() && last_week_num != Some(week_num) && !current_week.is_empty() {
            week_columns.push(current_week.clone());
            current_week.clear();
        }
        current_week.push((day_of_week, *seconds));
        last_week_num = Some(week_num);
    }
    if !current_week.is_empty() {
        week_columns.push(current_week);
    }

    let is_rainbow = accent == "rainbow";

    // Print heatmap rows (one per day of week)
    for day in 0..7 {
        // Day label
        print!("  {} ", day_labels[day as usize]);

        // Print blocks for each week
        for week in week_columns.iter() {
            let seconds = week
                .iter()
                .find(|(d, _)| *d == day)
                .map(|(_, s)| *s)
                .unwrap_or(-1); // -1 means no data for this day

            if seconds < 0 {
                print!(" "); // No data (future or before start)
            } else {
                let level = get_activity_level(seconds);
                let color = if is_rainbow {
                    get_rainbow_heatmap_ansi(level)
                } else {
                    get_accent_ansi(accent, level)
                };
                print!("{}{}\x1b[0m", color, block);
            }
        }
        println!();
    }

    println!();

    // Legend with colors
    print!("     Less ");
    for level in 0..=4 {
        let color = if is_rainbow {
            get_rainbow_heatmap_ansi(level)
        } else {
            get_accent_ansi(accent, level)
        };
        print!("{}{}\x1b[0m ", color, block);
    }
    println!("More");
    println!();

    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn show_stats(
    _day: bool,
    week: bool,
    month: bool,
    date: Option<String>,
    weeks: i32,
    interactive: bool,
    export: Option<String>,
    compare: bool,
    goals: bool,
    by_tag: bool,
) -> Result<()> {
    let db = db::Database::open()?;
    let config = Config::load().unwrap_or_default();

    // Handle export
    if let Some(format) = export {
        let content = match format.to_lowercase().as_str() {
            "json" => db.export_to_json()?,
            "csv" => db.export_to_csv()?,
            _ => {
                println!(
                    "Error: Unknown export format '{}'. Use 'json' or 'csv'.",
                    format
                );
                return Ok(());
            }
        };
        let filename = format!("sandoro-sessions.{}", format.to_lowercase());
        std::fs::write(&filename, content)?;
        println!("Exported sessions to: {}", filename);
        return Ok(());
    }

    println!();
    println!("  📊 sandoro Statistics");
    println!("  ─────────────────────");
    println!();

    // Show streak info
    let streak = db.get_streak()?;
    println!(
        "  🔥 Streak:  {} days (longest: {} days)",
        streak.current, streak.longest
    );
    println!();

    if let Some(date_str) = date {
        // Specific date stats
        let stats = db.get_date_stats(&date_str)?;
        println!("  📅 {}", stats.date);
        println!(
            "     Total time:  {}",
            format_duration(stats.total_work_seconds)
        );
        println!("     Sessions:    {}", stats.sessions_completed);
    } else if month {
        // Monthly stats (last 30 days)
        let stats = db.get_month_stats()?;
        println!("  📅 Last 30 Days");
        println!(
            "     Total time:  {}",
            format_duration(stats.total_work_seconds)
        );
        println!("     Sessions:    {}", stats.sessions_completed);
        println!();

        // Daily breakdown
        let daily = db.get_daily_stats(30)?;
        if !daily.is_empty() {
            println!("  Daily breakdown:");
            for s in daily.iter().take(10) {
                println!(
                    "     {} │ {} │ {} sessions",
                    s.date,
                    format_duration(s.total_work_seconds),
                    s.sessions_completed
                );
            }
            if daily.len() > 10 {
                println!("     ... and {} more days", daily.len() - 10);
            }
        }
    } else if week {
        // Weekly stats (last 7 days)
        let stats = db.get_week_stats()?;
        println!("  📅 Last 7 Days");
        println!(
            "     Total time:  {}",
            format_duration(stats.total_work_seconds)
        );
        println!("     Sessions:    {}", stats.sessions_completed);
        println!();

        // Daily breakdown
        let daily = db.get_daily_stats(7)?;
        if !daily.is_empty() {
            println!("  Daily breakdown:");
            for s in &daily {
                println!(
                    "     {} │ {} │ {} sessions",
                    s.date,
                    format_duration(s.total_work_seconds),
                    s.sessions_completed
                );
            }
        }
    } else {
        // Default: Today's stats (day flag or no flag)
        let stats = db.get_today_stats()?;
        println!("  📅 Today ({})", stats.date);
        println!(
            "     Total time:  {}",
            format_duration(stats.total_work_seconds)
        );
        println!("     Sessions:    {}", stats.sessions_completed);
    }

    // Show goal progress if requested or if goals are set
    if goals || has_goals_enabled(&config) {
        println!();
        show_goal_progress(&db, &config)?;
    }

    // Show comparison if requested
    if compare {
        println!();
        show_comparison(&db)?;
    }

    println!();

    // Show heatmap
    if interactive {
        run_interactive_heatmap(&db, weeks)?;
    } else {
        show_heatmap(&db, weeks)?;
    }

    // Show tag-based statistics
    if by_tag {
        println!();
        println!("  🏷️  Stats by Tag (Last 30 days)");
        println!("  ─────────────────────────────");

        let tag_stats = db.get_stats_by_tag(30)?;
        if tag_stats.is_empty() {
            println!("     No data found for the last 30 days.");
        } else {
            for (tag, total_seconds, sessions) in tag_stats {
                let tag_name = match &tag {
                    Some(t) => &t.name,
                    None => "No tag",
                };
                println!(
                    "     {} │ {} │ {} sessions",
                    tag_name,
                    format_duration(total_seconds),
                    sessions
                );
            }
        }
    }

    Ok(())
}

/// Check if any goals are enabled
fn has_goals_enabled(config: &Config) -> bool {
    config.goals.daily_sessions > 0
        || config.goals.daily_minutes > 0
        || config.goals.weekly_sessions > 0
        || config.goals.weekly_minutes > 0
}

/// Calculate percentage change
fn calculate_change(current: i32, previous: i32) -> String {
    if previous == 0 {
        if current > 0 {
            "↑ +100%".to_string()
        } else {
            "→ 0%".to_string()
        }
    } else {
        let change = ((current - previous) as f64 / previous as f64 * 100.0).round() as i32;
        if change > 0 {
            format!("↑ +{}%", change)
        } else if change < 0 {
            format!("↓ {}%", change)
        } else {
            "→ 0%".to_string()
        }
    }
}

/// Show goal progress
fn show_goal_progress(db: &db::Database, config: &Config) -> Result<()> {
    let today_stats = db.get_today_stats()?;
    let week_stats = db.get_week_stats()?;
    let is_rainbow = config.appearance.accent == "rainbow";

    println!("  🎯 Goals");
    println!("  ────────");

    let has_daily_goals = config.goals.daily_sessions > 0 || config.goals.daily_minutes > 0;
    let has_weekly_goals = config.goals.weekly_sessions > 0 || config.goals.weekly_minutes > 0;

    if !has_daily_goals && !has_weekly_goals {
        println!("     No goals set. Configure goals in settings.");
        return Ok(());
    }

    if has_daily_goals {
        println!();
        println!("  📅 Daily");

        if config.goals.daily_sessions > 0 {
            let progress = (today_stats.sessions_completed as f64
                / config.goals.daily_sessions as f64
                * 100.0)
                .min(100.0) as u32;
            let bar = if is_rainbow && progress < 100 {
                create_rainbow_progress_bar(progress, 20)
            } else {
                create_progress_bar(progress, 20)
            };
            let check = if progress >= 100 { "✓" } else { " " };
            println!(
                "     Sessions: {} {}/{} [{}] {}%",
                check, today_stats.sessions_completed, config.goals.daily_sessions, bar, progress
            );
        }

        if config.goals.daily_minutes > 0 {
            let today_minutes = today_stats.total_work_seconds / 60;
            let progress = (today_minutes as f64 / config.goals.daily_minutes as f64 * 100.0)
                .min(100.0) as u32;
            let bar = if is_rainbow && progress < 100 {
                create_rainbow_progress_bar(progress, 20)
            } else {
                create_progress_bar(progress, 20)
            };
            let check = if progress >= 100 { "✓" } else { " " };
            println!(
                "     Minutes:  {} {}/{} [{}] {}%",
                check, today_minutes, config.goals.daily_minutes, bar, progress
            );
        }
    }

    if has_weekly_goals {
        println!();
        println!("  📅 Weekly");

        if config.goals.weekly_sessions > 0 {
            let progress = (week_stats.sessions_completed as f64
                / config.goals.weekly_sessions as f64
                * 100.0)
                .min(100.0) as u32;
            let bar = if is_rainbow && progress < 100 {
                create_rainbow_progress_bar(progress, 20)
            } else {
                create_progress_bar(progress, 20)
            };
            let check = if progress >= 100 { "✓" } else { " " };
            println!(
                "     Sessions: {} {}/{} [{}] {}%",
                check, week_stats.sessions_completed, config.goals.weekly_sessions, bar, progress
            );
        }

        if config.goals.weekly_minutes > 0 {
            let week_minutes = week_stats.total_work_seconds / 60;
            let progress = (week_minutes as f64 / config.goals.weekly_minutes as f64 * 100.0)
                .min(100.0) as u32;
            let bar = if is_rainbow && progress < 100 {
                create_rainbow_progress_bar(progress, 20)
            } else {
                create_progress_bar(progress, 20)
            };
            let check = if progress >= 100 { "✓" } else { " " };
            println!(
                "     Minutes:  {} {}/{} [{}] {}%",
                check, week_minutes, config.goals.weekly_minutes, bar, progress
            );
        }
    }

    Ok(())
}

/// Create an ASCII progress bar
fn create_progress_bar(percent: u32, width: usize) -> String {
    let filled = (percent as usize * width / 100).min(width);
    let empty = width - filled;
    format!("{}{}", "█".repeat(filled), "░".repeat(empty))
}

/// Create an ASCII progress bar with rainbow colors
fn create_rainbow_progress_bar(percent: u32, width: usize) -> String {
    let filled = (percent as usize * width / 100).min(width);
    let empty = width - filled;

    // Rainbow colors for the filled portion
    let rainbow_colors = [
        (255, 0, 0),   // Red
        (255, 127, 0), // Orange
        (255, 255, 0), // Yellow
        (0, 255, 0),   // Green
        (0, 255, 255), // Cyan
        (0, 0, 255),   // Blue
        (128, 0, 255), // Purple
    ];

    let mut result = String::new();
    for i in 0..filled {
        let color_idx = (i * rainbow_colors.len() / width.max(1)) % rainbow_colors.len();
        let (r, g, b) = rainbow_colors[color_idx];
        result.push_str(&format!("\x1b[38;2;{};{};{}m█\x1b[0m", r, g, b));
    }
    result.push_str(&"░".repeat(empty));
    result
}

/// Show comparison with previous period
fn show_comparison(db: &db::Database) -> Result<()> {
    println!("  📈 Comparison");
    println!("  ─────────────");
    println!();

    // This week vs last week
    let this_week = db.get_week_stats()?;
    let last_week = db.get_previous_week_stats()?;

    println!("  📅 This Week vs Last Week");
    println!(
        "     Time:     {} vs {} ({})",
        format_duration(this_week.total_work_seconds),
        format_duration(last_week.total_work_seconds),
        calculate_change(this_week.total_work_seconds, last_week.total_work_seconds)
    );
    println!(
        "     Sessions: {} vs {} ({})",
        this_week.sessions_completed,
        last_week.sessions_completed,
        calculate_change(this_week.sessions_completed, last_week.sessions_completed)
    );

    println!();

    // This month vs last month
    let this_month = db.get_month_stats()?;
    let last_month = db.get_previous_month_stats()?;

    println!("  📅 This Month vs Last Month");
    println!(
        "     Time:     {} vs {} ({})",
        format_duration(this_month.total_work_seconds),
        format_duration(last_month.total_work_seconds),
        calculate_change(this_month.total_work_seconds, last_month.total_work_seconds)
    );
    println!(
        "     Sessions: {} vs {} ({})",
        this_month.sessions_completed,
        last_month.sessions_completed,
        calculate_change(this_month.sessions_completed, last_month.sessions_completed)
    );

    Ok(())
}

/// Interactive heatmap navigation using arrow keys
#[allow(clippy::type_complexity)]
fn run_interactive_heatmap(db: &db::Database, initial_weeks: i32) -> Result<()> {
    use chrono::{Datelike, Duration, Local, NaiveDate};
    use crossterm::{
        cursor,
        event::{self, Event, KeyCode, KeyEvent},
        execute,
        terminal::{self, ClearType, EnterAlternateScreen, LeaveAlternateScreen},
    };
    use std::collections::HashMap;
    use std::io::{stdout, Write};

    // Get accent color from config
    let config = Config::load().unwrap_or_default();
    let accent = config.appearance.accent.clone();

    // Enable raw mode and alternate screen for clean rendering
    let mut stdout = stdout();
    terminal::enable_raw_mode()?;
    execute!(stdout, EnterAlternateScreen, cursor::Hide)?;

    // Get terminal width and calculate displayable weeks in viewport
    // Each week cell takes 3 chars, plus day label (6 chars) and separator (2 chars)
    let (term_width, _) = terminal::size().unwrap_or((80, 24));
    let prefix_width = 8; // "  Sun │" = 8 chars
    let chars_per_week = 3; // " █ " = 3 chars
    let viewport_weeks = ((term_width as i32 - prefix_width) / chars_per_week).max(4) as usize;

    // Current week range (can be changed with +/-)
    let mut weeks = initial_weeks;

    // Unicode block character (we'll use color instead of different characters)
    let block = '█';
    let day_labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // ANSI colors - use accent color
    let accent_color = get_accent_ansi(&accent, 4); // Full accent color
    let dim = "\x1b[2m";
    let reset = "\x1b[0m";
    let bold = "\x1b[1m";
    // Selection background using accent color
    let bg_accent = format!(
        "\x1b[48;2;{};{};{}m\x1b[30m",
        theme::ThemeColor::from_accent_name(&accent).to_rgb().0,
        theme::ThemeColor::from_accent_name(&accent).to_rgb().1,
        theme::ThemeColor::from_accent_name(&accent).to_rgb().2,
    );

    // Build the grid properly aligned to weekdays (like Web version)
    let build_grid =
        |weeks: i32, db: &db::Database| -> Result<(Vec<Vec<Option<DailyStats>>>, usize, usize)> {
            let data = db.get_heatmap_data(weeks)?;

            // Build a date -> stats map for quick lookup
            let stats_map: HashMap<String, &DailyStats> =
                data.iter().map(|s| (s.date.clone(), s)).collect();

            let today = Local::now().date_naive();
            let today_str = today.format("%Y-%m-%d").to_string();
            let current_day_of_week = today.weekday().num_days_from_sunday() as usize;

            // Calculate grid start (Sunday of the first week)
            // We want exactly `weeks` columns, with the last column containing today
            // Start from the Sunday of (weeks - 1) weeks ago
            let start_date = today
                - Duration::days(current_day_of_week as i64)
                - Duration::days((weeks as i64 - 1) * 7);

            // Build grid[week][day] structure
            let mut grid: Vec<Vec<Option<DailyStats>>> = Vec::new();
            let num_weeks = weeks as usize;

            for week in 0..num_weeks {
                let mut week_data: Vec<Option<DailyStats>> = Vec::new();
                for day in 0..7usize {
                    let date = start_date + Duration::days((week * 7 + day) as i64);
                    let date_str = date.format("%Y-%m-%d").to_string();

                    // Don't show future dates
                    if date_str > today_str {
                        week_data.push(None);
                    } else if let Some(stats) = stats_map.get(&date_str) {
                        week_data.push(Some((*stats).clone()));
                    } else {
                        // Date exists but no data - show as 0 activity
                        week_data.push(Some(DailyStats {
                            date: date_str,
                            total_work_seconds: 0,
                            sessions_completed: 0,
                            longest_streak: 0,
                        }));
                    }
                }
                grid.push(week_data);
            }

            // Initial selection: last week, current day of week
            let initial_week = num_weeks.saturating_sub(1);
            let initial_day = current_day_of_week;

            Ok((grid, initial_week, initial_day))
        };

    let (mut grid, mut selected_week, mut selected_day) = build_grid(weeks, db)?;
    let mut num_weeks = grid.len();

    // Month labels for each week column
    let month_names = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    // Generate month labels for each week
    let build_month_labels = |grid: &[Vec<Option<DailyStats>>]| -> Vec<Option<&'static str>> {
        let mut labels: Vec<Option<&'static str>> = Vec::new();
        let mut last_month: Option<u32> = None;

        for week_data in grid.iter() {
            // Get the first day (Sunday) of each week
            if let Some(Some(day_data)) = week_data.first() {
                if let Ok(date) = NaiveDate::parse_from_str(&day_data.date, "%Y-%m-%d") {
                    let month = date.month();
                    if last_month != Some(month) {
                        labels.push(Some(month_names[(month - 1) as usize]));
                        last_month = Some(month);
                    } else {
                        labels.push(None);
                    }
                } else {
                    labels.push(None);
                }
            } else {
                labels.push(None);
            }
        }
        labels
    };

    let mut month_labels = build_month_labels(&grid);

    loop {
        // Move cursor to top and clear screen
        execute!(
            stdout,
            cursor::MoveTo(0, 0),
            terminal::Clear(ClearType::All)
        )?;

        // Calculate viewport range (scroll to keep selected week visible)
        let scroll_offset = if num_weeks <= viewport_weeks || selected_week < viewport_weeks / 2 {
            0
        } else if selected_week > num_weeks - viewport_weeks / 2 {
            num_weeks - viewport_weeks
        } else {
            selected_week - viewport_weeks / 2
        };
        let visible_start = scroll_offset;
        let visible_end = (scroll_offset + viewport_weeks).min(num_weeks);

        // Header
        write!(
            stdout,
            "\r\n  {}Activity{} ({} weeks)\r\n",
            bold, reset, weeks
        )?;
        write!(
            stdout,
            "  {}←↑↓→/hjkl: move  +/-: weeks  q: quit{}\r\n\r\n",
            dim, reset
        )?;

        // Month labels row
        write!(stdout, "       ")?; // Align with day labels
        for week in visible_start..visible_end {
            if let Some(Some(label)) = month_labels.get(week) {
                write!(stdout, "{}{}{}", dim, label, reset)?;
            } else {
                write!(stdout, "   ")?;
            }
        }
        write!(stdout, "\r\n")?;

        let is_rainbow = accent == "rainbow";

        // Draw heatmap with grid (only visible portion)
        for (day, day_label) in day_labels.iter().enumerate() {
            // Day label
            if day == selected_day {
                write!(stdout, "  {}{}{} │", accent_color, day_label, reset)?;
            } else {
                write!(stdout, "  {}{}{} │", dim, day_label, reset)?;
            }

            for week in visible_start..visible_end {
                if let Some(Some(day_data)) = grid.get(week).and_then(|w| w.get(day)) {
                    let level = get_activity_level(day_data.total_work_seconds);
                    let color = if is_rainbow {
                        get_rainbow_heatmap_ansi(level)
                    } else {
                        get_accent_ansi(&accent, level)
                    };

                    if week == selected_week && day == selected_day {
                        // Selected: accent background
                        write!(stdout, "{}[{}]{}", bg_accent, block, reset)?;
                    } else {
                        // Normal: show colored block with spacing
                        write!(stdout, " {}{}{} ", color, block, reset)?;
                    }
                } else {
                    // Future date or no data
                    write!(stdout, "   ")?;
                }
            }
            write!(stdout, "\r\n")?;
        }

        // Scroll indicator if needed
        if num_weeks > viewport_weeks {
            write!(
                stdout,
                "  {}[{}/{}]{}\r\n",
                dim,
                selected_week + 1,
                num_weeks,
                reset
            )?;
        }

        // Legend with colors
        write!(stdout, "\r\n       Less ")?;
        for level in 0..=4 {
            let color = if is_rainbow {
                get_rainbow_heatmap_ansi(level)
            } else {
                get_accent_ansi(&accent, level)
            };
            write!(stdout, "{}{}{} ", color, block, reset)?;
        }
        write!(stdout, "More\r\n\r\n")?;

        // Selected date info box
        if let Some(Some(day_data)) = grid.get(selected_week).and_then(|w| w.get(selected_day)) {
            let time_str = format_duration(day_data.total_work_seconds);
            let sessions_str = if day_data.sessions_completed == 1 {
                "1 session".to_string()
            } else {
                format!("{} sessions", day_data.sessions_completed)
            };

            // Parse and format date with weekday
            let date_display =
                if let Ok(date) = NaiveDate::parse_from_str(&day_data.date, "%Y-%m-%d") {
                    let weekday = day_labels[date.weekday().num_days_from_sunday() as usize];
                    format!("{} ({})", day_data.date, weekday)
                } else {
                    day_data.date.clone()
                };

            // Use rainbow colors for info box border if in rainbow mode
            if is_rainbow {
                // Use vibrant colors for the info box (same as level 1-4 + magenta for top)
                let c1 = "\x1b[38;2;255;80;180m"; // Magenta-pink (top border)
                let c2 = "\x1b[38;2;80;200;220m"; // Cyan
                let c3 = "\x1b[38;2;80;220;120m"; // Green
                let c4 = "\x1b[38;2;255;200;60m"; // Yellow-orange
                let c5 = "\x1b[38;2;255;80;180m"; // Magenta-pink (bottom border)
                write!(
                    stdout,
                    "  {}┌─────────────────────────────┐{}\r\n",
                    c1, reset
                )?;
                write!(
                    stdout,
                    "  {}│{} 📅 {:<23}{}│{}\r\n",
                    c2, reset, date_display, c2, reset
                )?;
                write!(
                    stdout,
                    "  {}│{} ⏱  {:<23}{}│{}\r\n",
                    c3, reset, time_str, c3, reset
                )?;
                write!(
                    stdout,
                    "  {}│{} 📊 {:<23}{}│{}\r\n",
                    c4, reset, sessions_str, c4, reset
                )?;
                write!(
                    stdout,
                    "  {}└─────────────────────────────┘{}\r\n",
                    c5, reset
                )?;
            } else {
                write!(
                    stdout,
                    "  {}┌─────────────────────────────┐{}\r\n",
                    accent_color, reset
                )?;
                write!(
                    stdout,
                    "  {}│{} 📅 {:<23}{}│{}\r\n",
                    accent_color, reset, date_display, accent_color, reset
                )?;
                write!(
                    stdout,
                    "  {}│{} ⏱  {:<23}{}│{}\r\n",
                    accent_color, reset, time_str, accent_color, reset
                )?;
                write!(
                    stdout,
                    "  {}│{} 📊 {:<23}{}│{}\r\n",
                    accent_color, reset, sessions_str, accent_color, reset
                )?;
                write!(
                    stdout,
                    "  {}└─────────────────────────────┘{}\r\n",
                    accent_color, reset
                )?;
            }
        }

        stdout.flush()?;

        // Handle key input
        if let Event::Key(KeyEvent { code, .. }) = event::read()? {
            match code {
                KeyCode::Char('q') | KeyCode::Esc => break,
                KeyCode::Left | KeyCode::Char('h') => {
                    selected_week = selected_week.saturating_sub(1);
                }
                KeyCode::Right | KeyCode::Char('l') => {
                    if selected_week < num_weeks - 1 {
                        // Check if the cell has data (not future)
                        if grid
                            .get(selected_week + 1)
                            .and_then(|w| w.get(selected_day))
                            .map(|d| d.is_some())
                            .unwrap_or(false)
                        {
                            selected_week += 1;
                        }
                    }
                }
                KeyCode::Up | KeyCode::Char('k') => {
                    selected_day = selected_day.saturating_sub(1);
                }
                KeyCode::Down | KeyCode::Char('j') => {
                    if selected_day < 6 {
                        selected_day += 1;
                    }
                }
                KeyCode::Char('+') | KeyCode::Char('=') => {
                    // Increase weeks (max 104 = 2 years)
                    if weeks < 104 {
                        weeks += 4;
                        if weeks > 104 {
                            weeks = 104;
                        }
                        let (new_grid, _, _) = build_grid(weeks, db)?;
                        grid = new_grid;
                        num_weeks = grid.len();
                        month_labels = build_month_labels(&grid);
                        // Keep selection at the end
                        selected_week = num_weeks.saturating_sub(1);
                    }
                }
                KeyCode::Char('-') | KeyCode::Char('_') => {
                    // Decrease weeks (min 4)
                    if weeks > 4 {
                        weeks -= 4;
                        if weeks < 4 {
                            weeks = 4;
                        }
                        let (new_grid, _, _) = build_grid(weeks, db)?;
                        grid = new_grid;
                        num_weeks = grid.len();
                        month_labels = build_month_labels(&grid);
                        // Keep selection at the end
                        selected_week = num_weeks.saturating_sub(1);
                    }
                }
                _ => {}
            }
        }
    }

    // Restore terminal
    execute!(stdout, LeaveAlternateScreen, cursor::Show)?;
    terminal::disable_raw_mode()?;

    Ok(())
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Some(Commands::Start {
            work: _,
            short_break: _,
            long_break: _,
        }) => {
            // Config is loaded from file; CLI args are deprecated
            app::run()?;
        }
        Some(Commands::Stats {
            day,
            week,
            month,
            date,
            weeks,
            interactive,
            export,
            compare,
            goals,
            by_tag,
        }) => {
            show_stats(
                day,
                week,
                month,
                date,
                weeks,
                interactive,
                export,
                compare,
                goals,
                by_tag,
            )?;
        }
        None => {
            // Default: start timer with settings from config file
            app::run()?;
        }
    }

    Ok(())
}
