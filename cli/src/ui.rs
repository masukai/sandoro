//! UI rendering

use ratatui::{
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, List, ListItem, Paragraph},
    Frame,
};

use crate::app::{App, AppView, SettingsItem};
use crate::icons::{IconState, IconType};
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
    let primary = app.theme.primary.to_color();
    let secondary = app.theme.secondary.to_color();
    let fg = app.theme.foreground.to_color();
    let accent = app.theme.accent.to_color();

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

    // Settings list
    let items: Vec<ListItem> = SettingsItem::all()
        .iter()
        .enumerate()
        .map(|(i, item)| {
            let is_selected = i == app.settings_index;
            let is_editing = app.editing && is_selected;

            let value = match item {
                SettingsItem::Theme => app.available_themes[app.theme_index].clone(),
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
                SettingsItem::Back => String::new(),
            };

            let prefix = if is_selected { "► " } else { "  " };
            let edit_indicator = if is_editing { " [editing ↑↓]" } else { "" };

            let content = if value.is_empty() {
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

    let header = Paragraph::new(Line::from(vec![
        Span::styled("  ", Style::default()),
        Span::styled(
            "sandoro",
            Style::default().add_modifier(Modifier::BOLD).fg(fg),
        ),
        Span::styled(" v0.1.0", Style::default().fg(secondary)),
    ]))
    .block(Block::default().borders(Borders::TOP | Borders::LEFT | Borders::RIGHT));

    f.render_widget(header, area);
}

fn draw_main_content(f: &mut Frame, area: Rect, app: &App) {
    let primary = app.theme.primary.to_color();
    let secondary = app.theme.secondary.to_color();
    let work_color = app.theme.work.to_color();
    let short_break_color = app.theme.short_break.to_color();
    let long_break_color = app.theme.long_break.to_color();

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
            Constraint::Min(0),              // Absorb remaining space
        ])
        .split(area);

    // Draw icon (chunks[0])
    let icon_text: Vec<Line> = icon_lines
        .iter()
        .map(|s| Line::from(Span::styled(s.as_str(), Style::default().fg(primary))))
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
    let session_info = Paragraph::new(format!(
        "Session: {}/{}                      Today: 0h 0m",
        app.timer.session_count, app.timer.sessions_until_long_break
    ))
    .style(Style::default().fg(secondary))
    .alignment(Alignment::Center)
    .block(Block::default().borders(Borders::LEFT | Borders::RIGHT));
    f.render_widget(session_info, chunks[4]);

    // Fill remaining space with borders (chunks[5])
    let filler = Paragraph::new("").block(Block::default().borders(Borders::LEFT | Borders::RIGHT));
    f.render_widget(filler, chunks[5]);
}

fn draw_footer(f: &mut Frame, area: Rect, app: &App, is_settings: bool) {
    let secondary = app.theme.secondary.to_color();

    let help_text = if is_settings {
        if app.editing {
            "  [↑↓] Change  [Enter] Confirm  [Esc] Cancel"
        } else {
            "  [↑↓/jk] Navigate  [Enter] Select  [Tab] Back  [q] Quit"
        }
    } else {
        "  [Space] Start/Pause  [r] Reset  [R] Full Reset  [s] Skip  [Tab] Settings  [q] Quit"
    };

    let footer = Paragraph::new(help_text)
        .style(Style::default().fg(secondary))
        .block(Block::default().borders(Borders::BOTTOM | Borders::LEFT | Borders::RIGHT));

    f.render_widget(footer, area);
}
