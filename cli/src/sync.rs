//! Sync module for SQLite <-> Supabase synchronization
//!
//! Handles bidirectional sync of sessions between local SQLite and cloud.

use anyhow::Result;
use chrono::{DateTime, NaiveDateTime, Utc};
use rusqlite::Connection;

use crate::auth;
use crate::supabase::{CloudSession, SupabaseClient};

/// Sync metadata stored in SQLite
const SYNC_METADATA_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS sync_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
)
"#;

/// Ensure sync metadata table exists
pub fn ensure_sync_table(conn: &Connection) -> Result<()> {
    conn.execute(SYNC_METADATA_TABLE, [])?;
    Ok(())
}

/// Get last sync timestamp
fn get_last_sync(conn: &Connection) -> Result<Option<DateTime<Utc>>> {
    let result: Option<String> = conn
        .query_row(
            "SELECT value FROM sync_metadata WHERE key = 'last_sync'",
            [],
            |row| row.get(0),
        )
        .ok();

    match result {
        Some(timestamp) => {
            let dt = DateTime::parse_from_rfc3339(&timestamp)
                .map(|dt| dt.with_timezone(&Utc))
                .ok();
            Ok(dt)
        }
        None => Ok(None),
    }
}

/// Set last sync timestamp
fn set_last_sync(conn: &Connection, timestamp: &DateTime<Utc>) -> Result<()> {
    conn.execute(
        "INSERT OR REPLACE INTO sync_metadata (key, value) VALUES ('last_sync', ?)",
        [timestamp.to_rfc3339()],
    )?;
    Ok(())
}

/// Get cloud session ID if this local session was synced
fn get_cloud_id(conn: &Connection, local_id: i64) -> Result<Option<String>> {
    let result: Option<String> = conn
        .query_row(
            "SELECT cloud_id FROM sessions WHERE id = ?",
            [local_id],
            |row| row.get(0),
        )
        .ok();
    Ok(result)
}

/// Mark local session as synced with cloud ID
fn mark_synced(conn: &Connection, local_id: i64, cloud_id: &str) -> Result<()> {
    // First check if cloud_id column exists
    let has_cloud_id: bool = conn
        .query_row(
            "SELECT COUNT(*) > 0 FROM pragma_table_info('sessions') WHERE name = 'cloud_id'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if !has_cloud_id {
        conn.execute("ALTER TABLE sessions ADD COLUMN cloud_id TEXT", [])?;
    }

    conn.execute(
        "UPDATE sessions SET cloud_id = ? WHERE id = ?",
        rusqlite::params![cloud_id, local_id],
    )?;
    Ok(())
}

/// Local session from SQLite
#[derive(Debug)]
struct LocalSession {
    id: i64,
    session_type: String,
    duration_seconds: i32,
    completed_at: String,
    tag: Option<String>,
    cloud_id: Option<String>,
}

/// Get unsynced local sessions
fn get_unsynced_sessions(conn: &Connection) -> Result<Vec<LocalSession>> {
    // Ensure cloud_id column exists
    let has_cloud_id: bool = conn
        .query_row(
            "SELECT COUNT(*) > 0 FROM pragma_table_info('sessions') WHERE name = 'cloud_id'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if !has_cloud_id {
        conn.execute("ALTER TABLE sessions ADD COLUMN cloud_id TEXT", [])?;
    }

    let mut stmt = conn.prepare(
        "SELECT s.id, s.type, s.duration_seconds, s.ended_at, t.name, s.cloud_id
         FROM sessions s
         LEFT JOIN tags t ON s.tag_id = t.id
         WHERE s.cloud_id IS NULL AND s.completed = 1
         ORDER BY s.ended_at ASC",
    )?;

    let sessions = stmt
        .query_map([], |row| {
            Ok(LocalSession {
                id: row.get(0)?,
                session_type: row.get(1)?,
                duration_seconds: row.get(2)?,
                completed_at: row.get(3)?,
                tag: row.get(4)?,
                cloud_id: row.get(5)?,
            })
        })?
        .filter_map(|r| r.ok())
        .collect();

    Ok(sessions)
}

/// Insert cloud session into local SQLite
fn insert_cloud_session(conn: &Connection, session: &CloudSession) -> Result<()> {
    // Check if already exists (by cloud_id)
    if let Some(id) = &session.id {
        let exists: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM sessions WHERE cloud_id = ?",
                [id],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if exists {
            return Ok(());
        }
    }

    // Parse completed_at to get started_at (subtract duration)
    let ended_at = &session.completed_at;

    conn.execute(
        "INSERT INTO sessions (type, duration_seconds, ended_at, started_at, completed, cloud_id)
         VALUES (?, ?, ?, datetime(?, '-' || ? || ' seconds'), 1, ?)",
        rusqlite::params![
            session.session_type,
            session.duration_seconds,
            ended_at,
            ended_at,
            session.duration_seconds,
            session.id,
        ],
    )?;

    Ok(())
}

/// Sync result
#[derive(Debug, Default)]
pub struct SyncResult {
    pub uploaded: usize,
    pub downloaded: usize,
    pub errors: Vec<String>,
}

