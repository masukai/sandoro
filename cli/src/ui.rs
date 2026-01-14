//! UI rendering

use chrono::Local;
use ratatui::{
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, List, ListItem, Paragraph},
    Frame,
};

use crate::app::{App, AppView, SettingsItem};
use crate::icons::{IconState, IconType};
use crate::messages::{get_context_message, Language, UserStats};
use crate::theme::{get_rainbow_color, get_rainbow_gradient_color, ThemeColor};
use crate::timer::TimerState;

/// Draw the main UI
pub fn draw(f: &mut Frame, app: &App) {
    match app.view {
        AppView::Timer => draw_timer_view(f, app),
        AppView::Settings => draw_settings_view(f, app),
    }
}

fn draw_timer_view(f: &mut Frame, app: &App) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .margin(1)
        .constraints([
            Constraint::Length(3), // Header
            Constraint::Min(10),   // Main content (flexible)
            Constraint::Length(3), // Footer
        ])
        .split(f.area());

    draw_header(f, chunks[0], app);
    draw_main_content(f, chunks[1], app);
    draw_footer(f, chunks[2], app, false);
}

fn draw_settings_view(f: &mut Frame, app: &App) {
    let secondary = app.theme.secondary.to_color();
    let fg = app.theme.foreground.to_color();

    // Determine accent color (rainbow or selected accent)
    let accent = if app.is_rainbow_mode() {
        let time_offset = (app.rainbow_frame as u64) * 1000;
        let (r, g, b) = get_rainbow_color(time_offset);
        Color::Rgb(r, g, b)
    } else {
        ThemeColor::from_accent_name(app.current_accent()).to_color()
    };

    // Primary color for selected items
    let primary = accent;

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .margin(1)
        .constraints([
            Constraint::Length(3), // Header
            Constraint::Min(10),   // Settings list
            Constraint::Length(3), // Footer
        ])
        .split(f.area());

    // Header
    let header = Paragraph::new(Line::from(vec![
        Span::styled("  ", Style::default()),
        Span::styled(
            "Settings",
            Style::default().add_modifier(Modifier::BOLD).fg(fg),
        ),
    ]))
    .block(Block::default().borders(Borders::TOP | Borders::LEFT | Borders::RIGHT));
    f.render_widget(header, chunks[0]);

    // Calculate visible area height (subtract borders)
    let visible_height = chunks[1].height.saturating_sub(2) as usize;

    // Settings list with scroll support
    let all_items = SettingsItem::all();
    let items: Vec<ListItem> = all_items
        .iter()
        .enumerate()
        .skip(app.settings_scroll_offset)
        .take(visible_height.max(1))
        .map(|(i, item)| {
            let is_selected = i == app.settings_index;
            let is_editing = app.editing && is_selected;

            let value = match item {
                SettingsItem::Theme => app.available_themes[app.theme_index].clone(),
                SettingsItem::AccentColor => app.available_accents[app.accent_index].clone(),
                SettingsItem::Icon => {
                    let icon = &app.available_icons[app.icon_index];
                    format!("{} {}", icon.emoji(), icon.label())
                }
                SettingsItem::WorkDuration => format!("{} min", app.config.timer.work_duration),
                SettingsItem::ShortBreak => format!("{} min", app.config.timer.short_break),
                SettingsItem::LongBreak => format!("{} min", app.config.timer.long_break),
                SettingsItem::AutoStart => {
                    if app.config.timer.auto_start {
                        "ON".to_string()
                    } else {
                        "OFF".to_string()
                    }
                }
                SettingsItem::SoundEnabled => {
                    if app.config.notifications.sound {
                        "ON".to_string()
                    } else {
                        "OFF".to_string()
                    }
                }
                SettingsItem::DesktopNotification => {
                    if app.config.notifications.desktop {
                        "ON".to_string()
                    } else {
                        "OFF".to_string()
                    }
                }
                SettingsItem::DailySessionsGoal => {
                    if app.config.goals.daily_sessions == 0 {
                        "Not set".to_string()
                    } else {
                        format!("{} sessions", app.config.goals.daily_sessions)
                    }
                }
                SettingsItem::DailyMinutesGoal => {
                    if app.config.goals.daily_minutes == 0 {
                        "Not set".to_string()
                    } else {
                        format!("{} min", app.config.goals.daily_minutes)
                    }
                }
                SettingsItem::WeeklySessionsGoal => {
                    if app.config.goals.weekly_sessions == 0 {
                        "Not set".to_string()
                    } else {
                        format!("{} sessions", app.config.goals.weekly_sessions)
                    }
                }
                SettingsItem::WeeklyMinutesGoal => {
                    if app.config.goals.weekly_minutes == 0 {
                        "Not set".to_string()
                    } else {
                        format!("{} min", app.config.goals.weekly_minutes)
                    }
                }
                SettingsItem::TagsHeader => {
                    // Show existing tags as a summary
                    if app.available_tags.is_empty() {
                        "(no tags)".to_string()
                    } else {
                        app.available_tags
                            .iter()
                            .map(|t| t.name.clone())
                            .collect::<Vec<_>>()
                            .join(", ")
                    }
                }
                SettingsItem::AddTag => {
                    if app.tag_input_mode && is_selected {
                        format!("[{}|]", app.tag_input)
                    } else {
                        String::new()
                    }
                }
                SettingsItem::DeleteTag => {
                    if app.available_tags.is_empty() {
                        "(no tags)".to_string()
                    } else if is_editing {
                        let tag_name = &app.available_tags[app.delete_tag_index].name;
                        format!("→ {} [↑↓ select, Enter delete]", tag_name)
                    } else {
                        let tag_name = &app.available_tags[app.delete_tag_index].name;
                        tag_name.clone()
                    }
                }
                SettingsItem::Back => String::new(),
            };

            // Check if this is the AddTag item in input mode
            let is_input_mode =
                matches!(item, SettingsItem::AddTag) && app.tag_input_mode && is_selected;

            let prefix = if is_selected { "► " } else { "  " };
            let edit_indicator = if is_editing && !is_input_mode {
                " [editing ↑↓]"
            } else {
                ""
            };

            let content = if matches!(item, SettingsItem::TagsHeader) {
                // Header: show label on left, value on right without ":"
                format!("{}{} {}", prefix, item.label(), value)
            } else if value.is_empty() {
                format!("{}{}", prefix, item.label())
            } else {
                format!("{}{}: {}{}", prefix, item.label(), value, edit_indicator)
            };

            let style = if is_selected {
                if is_editing {
                    Style::default().fg(accent).add_modifier(Modifier::BOLD)
                } else {
                    Style::default().fg(primary).add_modifier(Modifier::BOLD)
                }
            } else {
                Style::default().fg(secondary)
            };

            ListItem::new(content).style(style)
        })
        .collect();

    let list = List::new(items).block(Block::default().borders(Borders::LEFT | Borders::RIGHT));
    f.render_widget(list, chunks[1]);

    draw_footer(f, chunks[2], app, true);
}

