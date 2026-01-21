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

use crate::config::{Config, FocusMode};
use crate::db::{Database, Session, SessionType, Tag};
use crate::icons::IconType;
use crate::notification;
use crate::sync;
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
    AccentColor,
    Icon,
    WorkDuration,
    ShortBreak,
    LongBreak,
    AutoStart,
    FocusMode,
    BreakSnooze,
    SoundEnabled,
    DesktopNotification,
    DailySessionsGoal,
    DailyMinutesGoal,
    WeeklySessionsGoal,
    WeeklyMinutesGoal,
    TagsHeader,
    AddTag,
    DeleteTag,
    SessionsHeader,
    EditSessionTag,
    DeleteSession,
    Back,
}

impl SettingsItem {
    pub fn all() -> Vec<Self> {
        vec![
            Self::Theme,
            Self::AccentColor,
            Self::Icon,
            Self::WorkDuration,
            Self::ShortBreak,
            Self::LongBreak,
            Self::AutoStart,
            Self::FocusMode,
            Self::BreakSnooze,
            Self::SoundEnabled,
            Self::DesktopNotification,
            Self::DailySessionsGoal,
            Self::DailyMinutesGoal,
            Self::WeeklySessionsGoal,
            Self::WeeklyMinutesGoal,
            Self::TagsHeader,
            Self::AddTag,
            Self::DeleteTag,
            Self::SessionsHeader,
            Self::EditSessionTag,
            Self::DeleteSession,
            Self::Back,
        ]
    }

