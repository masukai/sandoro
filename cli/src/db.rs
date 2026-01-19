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

/// A tag for categorizing sessions
#[derive(Debug, Clone)]
pub struct Tag {
    pub id: i64,
    pub name: String,
    pub color: Option<String>,
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

    /// Get a reference to the underlying connection (for sync operations)
    pub fn connection(&self) -> &Connection {
        &self.conn
    }

    /// Initialize database schema
    fn init_schema(&self) -> Result<()> {
        // Create tables first (without tag_id index since column might not exist yet)
        self.conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                color TEXT
            );

            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                started_at DATETIME NOT NULL,
                ended_at DATETIME,
                duration_seconds INTEGER,
                type TEXT NOT NULL CHECK (type IN ('work', 'short_break', 'long_break')),
                completed BOOLEAN DEFAULT FALSE,
                tag_id INTEGER REFERENCES tags(id)
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

        // Migration: add tag_id column if it doesn't exist (for existing DBs)
        self.migrate_add_tag_id()?;

        // Create tag index after migration ensures column exists
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_sessions_tag ON sessions(tag_id)",
            [],
        )?;

        Ok(())
    }

    /// Migration: Add tag_id column to sessions table if it doesn't exist
    fn migrate_add_tag_id(&self) -> Result<()> {
        // Check if tag_id column exists
        let mut stmt = self.conn.prepare("PRAGMA table_info(sessions)")?;
        let columns: Vec<String> = stmt
            .query_map([], |row| row.get::<_, String>(1))?
            .filter_map(|r| r.ok())
            .collect();

        if !columns.contains(&"tag_id".to_string()) {
            self.conn.execute(
                "ALTER TABLE sessions ADD COLUMN tag_id INTEGER REFERENCES tags(id)",
                [],
            )?;
        }
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
            check_date -= Duration::days(1);
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

    // === Tag operations ===

    /// Create a new tag
    pub fn create_tag(&self, name: &str, color: Option<&str>) -> Result<i64> {
        self.conn.execute(
            "INSERT INTO tags (name, color) VALUES (?1, ?2)",
            params![name, color],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    /// Get all tags
    pub fn get_all_tags(&self) -> Result<Vec<Tag>> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, name, color FROM tags ORDER BY name")?;
        let tags = stmt
            .query_map([], |row| {
                Ok(Tag {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    color: row.get(2)?,
                })
            })?
            .filter_map(|r| r.ok())
            .collect();
        Ok(tags)
    }

    /// Get a tag by ID
    pub fn get_tag(&self, tag_id: i64) -> Result<Option<Tag>> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, name, color FROM tags WHERE id = ?1")?;
        let tag = stmt
            .query_row(params![tag_id], |row| {
                Ok(Tag {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    color: row.get(2)?,
                })
            })
            .ok();
        Ok(tag)
    }

    /// Get a tag by name
    pub fn get_tag_by_name(&self, name: &str) -> Result<Option<Tag>> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, name, color FROM tags WHERE name = ?1")?;
        let tag = stmt
            .query_row(params![name], |row| {
                Ok(Tag {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    color: row.get(2)?,
                })
            })
            .ok();
        Ok(tag)
    }

    /// Delete a tag (sets sessions with this tag to NULL)
    pub fn delete_tag(&self, tag_id: i64) -> Result<()> {
        // First, remove tag from sessions
        self.conn.execute(
            "UPDATE sessions SET tag_id = NULL WHERE tag_id = ?1",
            params![tag_id],
        )?;
        // Then delete the tag
        self.conn
            .execute("DELETE FROM tags WHERE id = ?1", params![tag_id])?;
        Ok(())
    }

    /// Update a tag
    pub fn update_tag(&self, tag_id: i64, name: &str, color: Option<&str>) -> Result<()> {
        self.conn.execute(
            "UPDATE tags SET name = ?1, color = ?2 WHERE id = ?3",
            params![name, color, tag_id],
        )?;
        Ok(())
    }

    /// Start a new session with optional tag
    pub fn start_session_with_tag(
        &self,
        session_type: SessionType,
        tag_id: Option<i64>,
    ) -> Result<i64> {
        let now = Utc::now();
        self.conn.execute(
            "INSERT INTO sessions (started_at, type, completed, tag_id) VALUES (?1, ?2, FALSE, ?3)",
            params![now.to_rfc3339(), session_type.as_str(), tag_id],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    /// Delete a session by ID
    pub fn delete_session(&self, session_id: i64) -> Result<()> {
        self.conn
            .execute("DELETE FROM sessions WHERE id = ?1", params![session_id])?;
        Ok(())
    }

    /// Update a session's tag
    pub fn update_session_tag(&self, session_id: i64, tag_id: Option<i64>) -> Result<()> {
        self.conn.execute(
            "UPDATE sessions SET tag_id = ?1 WHERE id = ?2",
            params![tag_id, session_id],
        )?;
        Ok(())
    }

    /// Get recent completed work sessions
    pub fn get_recent_sessions(&self, limit: i32) -> Result<Vec<(Session, Option<Tag>)>> {
        let mut stmt = self.conn.prepare(
            r#"
            SELECT s.id, s.started_at, s.ended_at, s.duration_seconds, s.type, s.completed,
                   t.id, t.name, t.color
            FROM sessions s
            LEFT JOIN tags t ON s.tag_id = t.id
            WHERE s.type = 'work' AND s.completed = TRUE
            ORDER BY s.started_at DESC
            LIMIT ?1
            "#,
        )?;

        let sessions = stmt
            .query_map(params![limit], |row| {
                let session = Session {
                    id: row.get(0)?,
                    started_at: DateTime::parse_from_rfc3339(&row.get::<_, String>(1)?)
                        .unwrap_or_else(|_| Utc::now().into())
                        .with_timezone(&Utc),
                    ended_at: row.get::<_, Option<String>>(2)?.map(|s| {
                        DateTime::parse_from_rfc3339(&s)
                            .unwrap_or_else(|_| Utc::now().into())
                            .with_timezone(&Utc)
                    }),
                    duration_seconds: row.get(3)?,
                    session_type: row.get(4)?,
                    completed: row.get(5)?,
                };
                let tag_id: Option<i64> = row.get(6)?;
                let tag = if let Some(id) = tag_id {
                    Some(Tag {
                        id,
                        name: row.get(7)?,
                        color: row.get(8)?,
                    })
                } else {
                    None
                };
                Ok((session, tag))
            })?
            .filter_map(|r| r.ok())
            .collect();

        Ok(sessions)
    }

    /// Get statistics grouped by tag
    pub fn get_stats_by_tag(&self, days: i32) -> Result<Vec<(Option<Tag>, i32, i32)>> {
        let offset = format!("-{} days", days);
        let mut stmt = self.conn.prepare(
            r#"
            SELECT t.id, t.name, t.color,
                   COALESCE(SUM(s.duration_seconds), 0) as total_seconds,
                   COUNT(s.id) as sessions
            FROM sessions s
            LEFT JOIN tags t ON s.tag_id = t.id
            WHERE date(s.started_at) >= date('now', ?1)
              AND s.type = 'work'
              AND s.completed = TRUE
            GROUP BY s.tag_id
            ORDER BY total_seconds DESC
            "#,
        )?;

        let stats = stmt
            .query_map(params![offset], |row| {
                let tag_id: Option<i64> = row.get(0)?;
                let tag = if let Some(id) = tag_id {
                    Some(Tag {
                        id,
                        name: row.get(1)?,
                        color: row.get(2)?,
                    })
                } else {
                    None
                };
                let total_seconds: i32 = row.get(3)?;
                let sessions: i32 = row.get(4)?;
                Ok((tag, total_seconds, sessions))
            })?
            .filter_map(|r| r.ok())
            .collect();

        Ok(stats)
    }
}
