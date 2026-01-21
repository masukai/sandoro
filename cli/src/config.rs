//! Configuration management
//!
//! Handles reading and writing config.toml

use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Focus mode type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum FocusMode {
    #[default]
    Classic,
    Flowtime,
}

impl FocusMode {
    pub fn as_str(&self) -> &'static str {
        match self {
            FocusMode::Classic => "classic",
            FocusMode::Flowtime => "flowtime",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "flowtime" => FocusMode::Flowtime,
            _ => FocusMode::Classic,
        }
    }

    pub fn description(&self) -> &'static str {
        match self {
            FocusMode::Classic => "Classic Pomodoro: fixed work/break intervals",
            FocusMode::Flowtime => "Flowtime: work as long as you want, break = work time / 5",
        }
    }
}

/// Application configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    #[serde(default)]
    pub timer: TimerConfig,
    #[serde(default)]
    pub appearance: AppearanceConfig,
    #[serde(default)]
    pub notifications: NotificationsConfig,
    #[serde(default)]
    pub goals: GoalConfig,
    #[serde(default)]
    pub focus: FocusConfig,
    #[serde(default)]
    pub account: AccountConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimerConfig {
    #[serde(default = "default_work_duration")]
    pub work_duration: u32,
    #[serde(default = "default_short_break")]
    pub short_break: u32,
    #[serde(default = "default_long_break")]
    pub long_break: u32,
    #[serde(default = "default_sessions_until_long")]
    pub sessions_until_long: u32,
    #[serde(default)]
    pub auto_start: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppearanceConfig {
    #[serde(default = "default_icon")]
    pub icon: String,
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_accent")]
    pub accent: String,
    #[serde(default = "default_language")]
    pub language: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoalConfig {
    #[serde(default)]
    pub daily_sessions: u32,
    #[serde(default)]
    pub daily_minutes: u32,
    #[serde(default)]
    pub weekly_sessions: u32,
    #[serde(default)]
    pub weekly_minutes: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationsConfig {
    #[serde(default = "default_true")]
    pub sound: bool,
    #[serde(default = "default_true")]
    pub desktop: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FocusConfig {
    #[serde(default)]
    pub mode: FocusMode,
    #[serde(default)]
    pub break_snooze_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountConfig {
    #[serde(default)]
    pub license_key: String,
}

// Default value functions
fn default_work_duration() -> u32 {
    25
}
fn default_short_break() -> u32 {
    5
}
fn default_long_break() -> u32 {
    15
}
fn default_sessions_until_long() -> u32 {
    4
}
fn default_icon() -> String {
    "hourglass".to_string()
}
fn default_theme() -> String {
    "default".to_string()
}
fn default_accent() -> String {
    "cyan".to_string()
}
fn default_language() -> String {
    "ja".to_string()
}
fn default_true() -> bool {
    true
}

// Note: We use manual Default implementations because the fields use
// custom default functions via #[serde(default = "...")] for TOML deserialization.
// These implementations ensure consistency between Default::default() and serde defaults.
#[allow(clippy::derivable_impls)]
impl Default for Config {
    fn default() -> Self {
        Self {
            timer: TimerConfig::default(),
            appearance: AppearanceConfig::default(),
            notifications: NotificationsConfig::default(),
            goals: GoalConfig::default(),
            focus: FocusConfig::default(),
            account: AccountConfig::default(),
        }
    }
}

impl Default for TimerConfig {
    fn default() -> Self {
        Self {
            work_duration: default_work_duration(),
            short_break: default_short_break(),
            long_break: default_long_break(),
            sessions_until_long: default_sessions_until_long(),
            auto_start: false,
        }
    }
}

impl Default for AppearanceConfig {
    fn default() -> Self {
        Self {
            icon: default_icon(),
            theme: default_theme(),
            accent: default_accent(),
            language: default_language(),
        }
    }
}

#[allow(clippy::derivable_impls)]
impl Default for GoalConfig {
    fn default() -> Self {
        Self {
            daily_sessions: 0,
            daily_minutes: 0,
            weekly_sessions: 0,
            weekly_minutes: 0,
        }
    }
}

impl Default for NotificationsConfig {
    fn default() -> Self {
        Self {
            sound: default_true(),
            desktop: default_true(),
        }
    }
}

#[allow(clippy::derivable_impls)]
impl Default for FocusConfig {
    fn default() -> Self {
        Self {
            mode: FocusMode::default(),
            break_snooze_enabled: false,
        }
    }
}

#[allow(clippy::derivable_impls)]
impl Default for AccountConfig {
    fn default() -> Self {
        Self {
            license_key: String::new(),
        }
    }
}

impl Config {
    /// Get the config directory path
    pub fn config_dir() -> Result<PathBuf> {
        let path = dirs::home_dir()
            .ok_or_else(|| anyhow::anyhow!("Could not find home directory"))?
            .join(".sandoro");
        Ok(path)
    }

    /// Get the config file path
    pub fn config_path() -> Result<PathBuf> {
        Ok(Self::config_dir()?.join("config.toml"))
    }

    /// Load config from file
    pub fn load() -> Result<Self> {
        let path = Self::config_path()?;
        if !path.exists() {
            return Ok(Self::default());
        }
        let content = std::fs::read_to_string(path)?;
        let config: Config = toml::from_str(&content)?;
        Ok(config)
    }

    /// Save config to file
    pub fn save(&self) -> Result<()> {
        let dir = Self::config_dir()?;
        std::fs::create_dir_all(&dir)?;
        let path = Self::config_path()?;
        let content = toml::to_string_pretty(self)?;
        std::fs::write(path, content)?;
        Ok(())
    }
}
