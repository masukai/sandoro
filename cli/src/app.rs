//! Application state management and main TUI loop

use anyhow::Result;
use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyCode},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{backend::CrosstermBackend, Terminal};
use std::io;
use std::time::Duration;

use crate::config::Config;
use crate::db::{Database, SessionType};
use crate::icons::IconType;
use crate::theme::Theme;
use crate::timer::{Timer, TimerState};
use crate::ui;

/// Current view/screen
#[derive(Debug, Clone, PartialEq)]
pub enum AppView {
    Timer,
    Settings,
}

/// Settings menu item
#[derive(Debug, Clone, PartialEq)]
pub enum SettingsItem {
    Theme,
    Icon,
    WorkDuration,
    ShortBreak,
    LongBreak,
    AutoStart,
    Back,
}

impl SettingsItem {
    pub fn all() -> Vec<Self> {
        vec![
            Self::Theme,
            Self::Icon,
            Self::WorkDuration,
            Self::ShortBreak,
            Self::LongBreak,
            Self::AutoStart,
            Self::Back,
        ]
    }

    pub fn label(&self) -> &'static str {
        match self {
            Self::Theme => "Theme",
            Self::Icon => "Icon",
            Self::WorkDuration => "Work Duration",
            Self::ShortBreak => "Short Break",
            Self::LongBreak => "Long Break",
            Self::AutoStart => "Auto Start",
            Self::Back => "← Back to Timer",
        }
    }
}

/// Application state
pub struct App {
    /// Current timer
    pub timer: Timer,
    /// Whether the app should quit
    pub should_quit: bool,
    /// Current view
    pub view: AppView,
    /// Settings menu selected index
    pub settings_index: usize,
    /// Current theme
    pub theme: Theme,
    /// Configuration
    pub config: Config,
    /// Theme selection index (when editing theme)
    pub theme_index: usize,
    /// Available themes
    pub available_themes: Vec<String>,
    /// Icon selection index (when editing icon)
    pub icon_index: usize,
    /// Available icons
    pub available_icons: Vec<IconType>,
    /// Is currently editing a setting
    pub editing: bool,
    /// Animation frame counter
    pub animation_frame: u8,
    /// Tick counter for animation timing (animate every N ticks)
    animation_tick: u8,
    /// Database for session recording
    db: Option<Database>,
    /// Current session ID being recorded
    current_session_id: Option<i64>,
    /// Today's total work time in seconds
    pub today_work_seconds: i32,
    /// Today's completed sessions count
    pub today_sessions: i32,
}

impl App {
    pub fn new(config: Config) -> Self {
        let theme = Theme::by_name(&config.appearance.theme);
        let available_themes: Vec<String> =
            Theme::free_themes().iter().map(|s| s.to_string()).collect();
        let theme_index = available_themes
            .iter()
            .position(|t| t == &config.appearance.theme)
            .unwrap_or(0);

        let available_icons = IconType::free_icons();
        let icon_index = IconType::from_str(&config.appearance.icon)
            .and_then(|icon| available_icons.iter().position(|i| *i == icon))
            .unwrap_or(2); // Default to Hourglass (index 2)

        // Open database and get today's stats
        let db = Database::open().ok();
        let (today_work_seconds, today_sessions) = db
            .as_ref()
            .and_then(|d| d.get_today_stats().ok())
            .map(|s| (s.total_work_seconds, s.sessions_completed))
            .unwrap_or((0, 0));

        Self {
            timer: Timer::with_sessions(
                config.timer.work_duration,
                config.timer.short_break,
                config.timer.long_break,
                config.timer.sessions_until_long,
            ),
            should_quit: false,
            view: AppView::Timer,
            settings_index: 0,
            theme,
            config,
            theme_index,
            available_themes,
            icon_index,
            available_icons,
            editing: false,
            animation_frame: 0,
            animation_tick: 0,
            db,
            current_session_id: None,
            today_work_seconds,
            today_sessions,
        }
    }

    pub fn tick(&mut self) {
        if self.view == AppView::Timer {
            let was_running = !self.timer.is_paused;
            let old_state = self.timer.state;

            self.timer.tick();

            // Check if timer completed and transitioned
            if was_running && self.timer.is_paused && self.timer.state != old_state {
                // Record session completion
                self.record_session_complete(old_state, true);

                // Auto-start if enabled
                if self.config.timer.auto_start {
                    self.timer.toggle_pause();
                }
            }

            // Advance animation frame every 5 ticks (500ms at 100ms tick rate)
            self.animation_tick = (self.animation_tick + 1) % 5;
            if self.animation_tick == 0 && !self.timer.is_paused {
                // Get max frames for current icon
                let max_frames = match self.current_icon() {
                    IconType::Hourglass => 4,
                    IconType::Coffee => 4,
                    IconType::Tomato => 2,
                    IconType::Progress => 2,
                    _ => 1,
                };
                self.animation_frame = (self.animation_frame + 1) % max_frames;
            }
        }
    }

