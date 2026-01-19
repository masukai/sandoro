//! Authentication module for Supabase OAuth
//!
//! Handles login/logout flow and token management for cloud sync.

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Read, Write};
use std::path::PathBuf;
use tiny_http::{Response, Server};
use url::Url;

/// Supabase configuration
const SUPABASE_URL: &str = "https://ukjsssbpfvkumflzcfrd.supabase.co";
const SUPABASE_ANON_KEY: &str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVranNzc2JwZnZrdW1mbHpjZnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NDE2MTksImV4cCI6MjA4NDIxNzYxOX0.cAq7YgrFoHMf2M20CWFrdokxZpxPoDPahEgkw-ug5BM";

/// Local callback server port
const CALLBACK_PORT: u16 = 54321;

/// Stored credentials
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Credentials {
    pub access_token: String,
    pub refresh_token: String,
    pub user_id: String,
    pub email: Option<String>,
    pub expires_at: i64,
}

/// User info from Supabase
#[derive(Debug, Deserialize)]
struct SupabaseUser {
    id: String,
    email: Option<String>,
}

/// Auth session response
#[derive(Debug, Deserialize)]
struct AuthSession {
    access_token: String,
    refresh_token: String,
    expires_at: Option<i64>,
    expires_in: Option<i64>,
    user: SupabaseUser,
}

/// Get the credentials file path
fn get_credentials_path() -> Result<PathBuf> {
    let data_dir = dirs::data_dir()
        .context("Could not find data directory")?
        .join("sandoro");

    fs::create_dir_all(&data_dir)?;
    Ok(data_dir.join("credentials.json"))
}

/// Load stored credentials
pub fn load_credentials() -> Result<Option<Credentials>> {
    let path = get_credentials_path()?;

    if !path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&path)?;
    let creds: Credentials = serde_json::from_str(&content)?;

    // Check if token is expired
    let now = chrono::Utc::now().timestamp();
    if creds.expires_at < now {
        // Token expired, try to refresh
        return refresh_token(&creds);
    }

    Ok(Some(creds))
}

/// Save credentials to file
fn save_credentials(creds: &Credentials) -> Result<()> {
    let path = get_credentials_path()?;
    let content = serde_json::to_string_pretty(creds)?;

    let mut file = fs::File::create(&path)?;
    file.write_all(content.as_bytes())?;

    // Set file permissions (Unix only)
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = file.metadata()?.permissions();
        perms.set_mode(0o600);
        fs::set_permissions(&path, perms)?;
    }

    Ok(())
}

/// Delete stored credentials
pub fn delete_credentials() -> Result<()> {
    let path = get_credentials_path()?;
    if path.exists() {
        fs::remove_file(&path)?;
    }
    Ok(())
}

/// Refresh expired token
fn refresh_token(creds: &Credentials) -> Result<Option<Credentials>> {
    let client = reqwest::blocking::Client::new();

    let response = client
        .post(format!("{}/auth/v1/token?grant_type=refresh_token", SUPABASE_URL))
        .header("apikey", SUPABASE_ANON_KEY)
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "refresh_token": creds.refresh_token
        }))
        .send()?;

    if !response.status().is_success() {
        // Refresh failed, need to re-login
        delete_credentials()?;
        return Ok(None);
    }

    let session: AuthSession = response.json()?;
    let now = chrono::Utc::now().timestamp();
    let expires_at = session.expires_at.unwrap_or_else(|| {
        now + session.expires_in.unwrap_or(3600)
    });

    let new_creds = Credentials {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        user_id: session.user.id,
        email: session.user.email,
        expires_at,
    };

    save_credentials(&new_creds)?;
    Ok(Some(new_creds))
}

/// Start OAuth login flow
/// Opens browser for authentication and waits for callback
pub fn login(provider: &str) -> Result<Credentials> {
    // Build OAuth URL
    let redirect_uri = format!("http://localhost:{}/callback", CALLBACK_PORT);
    let auth_url = format!(
        "{}/auth/v1/authorize?provider={}&redirect_to={}",
        SUPABASE_URL,
        provider,
        urlencoding::encode(&redirect_uri)
    );

    println!("Opening browser for authentication...");
    println!("If the browser doesn't open, visit this URL:");
    println!("{}", auth_url);

    // Start local server before opening browser
    let server = Server::http(format!("127.0.0.1:{}", CALLBACK_PORT))
        .map_err(|e| anyhow::anyhow!("Failed to start callback server: {}", e))?;

    // Open browser
    if let Err(e) = open::that(&auth_url) {
        eprintln!("Failed to open browser: {}. Please open the URL manually.", e);
    }

    println!("\nWaiting for authentication...");

    // Wait for callback
    let (access_token, refresh_token) = wait_for_callback(&server)?;

    // Get user info
    let creds = exchange_tokens(&access_token, &refresh_token)?;

    // Save credentials
    save_credentials(&creds)?;

    Ok(creds)
}

