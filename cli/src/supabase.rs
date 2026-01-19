//! Supabase client for cloud data sync
//!
//! Handles session and settings synchronization with Supabase.

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::auth;

/// Supabase configuration
const SUPABASE_URL: &str = "https://oiurcnwofjkxdtjbtqkj.supabase.co";
const SUPABASE_ANON_KEY: &str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pdXJjbndvZmpreGR0amJ0cWtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcxMTIzMDAsImV4cCI6MjA1MjY4ODMwMH0.kWC8Jz1HCr-yZj2pWyFdaKNqoevyQsyWQzdcKg7dHZA";

/// Session record from Supabase
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudSession {
    pub id: Option<String>,
    pub user_id: String,
    pub session_type: String, // "work", "shortBreak", "longBreak"
    pub duration_seconds: i32,
    pub completed_at: String, // ISO 8601
    pub tag: Option<String>,
    pub created_at: Option<String>,
    pub synced_from_cli: Option<bool>,
}

/// User settings from Supabase
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudSettings {
    pub user_id: String,
    pub theme: Option<String>,
    pub accent_color: Option<String>,
    pub icon: Option<String>,
    pub work_duration: Option<i32>,
    pub short_break_duration: Option<i32>,
    pub long_break_duration: Option<i32>,
    pub sound_enabled: Option<bool>,
    pub notifications_enabled: Option<bool>,
}

/// Supabase API client
pub struct SupabaseClient {
    client: reqwest::blocking::Client,
    access_token: String,
}

impl SupabaseClient {
    /// Create a new Supabase client (requires authentication)
    pub fn new() -> Result<Option<Self>> {
        match auth::get_access_token()? {
            Some(token) => Ok(Some(Self {
                client: reqwest::blocking::Client::new(),
                access_token: token,
            })),
            None => Ok(None),
        }
    }

    /// Get authorization headers
    fn auth_headers(&self) -> Vec<(&str, String)> {
        vec![
            ("apikey", SUPABASE_ANON_KEY.to_string()),
            ("Authorization", format!("Bearer {}", self.access_token)),
            ("Content-Type", "application/json".to_string()),
        ]
    }

    /// Fetch all sessions from Supabase
    pub fn get_sessions(&self) -> Result<Vec<CloudSession>> {
        let url = format!("{}/rest/v1/sessions?order=completed_at.desc", SUPABASE_URL);

        let mut request = self.client.get(&url);
        for (key, value) in self.auth_headers() {
            request = request.header(key, value);
        }

        let response = request.send()?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().unwrap_or_default();
            anyhow::bail!("Failed to fetch sessions: {} - {}", status, body);
        }

        let sessions: Vec<CloudSession> = response.json()?;
        Ok(sessions)
    }

    /// Upload a session to Supabase
    pub fn upload_session(&self, session: &CloudSession) -> Result<()> {
        let url = format!("{}/rest/v1/sessions", SUPABASE_URL);

        let mut request = self.client.post(&url);
        for (key, value) in self.auth_headers() {
            request = request.header(key, value);
        }
        request = request.header("Prefer", "return=minimal");

        let response = request.json(session).send()?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().unwrap_or_default();
            anyhow::bail!("Failed to upload session: {} - {}", status, body);
        }

        Ok(())
    }

    /// Upload multiple sessions to Supabase
    pub fn upload_sessions(&self, sessions: &[CloudSession]) -> Result<usize> {
        if sessions.is_empty() {
            return Ok(0);
        }

        let url = format!("{}/rest/v1/sessions", SUPABASE_URL);

        let mut request = self.client.post(&url);
        for (key, value) in self.auth_headers() {
            request = request.header(key, value);
        }
        request = request.header("Prefer", "return=minimal");

        let response = request.json(sessions).send()?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().unwrap_or_default();
            anyhow::bail!("Failed to upload sessions: {} - {}", status, body);
        }

        Ok(sessions.len())
    }

    /// Get user settings from Supabase
    pub fn get_settings(&self) -> Result<Option<CloudSettings>> {
        let url = format!("{}/rest/v1/user_settings?select=*", SUPABASE_URL);

        let mut request = self.client.get(&url);
        for (key, value) in self.auth_headers() {
            request = request.header(key, value);
        }

        let response = request.send()?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().unwrap_or_default();
            anyhow::bail!("Failed to fetch settings: {} - {}", status, body);
        }

        let settings: Vec<CloudSettings> = response.json()?;
        Ok(settings.into_iter().next())
    }

    /// Get sessions after a specific timestamp (for incremental sync)
    pub fn get_sessions_after(&self, after: &DateTime<Utc>) -> Result<Vec<CloudSession>> {
        let timestamp = after.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string();
        let url = format!(
            "{}/rest/v1/sessions?completed_at=gt.{}&order=completed_at.asc",
            SUPABASE_URL,
            urlencoding::encode(&timestamp)
        );

        let mut request = self.client.get(&url);
        for (key, value) in self.auth_headers() {
            request = request.header(key, value);
        }

        let response = request.send()?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().unwrap_or_default();
            anyhow::bail!("Failed to fetch sessions: {} - {}", status, body);
        }

        let sessions: Vec<CloudSession> = response.json()?;
        Ok(sessions)
    }

    /// Delete a session from Supabase
    pub fn delete_session(&self, session_id: &str) -> Result<()> {
        let url = format!("{}/rest/v1/sessions?id=eq.{}", SUPABASE_URL, session_id);

        let mut request = self.client.delete(&url);
        for (key, value) in self.auth_headers() {
            request = request.header(key, value);
        }

        let response = request.send()?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().unwrap_or_default();
            anyhow::bail!("Failed to delete session: {} - {}", status, body);
        }

        Ok(())
    }
}

/// Convert local session to cloud format
pub fn to_cloud_session(
    user_id: &str,
    session_type: &str,
    duration_seconds: i32,
    completed_at: DateTime<Utc>,
    tag: Option<String>,
) -> CloudSession {
    CloudSession {
        id: Some(uuid::Uuid::new_v4().to_string()),
        user_id: user_id.to_string(),
        session_type: session_type.to_string(),
        duration_seconds,
        completed_at: completed_at.format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string(),
        tag,
        created_at: Some(Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string()),
        synced_from_cli: Some(true),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_to_cloud_session() {
        let session = to_cloud_session(
            "user-123",
            "work",
            1500,
            Utc::now(),
            Some("coding".to_string()),
        );

        assert_eq!(session.user_id, "user-123");
        assert_eq!(session.session_type, "work");
        assert_eq!(session.duration_seconds, 1500);
        assert!(session.synced_from_cli.unwrap());
    }
}