    pub fn toggle_pause(&mut self) {
        let was_paused = self.timer.is_paused;
        self.timer.toggle_pause();

        // Start recording session when timer starts
        if was_paused && !self.timer.is_paused {
            self.start_session_recording();
        }
    }

    pub fn reset(&mut self) {
        // Cancel current session if running
        self.current_session_id = None;
        self.timer.reset();
    }

    /// Full reset - back to session 1 and Work state
    pub fn full_reset(&mut self) {
        // Cancel current session if running
        self.current_session_id = None;
        self.timer.full_reset();
    }

    pub fn skip(&mut self) {
        let old_state = self.timer.state;
        self.timer.skip();
        // Record skipped session (not completed)
        self.record_session_complete(old_state, false);
    }

    /// Start recording a new session
    fn start_session_recording(&mut self) {
        if let Some(ref db) = self.db {
            let session_type = match self.timer.state {
                TimerState::Work => SessionType::Work,
                TimerState::ShortBreak => SessionType::ShortBreak,
                TimerState::LongBreak => SessionType::LongBreak,
            };
            if let Ok(id) = db.start_session(session_type) {
                self.current_session_id = Some(id);
            }
        }
    }

    /// Record session completion
    fn record_session_complete(&mut self, state: TimerState, completed: bool) {
        if let (Some(ref db), Some(session_id)) = (&self.db, self.current_session_id) {
            let duration = match state {
                TimerState::Work => self.config.timer.work_duration * 60,
                TimerState::ShortBreak => self.config.timer.short_break * 60,
                TimerState::LongBreak => self.config.timer.long_break * 60,
            };

            if completed {
                let _ = db.complete_session(session_id, duration as i32);

                // Update today's stats for work sessions
                if state == TimerState::Work {
                    self.today_work_seconds += duration as i32;
                    self.today_sessions += 1;
                }
            }
        }
        self.current_session_id = None;
    }

    pub fn toggle_settings(&mut self) {
        self.view = match self.view {
            AppView::Timer => AppView::Settings,
            AppView::Settings => AppView::Timer,
        };
        self.editing = false;
    }

    pub fn settings_up(&mut self) {
        if self.editing {
            match SettingsItem::all()[self.settings_index] {
                SettingsItem::Theme => {
                    if self.theme_index > 0 {
                        self.theme_index -= 1;
                    } else {
                        self.theme_index = self.available_themes.len() - 1;
                    }
                }
                SettingsItem::Icon => {
                    if self.icon_index > 0 {
                        self.icon_index -= 1;
                    } else {
                        self.icon_index = self.available_icons.len() - 1;
                    }
                }
                SettingsItem::WorkDuration => {
                    if self.config.timer.work_duration < 60 {
                        self.config.timer.work_duration += 5;
                    }
                }
                SettingsItem::ShortBreak => {
                    if self.config.timer.short_break < 30 {
                        self.config.timer.short_break += 1;
                    }
                }
                SettingsItem::LongBreak => {
                    if self.config.timer.long_break < 60 {
                        self.config.timer.long_break += 5;
                    }
                }
                SettingsItem::AutoStart => {
                    self.config.timer.auto_start = !self.config.timer.auto_start;
                }
                _ => {}
            }
        } else if self.settings_index > 0 {
            self.settings_index -= 1;
        }
    }

    pub fn settings_down(&mut self) {
        if self.editing {
            match SettingsItem::all()[self.settings_index] {
                SettingsItem::Theme => {
                    if self.theme_index < self.available_themes.len() - 1 {
                        self.theme_index += 1;
                    } else {
                        self.theme_index = 0;
                    }
                }
                SettingsItem::Icon => {
                    if self.icon_index < self.available_icons.len() - 1 {
                        self.icon_index += 1;
                    } else {
                        self.icon_index = 0;
                    }
                }
                SettingsItem::WorkDuration => {
                    if self.config.timer.work_duration > 5 {
                        self.config.timer.work_duration -= 5;
                    }
                }
                SettingsItem::ShortBreak => {
                    if self.config.timer.short_break > 1 {
                        self.config.timer.short_break -= 1;
                    }
                }
                SettingsItem::LongBreak => {
                    if self.config.timer.long_break > 5 {
                        self.config.timer.long_break -= 5;
                    }
                }
                SettingsItem::AutoStart => {
                    self.config.timer.auto_start = !self.config.timer.auto_start;
                }
                _ => {}
            }
        } else if self.settings_index < SettingsItem::all().len() - 1 {
            self.settings_index += 1;
        }
    }