    pub fn label(&self) -> &'static str {
        self.label_with_lang("en")
    }

    pub fn label_with_lang(&self, lang: &str) -> &'static str {
        let is_ja = lang == "ja";
        match self {
            Self::Theme => {
                if is_ja {
                    "テーマ"
                } else {
                    "Theme"
                }
            }
            Self::AccentColor => {
                if is_ja {
                    "アクセントカラー"
                } else {
                    "Accent Color"
                }
            }
            Self::Icon => {
                if is_ja {
                    "アイコン"
                } else {
                    "Icon"
                }
            }
            Self::WorkDuration => {
                if is_ja {
                    "作業時間"
                } else {
                    "Work Duration"
                }
            }
            Self::ShortBreak => {
                if is_ja {
                    "短い休憩"
                } else {
                    "Short Break"
                }
            }
            Self::LongBreak => {
                if is_ja {
                    "長い休憩"
                } else {
                    "Long Break"
                }
            }
            Self::AutoStart => {
                if is_ja {
                    "自動開始"
                } else {
                    "Auto Start"
                }
            }
            Self::FocusMode => {
                if is_ja {
                    "フォーカスモード"
                } else {
                    "Focus Mode"
                }
            }
            Self::BreakSnooze => {
                if is_ja {
                    "休憩延長"
                } else {
                    "Break Snooze"
                }
            }
            Self::SoundEnabled => {
                if is_ja {
                    "サウンド"
                } else {
                    "Sound"
                }
            }
            Self::DesktopNotification => {
                if is_ja {
                    "デスクトップ通知"
                } else {
                    "Desktop Notification"
                }
            }
            Self::DailySessionsGoal => {
                if is_ja {
                    "1日のセッション目標"
                } else {
                    "Daily Sessions Goal"
                }
            }
            Self::DailyMinutesGoal => {
                if is_ja {
                    "1日の作業時間目標"
                } else {
                    "Daily Minutes Goal"
                }
            }
            Self::WeeklySessionsGoal => {
                if is_ja {
                    "週間セッション目標"
                } else {
                    "Weekly Sessions Goal"
                }
            }
            Self::WeeklyMinutesGoal => {
                if is_ja {
                    "週間作業時間目標"
                } else {
                    "Weekly Minutes Goal"
                }
            }
            Self::TagsHeader => {
                if is_ja {
                    "── タグ ──"
                } else {
                    "── Tags ──"
                }
            }
            Self::AddTag => {
                if is_ja {
                    "新しいタグを追加"
                } else {
                    "Add New Tag"
                }
            }
            Self::DeleteTag => {
                if is_ja {
                    "タグを削除"
                } else {
                    "Delete Tag"
                }
            }
            Self::SessionsHeader => {
                if is_ja {
                    "── セッション履歴 ──"
                } else {
                    "── Session History ──"
                }
            }
            Self::EditSessionTag => {
                if is_ja {
                    "セッションのタグを変更"
                } else {
                    "Change Session Tag"
                }
            }
            Self::DeleteSession => {
                if is_ja {
                    "セッションを削除"
                } else {
                    "Delete Session"
                }
            }
            Self::Back => {
                if is_ja {
                    "← タイマーに戻る"
                } else {
                    "← Back to Timer"
                }
            }
        }
    }

    /// Returns true if this item is a header/separator (not selectable for editing)
    pub fn is_header(&self) -> bool {
        matches!(self, Self::TagsHeader | Self::SessionsHeader)
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
    /// Accent color selection index (when editing accent)
    pub accent_index: usize,
    /// Available accent colors
    pub available_accents: Vec<String>,
    /// Focus mode selection index (when editing focus mode)
    pub focus_mode_index: usize,
    /// Is currently editing a setting
    pub editing: bool,
    /// Animation frame counter
    pub animation_frame: u8,
    /// Tick counter for animation timing (animate every N ticks)
    animation_tick: u8,
    /// Rainbow color frame counter (0-6 for 7 colors)
    pub rainbow_frame: u8,
    /// Rainbow animation tick counter
    rainbow_tick: u8,
    /// Database for session recording
    db: Option<Database>,
    /// Current session ID being recorded
    current_session_id: Option<i64>,
    /// Today's total work time in seconds
    pub today_work_seconds: i32,
    /// Today's completed sessions count
    pub today_sessions: i32,
    /// Current streak (consecutive days)
    pub current_streak: i32,
    /// Longest streak ever
    pub longest_streak: i32,
    /// Yesterday's work seconds
    pub yesterday_seconds: i32,
    /// Weekly average work seconds
    pub week_avg_seconds: i32,
    /// Total sessions completed (all time)
    pub total_sessions: i32,
    /// Available tags from database
    pub available_tags: Vec<Tag>,
    /// Currently selected tag index (None = no tag)
    pub selected_tag_index: Option<usize>,
    /// Settings list scroll offset for visible items
    pub settings_scroll_offset: usize,
    /// Input buffer for adding new tag
    pub tag_input: String,
    /// Whether we're in tag input mode
    pub tag_input_mode: bool,
    /// Index for selecting tag to delete (cycles through available tags)
    pub delete_tag_index: usize,
    /// Recent sessions (with tags) for editing
    pub recent_sessions: Vec<(Session, Option<Tag>)>,
    /// Index for selecting session to edit/delete
    pub session_edit_index: usize,
    /// Index for selecting tag when editing session tag
    pub session_tag_edit_index: Option<usize>,
}

