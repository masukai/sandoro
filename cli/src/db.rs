//! SQLite database operations
//!
//! Handles session recording and statistics

use anyhow::Result;
use chrono::{DateTime, Utc};
use rusqlite::{params, Connection};
use std::path::PathBuf;

use crate::config::Config;

/// Session types
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SessionType {
    Work,
    ShortBreak,
    LongBreak,
}

impl SessionType {
    pub fn as_str(&self) -> &'static str {
        match self {
            SessionType::Work => "work",
            SessionType::ShortBreak => "short_break",
            SessionType::LongBreak => "long_break",
        }
    }
}

/// A recorded session
#[derive(Debug, Clone)]
pub struct Session {
    pub id: i64,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub duration_seconds: Option<i32>,
    pub session_type: String,
    pub completed: bool,
}

/// Daily statistics
#[derive(Debug, Clone)]
pub struct DailyStats {
    pub date: String,
    pub total_work_seconds: i32,
    pub sessions_completed: i32,
    pub longest_streak: i32,
}

/// Database connection wrapper
pub struct Database {
    conn: Connection,
}

impl Database {
    /// Get the database file path
    pub fn db_path() -> Result<PathBuf> {
        Ok(Config::config_dir()?.join("data.db"))
    }

    /// Open or create the database
    pub fn open() -> Result<Self> {
        let path = Self::db_path()?;
        std::fs::create_dir_all(path.parent().unwrap())?;
        let conn = Connection::open(path)?;
        let db = Self { conn };
        db.init_schema()?;
        Ok(db)
    }

    /// Initialize database schema
    fn init_schema(&self) -> Result<()> {
        self.conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                started_at DATETIME NOT NULL,
                ended_at DATETIME,
                duration_seconds INTEGER,
                type TEXT NOT NULL CHECK (type IN ('work', 'short_break', 'long_break')),
                completed BOOLEAN DEFAULT FALSE
            );

            CREATE TABLE IF NOT EXISTS daily_stats (
                date DATE PRIMARY KEY,
                total_work_seconds INTEGER DEFAULT 0,
                sessions_completed INTEGER DEFAULT 0,
                longest_streak INTEGER DEFAULT 0
            );

            CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
            CREATE INDEX IF NOT EXISTS idx_sessions_type ON sessions(type);
            "#,
        )?;
        Ok(())
    }

    /// Start a new session
    pub fn start_session(&self, session_type: SessionType) -> Result<i64> {
        let now = Utc::now();
        self.conn.execute(
            "INSERT INTO sessions (started_at, type, completed) VALUES (?1, ?2, FALSE)",
            params![now.to_rfc3339(), session_type.as_str()],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    /// Complete a session
    pub fn complete_session(&self, session_id: i64, duration_seconds: i32) -> Result<()> {
        let now = Utc::now();
        self.conn.execute(
            "UPDATE sessions SET ended_at = ?1, duration_seconds = ?2, completed = TRUE WHERE id = ?3",
            params![now.to_rfc3339(), duration_seconds, session_id],
        )?;
        Ok(())
    }

    /// Get today's statistics
    pub fn get_today_stats(&self) -> Result<DailyStats> {
        let today = Utc::now().format("%Y-%m-%d").to_string();

        let mut stmt = self.conn.prepare(
            "SELECT COALESCE(SUM(duration_seconds), 0), COUNT(*)
             FROM sessions
             WHERE date(started_at) = ?1 AND type = 'work' AND completed = TRUE",
        )?;

        let (total_seconds, count): (i32, i32) =
            stmt.query_row(params![today], |row| Ok((row.get(0)?, row.get(1)?)))?;

        Ok(DailyStats {
            date: today,
            total_work_seconds: total_seconds,
            sessions_completed: count,
            longest_streak: 0, // TODO: Calculate streak
        })
    }
}