    pub fn settings_select(&mut self) {
        let item = &SettingsItem::all()[self.settings_index];
        match item {
            SettingsItem::Back => {
                self.view = AppView::Timer;
                self.editing = false;
            }
            SettingsItem::Theme
            | SettingsItem::Icon
            | SettingsItem::WorkDuration
            | SettingsItem::ShortBreak
            | SettingsItem::LongBreak => {
                if self.editing {
                    // Apply changes
                    self.editing = false;
                    self.apply_settings();
                } else {
                    self.editing = true;
                }
            }
            SettingsItem::AutoStart => {
                // Toggle auto-start directly (no editing mode needed)
                self.config.timer.auto_start = !self.config.timer.auto_start;
                self.apply_settings();
            }
        }
    }

    fn apply_settings(&mut self) {
        // Apply theme
        self.config.appearance.theme = self.available_themes[self.theme_index].clone();
        self.theme = Theme::by_name(&self.config.appearance.theme);

        // Apply icon
        self.config.appearance.icon = self.available_icons[self.icon_index].to_string();

        // Only recreate timer if duration settings changed
        let duration_changed = self.timer.work_duration != self.config.timer.work_duration
            || self.timer.short_break_duration != self.config.timer.short_break
            || self.timer.long_break_duration != self.config.timer.long_break
            || self.timer.sessions_until_long_break != self.config.timer.sessions_until_long;

        if duration_changed {
            self.timer = Timer::with_sessions(
                self.config.timer.work_duration,
                self.config.timer.short_break,
                self.config.timer.long_break,
                self.config.timer.sessions_until_long,
            );
        }

        // Save config
        if let Err(e) = self.config.save() {
            eprintln!("Failed to save config: {}", e);
        }
    }

    #[allow(dead_code)]
    pub fn get_current_setting_value(&self) -> String {
        match SettingsItem::all()[self.settings_index] {
            SettingsItem::Theme => self.available_themes[self.theme_index].clone(),
            SettingsItem::Icon => {
                let icon = &self.available_icons[self.icon_index];
                format!("{} {}", icon.emoji(), icon.label())
            }
            SettingsItem::WorkDuration => format!("{} min", self.config.timer.work_duration),
            SettingsItem::ShortBreak => format!("{} min", self.config.timer.short_break),
            SettingsItem::LongBreak => format!("{} min", self.config.timer.long_break),
            SettingsItem::AutoStart => {
                if self.config.timer.auto_start {
                    "ON".to_string()
                } else {
                    "OFF".to_string()
                }
            }
            SettingsItem::Back => String::new(),
        }
    }

    /// Get the current icon type
    pub fn current_icon(&self) -> IconType {
        self.available_icons[self.icon_index]
    }
}

/// Run the TUI application
pub fn run() -> Result<()> {
    // Load config
    let config = Config::load().unwrap_or_default();

    // Setup terminal
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    // Create app state
    let mut app = App::new(config);

    // Main loop
    let tick_rate = Duration::from_millis(100);
    loop {
        // Draw UI
        terminal.draw(|f| ui::draw(f, &app))?;

        // Handle input
        if event::poll(tick_rate)? {
            if let Event::Key(key) = event::read()? {
                match app.view {
                    AppView::Timer => match key.code {
                        KeyCode::Char('q') => app.should_quit = true,
                        KeyCode::Char(' ') => app.toggle_pause(),
                        KeyCode::Char('r') => app.reset(),
                        KeyCode::Char('R') => app.full_reset(),
                        KeyCode::Char('s') => app.skip(),
                        KeyCode::Tab => app.toggle_settings(),
                        _ => {}
                    },
                    AppView::Settings => match key.code {
                        KeyCode::Char('q') => {
                            if !app.editing {
                                app.should_quit = true;
                            }
                        }
                        KeyCode::Tab | KeyCode::Esc => {
                            if app.editing {
                                app.editing = false;
                            } else {
                                app.toggle_settings();
                            }
                        }
                        KeyCode::Up | KeyCode::Char('k') => app.settings_up(),
                        KeyCode::Down | KeyCode::Char('j') => app.settings_down(),
                        KeyCode::Enter | KeyCode::Char(' ') => app.settings_select(),
                        _ => {}
                    },
                }
            }
        }

        // Update timer
        app.tick();

        if app.should_quit {
            break;
        }
    }

    // Restore terminal
    disable_raw_mode()?;
    execute!(
        terminal.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture
    )?;
    terminal.show_cursor()?;

    Ok(())
}
