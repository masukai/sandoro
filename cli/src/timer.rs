//! Timer logic and state management

use std::time::{Duration, Instant};

/// Timer states
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TimerState {
    Work,
    ShortBreak,
    LongBreak,
}

impl TimerState {
    pub fn label(&self) -> &'static str {
        match self {
            TimerState::Work => "WORKING",
            TimerState::ShortBreak => "SHORT BREAK",
            TimerState::LongBreak => "LONG BREAK",
        }
    }
}

/// Pomodoro timer
pub struct Timer {
    /// Current state
    pub state: TimerState,
    /// Remaining time in seconds
    pub remaining_seconds: u32,
    /// Whether the timer is paused
    pub is_paused: bool,
    /// Work duration in minutes
    pub work_duration: u32,
    /// Short break duration in minutes
    pub short_break_duration: u32,
    /// Long break duration in minutes
    pub long_break_duration: u32,
    /// Last tick time
    last_tick: Instant,
    /// Accumulated time since last second
    accumulated: Duration,
}

impl Timer {
    pub fn new(work_minutes: u32, short_break_minutes: u32, long_break_minutes: u32) -> Self {
        Self {
            state: TimerState::Work,
            remaining_seconds: work_minutes * 60,
            is_paused: true,
            work_duration: work_minutes,
            short_break_duration: short_break_minutes,
            long_break_duration: long_break_minutes,
            last_tick: Instant::now(),
            accumulated: Duration::ZERO,
        }
    }

    /// Tick the timer (call this every frame)
    pub fn tick(&mut self) {
        if self.is_paused {
            self.last_tick = Instant::now();
            return;
        }

        let now = Instant::now();
        let elapsed = now - self.last_tick;
        self.last_tick = now;
        self.accumulated += elapsed;

        // Decrement seconds
        while self.accumulated >= Duration::from_secs(1) {
            self.accumulated -= Duration::from_secs(1);
            if self.remaining_seconds > 0 {
                self.remaining_seconds -= 1;
            }
        }

        // Check for completion
        if self.remaining_seconds == 0 {
            self.transition_to_next_state();
        }
    }

    /// Toggle pause state
    pub fn toggle_pause(&mut self) {
        self.is_paused = !self.is_paused;
        if !self.is_paused {
            self.last_tick = Instant::now();
        }
    }

    /// Reset current timer
    pub fn reset(&mut self) {
        self.remaining_seconds = self.duration_for_state(self.state) * 60;
        self.is_paused = true;
        self.accumulated = Duration::ZERO;
    }

    /// Skip to next state
    pub fn skip(&mut self) {
        self.transition_to_next_state();
    }

    /// Get progress percentage (0.0 - 100.0)
    pub fn progress_percent(&self) -> f32 {
        let total = self.duration_for_state(self.state) * 60;
        if total == 0 {
            return 0.0;
        }
        ((total - self.remaining_seconds) as f32 / total as f32) * 100.0
    }

    /// Get remaining time as (minutes, seconds)
    pub fn remaining_time(&self) -> (u32, u32) {
        (self.remaining_seconds / 60, self.remaining_seconds % 60)
    }

    /// Get formatted remaining time string
    pub fn formatted_time(&self) -> String {
        let (min, sec) = self.remaining_time();
        format!("{:02}:{:02}", min, sec)
    }

    fn duration_for_state(&self, state: TimerState) -> u32 {
        match state {
            TimerState::Work => self.work_duration,
            TimerState::ShortBreak => self.short_break_duration,
            TimerState::LongBreak => self.long_break_duration,
        }
    }

    fn transition_to_next_state(&mut self) {
        self.state = match self.state {
            TimerState::Work => TimerState::ShortBreak, // TODO: Track sessions for long break
            TimerState::ShortBreak => TimerState::Work,
            TimerState::LongBreak => TimerState::Work,
        };
        self.remaining_seconds = self.duration_for_state(self.state) * 60;
        self.is_paused = true;
        self.accumulated = Duration::ZERO;
    }
}