/// Perform full sync
pub fn sync(conn: &Connection) -> Result<SyncResult> {
    let mut result = SyncResult::default();

    // Check if logged in
    let creds = match auth::load_credentials()? {
        Some(c) => c,
        None => {
            result.errors.push("Not logged in. Run 'sandoro login' first.".to_string());
            return Ok(result);
        }
    };

    // Ensure sync table exists
    ensure_sync_table(conn)?;

    // Create Supabase client
    let client = match SupabaseClient::new()? {
        Some(c) => c,
        None => {
            result.errors.push("Failed to create Supabase client".to_string());
            return Ok(result);
        }
    };

    // 1. Upload unsynced local sessions
    let unsynced = get_unsynced_sessions(conn)?;
    if !unsynced.is_empty() {
        println!("Uploading {} local sessions...", unsynced.len());

        for local in &unsynced {
            let cloud_session = CloudSession {
                id: Some(uuid::Uuid::new_v4().to_string()),
                user_id: creds.user_id.clone(),
                session_type: local.session_type.clone(),
                duration_seconds: local.duration_seconds,
                completed_at: local.completed_at.clone(),
                tag: local.tag.clone(),
                created_at: Some(Utc::now().to_rfc3339()),
                synced_from_cli: Some(true),
            };

            match client.upload_session(&cloud_session) {
                Ok(_) => {
                    if let Some(cloud_id) = &cloud_session.id {
                        let _ = mark_synced(conn, local.id, cloud_id);
                    }
                    result.uploaded += 1;
                }
                Err(e) => {
                    result.errors.push(format!("Failed to upload session {}: {}", local.id, e));
                }
            }
        }
    }

    // 2. Download new cloud sessions
    let last_sync = get_last_sync(conn)?;
    let cloud_sessions = if let Some(after) = last_sync {
        println!("Fetching sessions since {}...", after);
        client.get_sessions_after(&after)?
    } else {
        println!("Fetching all cloud sessions...");
        client.get_sessions()?
    };

    // Filter out sessions that were synced from CLI (avoid duplicates)
    let new_sessions: Vec<_> = cloud_sessions
        .into_iter()
        .filter(|s| !s.synced_from_cli.unwrap_or(false))
        .collect();

    if !new_sessions.is_empty() {
        println!("Downloading {} cloud sessions...", new_sessions.len());

        for session in &new_sessions {
            match insert_cloud_session(conn, session) {
                Ok(_) => result.downloaded += 1,
                Err(e) => {
                    result.errors.push(format!("Failed to insert session: {}", e));
                }
            }
        }
    }

    // Update last sync time
    set_last_sync(conn, &Utc::now())?;

    Ok(result)
}

/// Get sync status
pub fn get_sync_status(conn: &Connection) -> Result<String> {
    ensure_sync_table(conn)?;

    let logged_in = auth::is_logged_in();
    let last_sync = get_last_sync(conn)?;
    let unsynced_count: i64 = {
        let has_cloud_id: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM pragma_table_info('sessions') WHERE name = 'cloud_id'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if has_cloud_id {
            conn.query_row(
                "SELECT COUNT(*) FROM sessions WHERE cloud_id IS NULL AND completed = 1",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0)
        } else {
            conn.query_row("SELECT COUNT(*) FROM sessions WHERE completed = 1", [], |row| row.get(0))
                .unwrap_or(0)
        }
    };

    let mut status = String::new();

    if logged_in {
        if let Some((user_id, email)) = auth::get_current_user()? {
            status.push_str(&format!(
                "Logged in as: {}\n",
                email.as_deref().unwrap_or(&user_id)
            ));
        }
    } else {
        status.push_str("Not logged in\n");
    }

    if let Some(sync_time) = last_sync {
        status.push_str(&format!("Last sync: {}\n", sync_time.format("%Y-%m-%d %H:%M:%S UTC")));
    } else {
        status.push_str("Never synced\n");
    }

    status.push_str(&format!("Unsynced sessions: {}\n", unsynced_count));

    Ok(status)
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn setup_test_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute(
            "CREATE TABLE sessions (
                id INTEGER PRIMARY KEY,
                session_type TEXT NOT NULL,
                duration_seconds INTEGER NOT NULL,
                completed_at TEXT NOT NULL,
                tag TEXT,
                cloud_id TEXT
            )",
            [],
        )
        .unwrap();
        conn
    }

    #[test]
    fn test_ensure_sync_table() {
        let conn = setup_test_db();
        ensure_sync_table(&conn).unwrap();

        // Table should exist
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='sync_metadata'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn test_last_sync() {
        let conn = setup_test_db();
        ensure_sync_table(&conn).unwrap();

        // Initially no sync
        assert!(get_last_sync(&conn).unwrap().is_none());

        // Set sync time
        let now = Utc::now();
        set_last_sync(&conn, &now).unwrap();

        // Should be set
        let sync_time = get_last_sync(&conn).unwrap().unwrap();
        assert!((sync_time - now).num_seconds().abs() < 1);
    }
}