fn draw_header(f: &mut Frame, area: Rect, app: &App) {
    let fg = app.theme.foreground.to_color();
    let secondary = app.theme.secondary.to_color();

    // Get current time
    let current_time = Local::now().format("%H:%M:%S").to_string();

    // Calculate padding to right-align the time
    // Area width - borders (2) - left content (~15) - time (~8) - right padding (2)
    let left_content_width = 15; // "  sandoro v0.1.0"
    let time_width = 8; // "HH:MM:SS"
    let padding_width = area
        .width
        .saturating_sub(2 + left_content_width + time_width + 2) as usize;
    let padding = " ".repeat(padding_width);

    let header = Paragraph::new(Line::from(vec![
        Span::styled("  ", Style::default()),
        Span::styled(
            "sandoro",
            Style::default().add_modifier(Modifier::BOLD).fg(fg),
        ),
        Span::styled(" v0.1.0", Style::default().fg(secondary)),
        Span::styled(padding, Style::default()),
        Span::styled(current_time, Style::default().fg(secondary)),
        Span::styled("  ", Style::default()),
    ]))
    .block(Block::default().borders(Borders::TOP | Borders::LEFT | Borders::RIGHT));

    f.render_widget(header, area);
}

fn draw_main_content(f: &mut Frame, area: Rect, app: &App) {
    let secondary = app.theme.secondary.to_color();
    let work_color = app.theme.work.to_color();
    let short_break_color = app.theme.short_break.to_color();
    let long_break_color = app.theme.long_break.to_color();

    // Determine if rainbow mode is enabled
    let is_rainbow = app.is_rainbow_mode();
    let accent_color = if !is_rainbow {
        // Use accent color from theme
        ThemeColor::from_accent_name(app.current_accent()).to_color()
    } else {
        // Placeholder - will be replaced per line for rainbow
        Color::White
    };

    // Draw icon based on selected icon type
    let progress = app.timer.progress_percent();
    let is_break = !matches!(app.timer.state, TimerState::Work);
    let current_icon = app.current_icon();

    let icon_lines = if current_icon == IconType::None {
        vec![]
    } else {
        let mut icon_state = IconState::new(current_icon);
        icon_state.percent = progress;
        icon_state.animation_frame = app.animation_frame;
        icon_state.is_animating = !app.timer.is_paused;
        icon_state.render_with_direction(is_break)
    };

    // Calculate icon height dynamically
    let icon_height = if icon_lines.is_empty() {
        0
    } else {
        icon_lines.len() as u16
    };

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(icon_height), // Icon area (exact fit)
            Constraint::Length(1),           // Spacer
            Constraint::Length(2),           // Timer display
            Constraint::Length(2),           // Status
            Constraint::Length(1),           // Session info
            Constraint::Length(2),           // Context message
            Constraint::Min(0),              // Absorb remaining space
        ])
        .split(area);

    // Draw icon (chunks[0])
    let total_lines = icon_lines.len();
    let icon_text: Vec<Line> = icon_lines
        .iter()
        .enumerate()
        .map(|(i, s)| {
            let line_color = if is_rainbow {
                // Rainbow gradient: each line gets a different color
                let (r, g, b) = get_rainbow_gradient_color(i, total_lines, app.rainbow_frame);
                Color::Rgb(r, g, b)
            } else {
                accent_color
            };
            Line::from(Span::styled(s.as_str(), Style::default().fg(line_color)))
        })
        .collect();

    let icon_widget = Paragraph::new(icon_text)
        .alignment(Alignment::Center)
        .block(Block::default().borders(Borders::LEFT | Borders::RIGHT));
    f.render_widget(icon_widget, chunks[0]);

    // Spacer (chunks[1]) - just draw borders
    let spacer = Paragraph::new("").block(Block::default().borders(Borders::LEFT | Borders::RIGHT));
    f.render_widget(spacer, chunks[1]);

    // Draw timer (chunks[2])
    let timer_text = Paragraph::new(app.timer.formatted_time())
        .style(Style::default().add_modifier(Modifier::BOLD))
        .alignment(Alignment::Center)
        .block(Block::default().borders(Borders::LEFT | Borders::RIGHT));
    f.render_widget(timer_text, chunks[2]);

    // Draw status (chunks[3])
    let (status_color, status_text) = match app.timer.state {
        TimerState::Work => {
            let color = if app.timer.is_paused {
                Color::Yellow
            } else {
                work_color
            };
            let text = if app.timer.is_paused {
                format!("[ {} - PAUSED ]", app.timer.state.label())
            } else {
                format!("[ {} ]", app.timer.state.label())
            };
            (color, text)
        }
        TimerState::ShortBreak => {
            let color = if app.timer.is_paused {
                Color::Yellow
            } else {
                short_break_color
            };
            let text = if app.timer.is_paused {
                format!("[ {} - PAUSED ]", app.timer.state.label())
            } else {
                format!("[ {} ]", app.timer.state.label())
            };
            (color, text)
        }
        TimerState::LongBreak => {
            let color = if app.timer.is_paused {
                Color::Yellow
            } else {
                long_break_color
            };
            let text = if app.timer.is_paused {
                format!("[ {} - PAUSED ]", app.timer.state.label())
            } else {
                format!("[ {} ]", app.timer.state.label())
            };
            (color, text)
        }
    };

    let status = Paragraph::new(status_text)
        .style(Style::default().fg(status_color))
        .alignment(Alignment::Center)
        .block(Block::default().borders(Borders::LEFT | Borders::RIGHT));
    f.render_widget(status, chunks[3]);

    // Draw session info (chunks[4])
    let hours = app.today_work_seconds / 3600;
    let minutes = (app.today_work_seconds % 3600) / 60;
    let today_display = if hours > 0 {
        format!("{}h {}m", hours, minutes)
    } else {
        format!("{}m", minutes)
    };
    // Show tag if selected
    let tag_display = if let Some(tag) = app.selected_tag() {
        format!("  Tag: {}", tag.name)
    } else if !app.available_tags.is_empty() {
        "  Tag: -".to_string()
    } else {
        String::new()
    };
    let session_info = Paragraph::new(format!(
        "Session: {}/{}    Today: {}{}",
        app.timer.session_count, app.timer.sessions_until_long_break, today_display, tag_display
    ))
    .style(Style::default().fg(secondary))
    .alignment(Alignment::Center)
    .block(Block::default().borders(Borders::LEFT | Borders::RIGHT));
    f.render_widget(session_info, chunks[4]);

    // Draw context message (chunks[5])
    let lang = Language::from_str(&app.config.appearance.language);
    let stats = UserStats {
        today_work_seconds: app.today_work_seconds,
        today_sessions: app.today_sessions,
        current_streak: app.current_streak,
        longest_streak: app.longest_streak,
        week_avg_seconds: app.week_avg_seconds,
        yesterday_seconds: app.yesterday_seconds,
        total_sessions: app.total_sessions,
    };
    let context_msg =
        get_context_message(app.timer.state, !app.timer.is_paused, lang, Some(&stats));
    let context_widget = Paragraph::new(context_msg)
        .style(
            Style::default()
                .fg(secondary)
                .add_modifier(Modifier::ITALIC),
        )
        .alignment(Alignment::Center)
        .block(Block::default().borders(Borders::LEFT | Borders::RIGHT));
    f.render_widget(context_widget, chunks[5]);

    // Fill remaining space with borders (chunks[6])
    let filler = Paragraph::new("").block(Block::default().borders(Borders::LEFT | Borders::RIGHT));
    f.render_widget(filler, chunks[6]);
}

fn draw_footer(f: &mut Frame, area: Rect, app: &App, is_settings: bool) {
    let secondary = app.theme.secondary.to_color();

    let help_text = if is_settings {
        if app.tag_input_mode {
            "  Type tag name  [Enter] Add  [Esc] Cancel"
        } else if app.editing {
            "  [↑↓] Change  [Enter] Confirm  [Esc] Cancel"
        } else {
            "  [↑↓/jk] Navigate  [Enter] Select  [Tab] Back  [q] Quit"
        }
    } else if !app.available_tags.is_empty() {
        "  [Space] Start/Pause  [r] Reset  [s] Skip  [t] Tag  [Tab] Settings  [q] Quit"
    } else {
        "  [Space] Start/Pause  [r] Reset  [R] Full Reset  [s] Skip  [Tab] Settings  [q] Quit"
    };

    let footer = Paragraph::new(help_text)
        .style(Style::default().fg(secondary))
        .block(Block::default().borders(Borders::BOTTOM | Borders::LEFT | Borders::RIGHT));

    f.render_widget(footer, area);
}