/// Wait for OAuth callback and extract tokens
fn wait_for_callback(server: &Server) -> Result<(String, String)> {
    // Set timeout
    let timeout = std::time::Duration::from_secs(300); // 5 minutes
    let start = std::time::Instant::now();

    loop {
        if start.elapsed() > timeout {
            anyhow::bail!("Authentication timed out");
        }

        // Non-blocking receive with timeout
        if let Ok(Some(request)) = server.try_recv() {
            let url_str = format!("http://localhost{}", request.url());

            // Parse the callback URL
            if let Ok(url) = Url::parse(&url_str) {
                // Check if this is the callback
                if url.path() == "/callback" {
                    // Extract tokens from fragment (hash)
                    // Supabase sends tokens in URL fragment, but we might receive them as query params
                    // depending on how the redirect works

                    // First try query params
                    let params: std::collections::HashMap<_, _> = url.query_pairs().collect();

                    if let (Some(access), Some(refresh)) = (
                        params.get("access_token"),
                        params.get("refresh_token")
                    ) {
                        // Send success page with proper Content-Type
                        let response = Response::from_string(success_html())
                            .with_header(tiny_http::Header::from_bytes(
                                &b"Content-Type"[..],
                                &b"text/html; charset=utf-8"[..],
                            ).unwrap());
                        let _ = request.respond(response);

                        return Ok((access.to_string(), refresh.to_string()));
                    }

                    // If no tokens in query, send page that extracts from fragment
                    let html = fragment_extractor_html();
                    let response = Response::from_string(html)
                        .with_header(tiny_http::Header::from_bytes(
                            &b"Content-Type"[..],
                            &b"text/html"[..],
                        ).unwrap());
                    let _ = request.respond(response);
                    continue;
                }

                // Handle token extraction from fragment
                if url.path() == "/token" {
                    let params: std::collections::HashMap<_, _> = url.query_pairs().collect();

                    if let (Some(access), Some(refresh)) = (
                        params.get("access_token"),
                        params.get("refresh_token")
                    ) {
                        // Send final success page with proper Content-Type
                        let response = Response::from_string(success_html())
                            .with_header(tiny_http::Header::from_bytes(
                                &b"Content-Type"[..],
                                &b"text/html; charset=utf-8"[..],
                            ).unwrap());
                        let _ = request.respond(response);

                        return Ok((access.to_string(), refresh.to_string()));
                    }
                }
            }

            // For other requests, just respond with OK
            let response = Response::from_string("OK");
            let _ = request.respond(response);
        }

        std::thread::sleep(std::time::Duration::from_millis(100));
    }
}

/// Exchange/verify tokens and get user info
fn exchange_tokens(access_token: &str, refresh_token: &str) -> Result<Credentials> {
    let client = reqwest::blocking::Client::new();

    // Get user info using the access token
    let response = client
        .get(format!("{}/auth/v1/user", SUPABASE_URL))
        .header("apikey", SUPABASE_ANON_KEY)
        .header("Authorization", format!("Bearer {}", access_token))
        .send()?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().unwrap_or_default();
        anyhow::bail!("Failed to get user info: {} - {}", status, body);
    }

    let user: SupabaseUser = response.json()?;

    // Token expires in 1 hour by default
    let expires_at = chrono::Utc::now().timestamp() + 3600;

    Ok(Credentials {
        access_token: access_token.to_string(),
        refresh_token: refresh_token.to_string(),
        user_id: user.id,
        email: user.email,
        expires_at,
    })
}

/// HTML page shown after successful authentication
fn success_html() -> String {
    r#"<!DOCTYPE html>
<html>
<head>
    <title>sandoro - Authentication Successful</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #1a1a1a;
            color: #22d3ee;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        h1 { font-size: 3rem; margin-bottom: 0.5rem; }
        p { color: #888; margin-top: 1rem; }
        .checkmark {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="checkmark">✓</div>
        <h1>sandoro</h1>
        <p>Authentication successful!</p>
        <p>You can close this window and return to the terminal.</p>
    </div>
</body>
</html>"#.to_string()
}

/// HTML page that extracts tokens from URL fragment
fn fragment_extractor_html() -> String {
    format!(r#"<!DOCTYPE html>
<html>
<head>
    <title>sandoro - Authenticating...</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #1a1a1a;
            color: #22d3ee;
        }}
        .container {{ text-align: center; padding: 2rem; }}
        h1 {{ font-size: 2rem; }}
        .spinner {{
            border: 4px solid #333;
            border-top: 4px solid #22d3ee;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 2rem auto;
        }}
        @keyframes spin {{
            0% {{ transform: rotate(0deg); }}
            100% {{ transform: rotate(360deg); }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>sandoro</h1>
        <div class="spinner"></div>
        <p>Completing authentication...</p>
    </div>
    <script>
        // Extract tokens from URL fragment
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {{
            // Redirect to token endpoint with tokens as query params
            window.location.href = '/token?access_token=' + encodeURIComponent(accessToken) +
                '&refresh_token=' + encodeURIComponent(refreshToken);
        }} else {{
            document.body.innerHTML = '<div class="container"><h1>Error</h1><p>Authentication failed. Please try again.</p></div>';
        }}
    </script>
</body>
</html>"#)
}

/// Get the current user's access token (refreshing if needed)
pub fn get_access_token() -> Result<Option<String>> {
    match load_credentials()? {
        Some(creds) => Ok(Some(creds.access_token)),
        None => Ok(None),
    }
}

/// Check if user is logged in
pub fn is_logged_in() -> bool {
    load_credentials().ok().flatten().is_some()
}

/// Get current user info
pub fn get_current_user() -> Result<Option<(String, Option<String>)>> {
    match load_credentials()? {
        Some(creds) => Ok(Some((creds.user_id, creds.email))),
        None => Ok(None),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_credentials_path() {
        let path = get_credentials_path().unwrap();
        assert!(path.to_string_lossy().contains("sandoro"));
        assert!(path.to_string_lossy().ends_with("credentials.json"));
    }
}