impl App {
    pub fn new(config: Config) -> Self {
        use crate::theme::available_accent_colors;

        // Apply accent color to theme
        let theme = Theme::by_name(&config.appearance.theme).with_accent(&config.appearance.accent);
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

        // Available accent colors
        let available_accents: Vec<String> = available_accent_colors()
            .iter()
            .map(|s| s.to_string())
            .collect();
        let accent_index = available_accents
            .iter()
            .position(|a| a == &config.appearance.accent)
            .unwrap_or(0); // Default to cyan (index 0)

        // Focus mode index
        let focus_mode_index = match config.focus.mode {
            FocusMode::Classic => 0,
            FocusMode::Flowtime => 1,
        };

        // Open database and get stats
        let db = Database::open().ok();

        // Try to sync any pending sessions from previous offline usage
        if let Some(ref d) = db {
            let _ = sync::try_sync_pending(d.connection());
        }

        let (today_work_seconds, today_sessions) = db
            .as_ref()
            .and_then(|d| d.get_today_stats().ok())
            .map(|s| (s.total_work_seconds, s.sessions_completed))
            .unwrap_or((0, 0));

        // Get streak info
        let (current_streak, longest_streak) = db
            .as_ref()
            .and_then(|d| d.get_streak().ok())
            .map(|s| (s.current, s.longest))
            .unwrap_or((0, 0));

        // Get week stats for average
        let week_avg_seconds = db
            .as_ref()
            .and_then(|d| d.get_week_stats().ok())
            .map(|s| s.total_work_seconds / 7)
            .unwrap_or(0);

        // Get yesterday's stats
        let yesterday_seconds = db
            .as_ref()
            .and_then(|d| {
                use chrono::{Duration, Local};
                let yesterday = (Local::now() - Duration::days(1))
                    .format("%Y-%m-%d")
                    .to_string();
                d.get_date_stats(&yesterday).ok()
            })
            .map(|s| s.total_work_seconds)
            .unwrap_or(0);

        // Get total sessions count
        let total_sessions = db
            .as_ref()
            .and_then(|d| d.get_month_stats().ok())
            .map(|s| s.sessions_completed)
            .unwrap_or(0);

        // Load available tags
        let available_tags = db
            .as_ref()
            .and_then(|d| d.get_all_tags().ok())
            .unwrap_or_default();

        // Load recent sessions for editing
        let recent_sessions = db
            .as_ref()
            .and_then(|d| d.get_recent_sessions(20).ok())
            .unwrap_or_default();

        // Create timer and set flowtime mode
        let mut timer = Timer::with_sessions(
            config.timer.work_duration,
            config.timer.short_break,
            config.timer.long_break,
            config.timer.sessions_until_long,
        );
        timer.set_flowtime(config.focus.mode == FocusMode::Flowtime);

        Self {
            timer,
            should_quit: false,
            view: AppView::Timer,
            settings_index: 0,
            theme,
            config,
            theme_index,
            available_themes,
            icon_index,
            available_icons,
            accent_index,
            available_accents,
            focus_mode_index,
            editing: false,
            animation_frame: 0,
            animation_tick: 0,
            rainbow_frame: 0,
            rainbow_tick: 0,
            db,
            current_session_id: None,
            today_work_seconds,
            today_sessions,
            current_streak,
            longest_streak,
            yesterday_seconds,
            week_avg_seconds,
            total_sessions,
            available_tags,
            selected_tag_index: None,
            settings_scroll_offset: 0,
            tag_input: String::new(),
            tag_input_mode: false,
            delete_tag_index: 0,
            recent_sessions,
            session_edit_index: 0,
            session_tag_edit_index: None,
        }
    }

