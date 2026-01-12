//! SQLite database operations
//!
//! Handles session recording and statistics

// TODO: These will be used when session recording is implemented in the app
#![allow(dead_code)]

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

/// Streak information
#[derive(Debug, Clone)]
pub struct StreakInfo {
    pub current: i32,
    pub longest: i32,
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
        self.get_date_stats(&today)
    }

    /// Get statistics for a specific date (YYYY-MM-DD format)
    pub fn get_date_stats(&self, date: &str) -> Result<DailyStats> {
        let mut stmt = self.conn.prepare(
            "SELECT COALESCE(SUM(duration_seconds), 0), COUNT(*)
             FROM sessions
             WHERE date(started_at) = ?1 AND type = 'work' AND completed = TRUE",
        )?;

        let (total_seconds, count): (i32, i32) =
            stmt.query_row(params![date], |row| Ok((row.get(0)?, row.get(1)?)))?;

        Ok(DailyStats {
            date: date.to_string(),
            total_work_seconds: total_seconds,
            sessions_completed: count,
            longest_streak: 0,
        })
    }

    /// Get stats for the last N days
    pub fn get_daily_stats(&self, days: i32) -> Result<Vec<DailyStats>> {
        let mut stmt = self.conn.prepare(
            "SELECT date(started_at) as date,
                    COALESCE(SUM(duration_seconds), 0) as total_seconds,
                    COUNT(*) as sessions
             FROM sessions
             WHERE date(started_at) >= date('now', ?1)
               AND type = 'work'
               AND completed = TRUE
             GROUP BY date(started_at)
             ORDER BY date(started_at) DESC",
        )?;

        let offset = format!("-{} days", days);
        let stats = stmt
            .query_map(params![offset], |row| {
                Ok(DailyStats {
                    date: row.get(0)?,
                    total_work_seconds: row.get(1)?,
                    sessions_completed: row.get(2)?,
                    longest_streak: 0,
                })
            })?
            .filter_map(|r| r.ok())
            .collect();

        Ok(stats)
    }

    /// Get weekly total (last 7 days)
    pub fn get_week_stats(&self) -> Result<DailyStats> {
        let mut stmt = self.conn.prepare(
            "SELECT COALESCE(SUM(duration_seconds), 0), COUNT(*)
             FROM sessions
             WHERE date(started_at) >= date('now', '-7 days')
               AND type = 'work'
               AND completed = TRUE",
        )?;

        let (total_seconds, count): (i32, i32) =
            stmt.query_row([], |row| Ok((row.get(0)?, row.get(1)?)))?;

        Ok(DailyStats {
            date: "Last 7 days".to_string(),
            total_work_seconds: total_seconds,
            sessions_completed: count,
            longest_streak: 0,
        })
    }

    /// Get monthly total (last 30 days)
    pub fn get_month_stats(&self) -> Result<DailyStats> {
        let mut stmt = self.conn.prepare(
            "SELECT COALESCE(SUM(duration_seconds), 0), COUNT(*)
             FROM sessions
             WHERE date(started_at) >= date('now', '-30 days')
               AND type = 'work'
               AND completed = TRUE",
        )?;

        let (total_seconds, count): (i32, i32) =
            stmt.query_row([], |row| Ok((row.get(0)?, row.get(1)?)))?;

        Ok(DailyStats {
            date: "Last 30 days".to_string(),
            total_work_seconds: total_seconds,
            sessions_completed: count,
            longest_streak: 0,
        })
    }

    /// Get previous week's total (8-14 days ago)
    pub fn get_previous_week_stats(&self) -> Result<DailyStats> {
        let mut stmt = self.conn.prepare(
            "SELECT COALESCE(SUM(duration_seconds), 0), COUNT(*)
             FROM sessions
             WHERE date(started_at) >= date('now', '-14 days')
               AND date(started_at) < date('now', '-7 days')
               AND type = 'work'
               AND completed = TRUE",
        )?;

        let (total_seconds, count): (i32, i32) =
            stmt.query_row([], |row| Ok((row.get(0)?, row.get(1)?)))?;

        Ok(DailyStats {
            date: "Previous 7 days".to_string(),
            total_work_seconds: total_seconds,
            sessions_completed: count,
            longest_streak: 0,
        })
    }

    /// Get previous month's total (31-60 days ago)
    pub fn get_previous_month_stats(&self) -> Result<DailyStats> {
        let mut stmt = self.conn.prepare(
            "SELECT COALESCE(SUM(duration_seconds), 0), COUNT(*)
             FROM sessions
             WHERE date(started_at) >= date('now', '-60 days')
               AND date(started_at) < date('now', '-30 days')
               AND type = 'work'
               AND completed = TRUE",
        )?;

        let (total_seconds, count): (i32, i32) =
            stmt.query_row([], |row| Ok((row.get(0)?, row.get(1)?)))?;

        Ok(DailyStats {
            date: "Previous 30 days".to_string(),
            total_work_seconds: total_seconds,
            sessions_completed: count,
            longest_streak: 0,
        })
    }

    /// Get heatmap data for the last N weeks (returns all days including zeros)
    pub fn get_heatmap_data(&self, weeks: i32) -> Result<Vec<DailyStats>> {
        use chrono::{Duration, Local};

        let days = weeks * 7;
        let today = Local::now().date_naive();

        // Get actual data from DB
        let mut stmt = self.conn.prepare(
            "SELECT date(started_at) as date,
                    COALESCE(SUM(duration_seconds), 0) as total_seconds,
                    COUNT(*) as sessions
             FROM sessions
             WHERE date(started_at) >= date('now', ?1)
               AND type = 'work'
               AND completed = TRUE
             GROUP BY date(started_at)",
        )?;

        let offset = format!("-{} days", days);
        let db_stats: std::collections::HashMap<String, (i32, i32)> = stmt
            .query_map(params![offset], |row| {
                let date: String = row.get(0)?;
                let total: i32 = row.get(1)?;
                let count: i32 = row.get(2)?;
                Ok((date, (total, count)))
            })?
            .filter_map(|r| r.ok())
            .collect();

        // Build full list including days with 0 activity
        let mut result = Vec::new();
        for i in 0..days {
            let date = today - Duration::days(i64::from(i));
            let date_str = date.format("%Y-%m-%d").to_string();
            let (total_seconds, sessions) = db_stats.get(&date_str).copied().unwrap_or((0, 0));
            result.push(DailyStats {
                date: date_str,
                total_work_seconds: total_seconds,
                sessions_completed: sessions,
                longest_streak: 0,
            });
        }

        // Reverse so oldest is first
        result.reverse();
        Ok(result)
    }

    /// Get streak information
    pub fn get_streak(&self) -> Result<StreakInfo> {
        use chrono::{Duration, Local, NaiveDate};
        use std::collections::HashSet;

        // Get all unique dates with completed work sessions
        let mut stmt = self.conn.prepare(
            "SELECT DISTINCT date(started_at) as date
             FROM sessions
             WHERE type = 'work' AND completed = TRUE
             ORDER BY date DESC",
        )?;

        let dates: HashSet<String> = stmt
            .query_map([], |row| row.get::<_, String>(0))?
            .filter_map(|r| r.ok())
            .collect();

        if dates.is_empty() {
            return Ok(StreakInfo {
                current: 0,
                longest: 0,
            });
        }

        let today = Local::now().date_naive();
        let today_str = today.format("%Y-%m-%d").to_string();

        // Calculate current streak (from today backwards)
        let mut current_streak = 0;
        let mut check_date = today;

        // Check if today has activity, if not check yesterday
        if !dates.contains(&today_str) {
            check_date = today - Duration::days(1);
        }

        while dates.contains(&check_date.format("%Y-%m-%d").to_string()) {
            current_streak += 1;
            check_date = check_date - Duration::days(1);
        }

        // Calculate longest streak
        let mut sorted_dates: Vec<NaiveDate> = dates
            .iter()
            .filter_map(|d| NaiveDate::parse_from_str(d, "%Y-%m-%d").ok())
            .collect();
        sorted_dates.sort();
        sorted_dates.reverse();

        let mut longest_streak = 0;
        let mut temp_streak = 1;

        for i in 0..sorted_dates.len().saturating_sub(1) {
            let diff = (sorted_dates[i] - sorted_dates[i + 1]).num_days();
            if diff == 1 {
                temp_streak += 1;
            } else {
                longest_streak = longest_streak.max(temp_streak);
                temp_streak = 1;
            }
        }
        longest_streak = longest_streak.max(temp_streak);

        Ok(StreakInfo {
            current: current_streak,
            longest: longest_streak,
        })
    }

    /// Export all sessions to JSON format
    pub fn export_to_json(&self) -> Result<String> {
        let mut stmt = self.conn.prepare(
            "SELECT id, started_at, ended_at, duration_seconds, type, completed
             FROM sessions
             ORDER BY started_at DESC",
        )?;

        let sessions: Vec<serde_json::Value> = stmt
            .query_map([], |row| {
                Ok(serde_json::json!({
                    "id": row.get::<_, i64>(0)?,
                    "startedAt": row.get::<_, String>(1)?,
                    "endedAt": row.get::<_, Option<String>>(2)?,
                    "durationSeconds": row.get::<_, Option<i32>>(3)?,
                    "type": row.get::<_, String>(4)?,
                    "completed": row.get::<_, bool>(5)?
                }))
            })?
            .filter_map(|r| r.ok())
            .collect();

        Ok(serde_json::to_string_pretty(&sessions)?)
    }

    /// Export all sessions to CSV format
    pub fn export_to_csv(&self) -> Result<String> {
        let mut stmt = self.conn.prepare(
            "SELECT id, started_at, ended_at, duration_seconds, type, completed
             FROM sessions
             ORDER BY started_at DESC",
        )?;

        let mut csv = String::from("id,startedAt,endedAt,durationSeconds,type,completed\n");

        stmt.query_map([], |row| {
            let id: i64 = row.get(0)?;
            let started_at: String = row.get(1)?;
            let ended_at: Option<String> = row.get(2)?;
            let duration_seconds: Option<i32> = row.get(3)?;
            let session_type: String = row.get(4)?;
            let completed: bool = row.get(5)?;
            Ok((
                id,
                started_at,
                ended_at,
                duration_seconds,
                session_type,
                completed,
            ))
        })?
        .filter_map(|r| r.ok())
        .for_each(
            |(id, started_at, ended_at, duration_seconds, session_type, completed)| {
                csv.push_str(&format!(
                    "{},{},{},{},{},{}\n",
                    id,
                    started_at,
                    ended_at.unwrap_or_default(),
                    duration_seconds.map(|d| d.to_string()).unwrap_or_default(),
                    session_type,
                    completed
                ));
            },
        );

        Ok(csv)
    }
}