    pub fn tick(&mut self) {
        // Rainbow animation runs in both Timer and Settings views
        self.rainbow_tick = (self.rainbow_tick + 1) % 5;
        if self.rainbow_tick == 0 {
            // Cycle through 7 rainbow colors
            self.rainbow_frame = (self.rainbow_frame + 1) % 7;
        }

        if self.view == AppView::Timer {
            let was_running = !self.timer.is_paused;
            let old_state = self.timer.state;

            self.timer.tick();

            // Check if timer completed and transitioned
            if was_running && self.timer.is_paused && self.timer.state != old_state {
                // Record session completion
                self.record_session_complete(old_state, true);

                // Send notification
                notification::notify_session_complete(
                    old_state,
                    self.config.notifications.sound,
                    self.config.notifications.desktop,
                );

                // Auto-start if enabled
                if self.config.timer.auto_start {
                    self.timer.toggle_pause();
                    // Start recording new session if transitioning to Work
                    if self.timer.state == TimerState::Work {
                        self.start_session_recording();
                    }
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

        // Start recording session when timer starts (only for Work sessions)
        if was_paused && !self.timer.is_paused && self.timer.state == TimerState::Work {
            // Only start new recording if there's no current session
            if self.current_session_id.is_none() {
                self.start_session_recording();
            }
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

    /// Cycle through available tags (None -> tag1 -> tag2 -> ... -> None)
    pub fn cycle_tag(&mut self) {
        if self.available_tags.is_empty() {
            return;
        }
        match self.selected_tag_index {
            None => self.selected_tag_index = Some(0),
            Some(idx) => {
                if idx + 1 < self.available_tags.len() {
                    self.selected_tag_index = Some(idx + 1);
                } else {
                    self.selected_tag_index = None;
                }
            }
        }
    }

    /// Get the currently selected tag
    pub fn selected_tag(&self) -> Option<&Tag> {
        self.selected_tag_index
            .and_then(|idx| self.available_tags.get(idx))
    }

    /// Cycle through focus modes (Classic -> Flowtime -> Classic)
    pub fn cycle_focus_mode(&mut self) {
        self.focus_mode_index = (self.focus_mode_index + 1) % 2;
        self.config.focus.mode = match self.focus_mode_index {
            0 => FocusMode::Classic,
            _ => FocusMode::Flowtime,
        };
        // Update timer flowtime mode
        self.timer
            .set_flowtime(self.config.focus.mode == FocusMode::Flowtime);
        // Save config
        let _ = self.config.save();
    }

    /// Snooze break - add current break duration to timer
    pub fn snooze_break(&mut self) {
        // Only snooze during breaks and if snooze is enabled
        if !self.config.focus.break_snooze_enabled {
            return;
        }
        match self.timer.state {
            TimerState::ShortBreak => {
                let snooze_seconds = self.config.timer.short_break * 60;
                self.timer.add_time(snooze_seconds);
            }
            TimerState::LongBreak => {
                let snooze_seconds = self.config.timer.long_break * 60;
                self.timer.add_time(snooze_seconds);
            }
            TimerState::Work => {
                // Do nothing during work
            }
        }
    }

    /// Add a new tag
    pub fn add_tag(&mut self, name: &str) {
        if name.trim().is_empty() {
            return;
        }
        if let Some(ref db) = self.db {
            if let Ok(id) = db.create_tag(name.trim(), None) {
                let tag = Tag {
                    id,
                    name: name.trim().to_string(),
                    color: None,
                };
                self.available_tags.push(tag);
            }
        }
    }

    /// Delete the tag at delete_tag_index
    pub fn delete_current_tag(&mut self) {
        if self.available_tags.is_empty() {
            return;
        }
        if self.delete_tag_index >= self.available_tags.len() {
            self.delete_tag_index = 0;
        }
        let tag_id = self.available_tags[self.delete_tag_index].id;
        if let Some(ref db) = self.db {
            if db.delete_tag(tag_id).is_ok() {
                self.available_tags.remove(self.delete_tag_index);
                // Adjust indices
                if self.delete_tag_index >= self.available_tags.len()
                    && !self.available_tags.is_empty()
                {
                    self.delete_tag_index = self.available_tags.len() - 1;
                }
                // Also adjust selected_tag_index if needed
                if let Some(idx) = self.selected_tag_index {
                    if idx == self.delete_tag_index {
                        self.selected_tag_index = None;
                    } else if idx > self.delete_tag_index {
                        self.selected_tag_index = Some(idx - 1);
                    }
                }
            }
        }
    }

    /// Cycle delete_tag_index through available tags
    pub fn cycle_delete_tag(&mut self) {
        if self.available_tags.is_empty() {
            return;
        }
        self.delete_tag_index = (self.delete_tag_index + 1) % self.available_tags.len();
    }

    /// Refresh recent sessions from database
    pub fn refresh_recent_sessions(&mut self) {
        self.recent_sessions = self
            .db
            .as_ref()
            .and_then(|d| d.get_recent_sessions(20).ok())
            .unwrap_or_default();
        // Adjust index if needed
        if self.session_edit_index >= self.recent_sessions.len() && !self.recent_sessions.is_empty()
        {
            self.session_edit_index = self.recent_sessions.len() - 1;
        }
    }

    /// Delete the session at session_edit_index
    pub fn delete_current_session(&mut self) {
        if self.recent_sessions.is_empty() {
            return;
        }
        if self.session_edit_index >= self.recent_sessions.len() {
            self.session_edit_index = 0;
        }
        let session_id = self.recent_sessions[self.session_edit_index].0.id;
        let deleted = self
            .db
            .as_ref()
            .map(|db| db.delete_session(session_id).is_ok())
            .unwrap_or(false);
        if deleted {
            self.refresh_recent_sessions();
            // Update stats
            if let Some(ref db) = self.db {
                if let Ok(stats) = db.get_today_stats() {
                    self.today_work_seconds = stats.total_work_seconds;
                    self.today_sessions = stats.sessions_completed;
                }
            }
        }
    }

    /// Update the tag of the session at session_edit_index
    pub fn update_current_session_tag(&mut self, tag_id: Option<i64>) {
        if self.recent_sessions.is_empty() {
            return;
        }
        if self.session_edit_index >= self.recent_sessions.len() {
            return;
        }
        let session_id = self.recent_sessions[self.session_edit_index].0.id;
        if let Some(ref db) = self.db {
            if db.update_session_tag(session_id, tag_id).is_ok() {
                self.refresh_recent_sessions();
            }
        }
    }

    /// Cycle session_edit_index through recent sessions
    pub fn cycle_session_edit(&mut self) {
        if self.recent_sessions.is_empty() {
            return;
        }
        self.session_edit_index = (self.session_edit_index + 1) % self.recent_sessions.len();
    }

    /// Cycle session_edit_index backwards
    pub fn cycle_session_edit_back(&mut self) {
        if self.recent_sessions.is_empty() {
            return;
        }
        if self.session_edit_index > 0 {
            self.session_edit_index -= 1;
        } else {
            self.session_edit_index = self.recent_sessions.len() - 1;
        }
    }

    /// Start recording a new session
    fn start_session_recording(&mut self) {
        if let Some(ref db) = self.db {
            let session_type = match self.timer.state {
                TimerState::Work => SessionType::Work,
                TimerState::ShortBreak => SessionType::ShortBreak,
                TimerState::LongBreak => SessionType::LongBreak,
            };
            // Start session with tag if selected
            let result = if let Some(tag) = self.selected_tag() {
                db.start_session_with_tag(session_type, Some(tag.id))
            } else {
                db.start_session(session_type)
            };
            if let Ok(id) = result {
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

                // Try to sync to cloud (silently fails if offline or not logged in)
                let _ = sync::try_sync_session(db.connection(), session_id);

                // Update today's stats for work sessions
                if state == TimerState::Work {
                    self.today_work_seconds += duration as i32;
                    self.today_sessions += 1;
                    self.total_sessions += 1;

                    // Refresh streak info (may have started a new streak today)
                    if let Ok(streak) = db.get_streak() {
                        self.current_streak = streak.current;
                        self.longest_streak = streak.longest;
                    }
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
                SettingsItem::AccentColor => {
                    if self.accent_index > 0 {
                        self.accent_index -= 1;
                    } else {
                        self.accent_index = self.available_accents.len() - 1;
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
                SettingsItem::FocusMode => {
                    if self.focus_mode_index > 0 {
                        self.focus_mode_index -= 1;
                    } else {
                        self.focus_mode_index = 1; // Cycle: Classic(0) <-> Flowtime(1)
                    }
                    self.config.focus.mode = match self.focus_mode_index {
                        0 => FocusMode::Classic,
                        _ => FocusMode::Flowtime,
                    };
                    // Update timer flowtime mode
                    self.timer
                        .set_flowtime(self.config.focus.mode == FocusMode::Flowtime);
                }
                SettingsItem::BreakSnooze => {
                    self.config.focus.break_snooze_enabled =
                        !self.config.focus.break_snooze_enabled;
                }
                SettingsItem::SoundEnabled => {
                    self.config.notifications.sound = !self.config.notifications.sound;
                }
                SettingsItem::DesktopNotification => {
                    self.config.notifications.desktop = !self.config.notifications.desktop;
                }
                SettingsItem::DailySessionsGoal => {
                    if self.config.goals.daily_sessions < 20 {
                        self.config.goals.daily_sessions += 1;
                        // Auto-calculate weekly = daily * 7
                        self.config.goals.weekly_sessions = self.config.goals.daily_sessions * 7;
                    }
                }
                SettingsItem::DailyMinutesGoal => {
                    if self.config.goals.daily_minutes < 480 {
                        self.config.goals.daily_minutes += 30;
                        // Auto-calculate weekly = daily * 7
                        self.config.goals.weekly_minutes = self.config.goals.daily_minutes * 7;
                    }
                }
                SettingsItem::WeeklySessionsGoal => {
                    if self.config.goals.weekly_sessions < 100 {
                        self.config.goals.weekly_sessions += 5;
                    }
                }
                SettingsItem::WeeklyMinutesGoal => {
                    if self.config.goals.weekly_minutes < 2400 {
                        self.config.goals.weekly_minutes += 60;
                    }
                }
                SettingsItem::DeleteTag => {
                    // Cycle to previous tag for deletion
                    if !self.available_tags.is_empty() {
                        if self.delete_tag_index > 0 {
                            self.delete_tag_index -= 1;
                        } else {
                            self.delete_tag_index = self.available_tags.len() - 1;
                        }
                    }
                }
                SettingsItem::EditSessionTag | SettingsItem::DeleteSession => {
                    // Cycle to previous session
                    self.cycle_session_edit_back();
                }
                _ => {}
            }
        } else if self.settings_index > 0 {
            self.settings_index -= 1;
            // Skip header items
            while self.settings_index > 0 && SettingsItem::all()[self.settings_index].is_header() {
                self.settings_index -= 1;
            }
            self.adjust_settings_scroll();
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
                SettingsItem::AccentColor => {
                    if self.accent_index < self.available_accents.len() - 1 {
                        self.accent_index += 1;
                    } else {
                        self.accent_index = 0;
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
                SettingsItem::FocusMode => {
                    if self.focus_mode_index < 1 {
                        self.focus_mode_index += 1;
                    } else {
                        self.focus_mode_index = 0; // Cycle: Flowtime(1) -> Classic(0)
                    }
                    self.config.focus.mode = match self.focus_mode_index {
                        0 => FocusMode::Classic,
                        _ => FocusMode::Flowtime,
                    };
                    // Update timer flowtime mode
                    self.timer
                        .set_flowtime(self.config.focus.mode == FocusMode::Flowtime);
                }
                SettingsItem::BreakSnooze => {
                    self.config.focus.break_snooze_enabled =
                        !self.config.focus.break_snooze_enabled;
                }
                SettingsItem::SoundEnabled => {
                    self.config.notifications.sound = !self.config.notifications.sound;
                }
                SettingsItem::DesktopNotification => {
                    self.config.notifications.desktop = !self.config.notifications.desktop;
                }
                SettingsItem::DailySessionsGoal => {
                    if self.config.goals.daily_sessions > 0 {
                        self.config.goals.daily_sessions -= 1;
                        // Auto-calculate weekly = daily * 7
                        self.config.goals.weekly_sessions = self.config.goals.daily_sessions * 7;
                    }
                }
                SettingsItem::DailyMinutesGoal => {
                    if self.config.goals.daily_minutes >= 30 {
                        self.config.goals.daily_minutes -= 30;
                    } else {
                        self.config.goals.daily_minutes = 0;
                    }
                    // Auto-calculate weekly = daily * 7
                    self.config.goals.weekly_minutes = self.config.goals.daily_minutes * 7;
                }
                SettingsItem::WeeklySessionsGoal => {
                    if self.config.goals.weekly_sessions >= 5 {
                        self.config.goals.weekly_sessions -= 5;
                    } else {
                        self.config.goals.weekly_sessions = 0;
                    }
                }
                SettingsItem::WeeklyMinutesGoal => {
                    if self.config.goals.weekly_minutes >= 60 {
                        self.config.goals.weekly_minutes -= 60;
                    } else {
                        self.config.goals.weekly_minutes = 0;
                    }
                }
                SettingsItem::DeleteTag => {
                    // Cycle to next tag for deletion
                    self.cycle_delete_tag();
                }
                SettingsItem::EditSessionTag | SettingsItem::DeleteSession => {
                    // Cycle to next session
                    self.cycle_session_edit();
                }
                _ => {}
            }
        } else if self.settings_index < SettingsItem::all().len() - 1 {
            self.settings_index += 1;
            // Skip header items
            while self.settings_index < SettingsItem::all().len() - 1
                && SettingsItem::all()[self.settings_index].is_header()
            {
                self.settings_index += 1;
            }
            self.adjust_settings_scroll();
        }
    }

    /// Adjust scroll offset to keep selected item visible
    /// Assumes a visible window of about 10 items (can be adjusted based on actual terminal size)
    fn adjust_settings_scroll(&mut self) {
        const VISIBLE_ITEMS: usize = 10;

        // If selected index is above the visible window, scroll up
        if self.settings_index < self.settings_scroll_offset {
            self.settings_scroll_offset = self.settings_index;
        }

        // If selected index is below the visible window, scroll down
        if self.settings_index >= self.settings_scroll_offset + VISIBLE_ITEMS {
            self.settings_scroll_offset = self.settings_index - VISIBLE_ITEMS + 1;
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
            | SettingsItem::AccentColor
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
            SettingsItem::FocusMode => {
                if self.editing {
                    // Apply changes
                    self.editing = false;
                    self.apply_settings();
                } else {
                    self.editing = true;
                }
            }
            SettingsItem::BreakSnooze => {
                // Toggle break snooze directly
                self.config.focus.break_snooze_enabled = !self.config.focus.break_snooze_enabled;
                self.apply_settings();
            }
            SettingsItem::SoundEnabled => {
                // Toggle sound directly
                self.config.notifications.sound = !self.config.notifications.sound;
                self.apply_settings();
            }
            SettingsItem::DesktopNotification => {
                // Toggle desktop notification directly
                self.config.notifications.desktop = !self.config.notifications.desktop;
                self.apply_settings();
            }
            SettingsItem::DailySessionsGoal
            | SettingsItem::DailyMinutesGoal
            | SettingsItem::WeeklySessionsGoal
            | SettingsItem::WeeklyMinutesGoal => {
                if self.editing {
                    // Apply changes
                    self.editing = false;
                    self.apply_settings();
                } else {
                    self.editing = true;
                }
            }
            SettingsItem::TagsHeader => {
                // Header is not selectable, skip to next item
            }
            SettingsItem::AddTag => {
                if self.tag_input_mode {
                    // Confirm: add the tag
                    if !self.tag_input.is_empty() {
                        self.add_tag(&self.tag_input.clone());
                        self.tag_input.clear();
                    }
                    self.tag_input_mode = false;
                } else {
                    // Enter input mode
                    self.tag_input_mode = true;
                    self.tag_input.clear();
                }
            }
            SettingsItem::DeleteTag => {
                if self.editing {
                    // Confirm: delete the selected tag
                    self.delete_current_tag();
                    self.editing = false;
                } else if !self.available_tags.is_empty() {
                    // Enter edit mode to select which tag to delete
                    self.editing = true;
                }
            }
            SettingsItem::SessionsHeader => {
                // Header is not selectable, skip to next item
            }
            SettingsItem::EditSessionTag => {
                if self.editing {
                    // Confirm: apply the selected tag to the session
                    let tag_id = self
                        .session_tag_edit_index
                        .and_then(|i| self.available_tags.get(i))
                        .map(|t| t.id);
                    self.update_current_session_tag(tag_id);
                    self.editing = false;
                    self.session_tag_edit_index = None;
                } else if !self.recent_sessions.is_empty() {
                    // Enter edit mode to select session and tag
                    self.editing = true;
                    // Initialize tag edit index based on current session's tag
                    if let Some((_, ref tag)) = self.recent_sessions.get(self.session_edit_index) {
                        self.session_tag_edit_index = tag
                            .as_ref()
                            .and_then(|t| self.available_tags.iter().position(|at| at.id == t.id));
                    }
                }
            }
            SettingsItem::DeleteSession => {
                if self.editing {
                    // Confirm: delete the selected session
                    self.delete_current_session();
                    self.editing = false;
                } else if !self.recent_sessions.is_empty() {
                    // Enter edit mode to select which session to delete
                    self.editing = true;
                }
            }
        }
    }

    fn apply_settings(&mut self) {
        // Apply theme and accent color
        self.config.appearance.theme = self.available_themes[self.theme_index].clone();
        self.config.appearance.accent = self.available_accents[self.accent_index].clone();
        self.theme = Theme::by_name(&self.config.appearance.theme)
            .with_accent(&self.config.appearance.accent);

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
            SettingsItem::AccentColor => self.available_accents[self.accent_index].clone(),
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
            SettingsItem::SoundEnabled => {
                if self.config.notifications.sound {
                    "ON".to_string()
                } else {
                    "OFF".to_string()
                }
            }
            SettingsItem::DesktopNotification => {
                if self.config.notifications.desktop {
                    "ON".to_string()
                } else {
                    "OFF".to_string()
                }
            }
            SettingsItem::DailySessionsGoal => {
                if self.config.goals.daily_sessions == 0 {
                    "Not set".to_string()
                } else {
                    format!("{} sessions", self.config.goals.daily_sessions)
                }
            }
            SettingsItem::DailyMinutesGoal => {
                if self.config.goals.daily_minutes == 0 {
                    "Not set".to_string()
                } else {
                    format!("{} min", self.config.goals.daily_minutes)
                }
            }
            SettingsItem::WeeklySessionsGoal => {
                if self.config.goals.weekly_sessions == 0 {
                    "Not set".to_string()
                } else {
                    format!("{} sessions", self.config.goals.weekly_sessions)
                }
            }
            SettingsItem::WeeklyMinutesGoal => {
                if self.config.goals.weekly_minutes == 0 {
                    "Not set".to_string()
                } else {
                    format!("{} min", self.config.goals.weekly_minutes)
                }
            }
            SettingsItem::FocusMode => {
                let modes = ["🍅 Classic", "🌊 Flowtime"];
                modes[self.focus_mode_index].to_string()
            }
            SettingsItem::BreakSnooze => {
                if self.config.focus.break_snooze_enabled {
                    "ON (+5min)".to_string()
                } else {
                    "OFF".to_string()
                }
            }
            SettingsItem::TagsHeader | SettingsItem::AddTag | SettingsItem::DeleteTag => {
                String::new()
            }
            SettingsItem::SessionsHeader
            | SettingsItem::EditSessionTag
            | SettingsItem::DeleteSession => String::new(),
            SettingsItem::Back => String::new(),
        }
    }

    /// Get the current icon type
    pub fn current_icon(&self) -> IconType {
        self.available_icons[self.icon_index]
    }

    /// Get the current accent color name
    pub fn current_accent(&self) -> &str {
        &self.available_accents[self.accent_index]
    }

    /// Check if rainbow mode is enabled
    pub fn is_rainbow_mode(&self) -> bool {
        self.current_accent() == "rainbow"
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
                        KeyCode::Char('t') => app.cycle_tag(),
                        KeyCode::Char('m') => app.cycle_focus_mode(),
                        KeyCode::Char('z') => app.snooze_break(),
                        KeyCode::Tab => app.toggle_settings(),
                        _ => {}
                    },
                    AppView::Settings => {
                        // Handle tag input mode separately
                        if app.tag_input_mode {
                            match key.code {
                                KeyCode::Enter => {
                                    // Confirm tag input
                                    if !app.tag_input.is_empty() {
                                        let name = app.tag_input.clone();
                                        app.add_tag(&name);
                                        app.tag_input.clear();
                                    }
                                    app.tag_input_mode = false;
                                }
                                KeyCode::Esc => {
                                    // Cancel tag input
                                    app.tag_input.clear();
                                    app.tag_input_mode = false;
                                }
                                KeyCode::Backspace => {
                                    app.tag_input.pop();
                                }
                                KeyCode::Char(c) => {
                                    // Add character to input (limit length)
                                    if app.tag_input.len() < 30 {
                                        app.tag_input.push(c);
                                    }
                                }
                                _ => {}
                            }
                        } else {
                            match key.code {
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
                            }
                        }
                    }
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
