-- sandoro Database Schema
-- Shared between CLI (SQLite) and Web (IndexedDB structure reference)

-- ==========================================
-- Local Storage (SQLite / IndexedDB)
-- ==========================================

-- Session records
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at DATETIME NOT NULL,
    ended_at DATETIME,
    duration_seconds INTEGER,
    type TEXT NOT NULL CHECK (type IN ('work', 'short_break', 'long_break')),
    completed BOOLEAN DEFAULT FALSE
);

-- Daily statistics cache
CREATE TABLE IF NOT EXISTS daily_stats (
    date DATE PRIMARY KEY,
    total_work_seconds INTEGER DEFAULT 0,
    sessions_completed INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_type ON sessions(type);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date(started_at));

-- ==========================================
-- Cloud Storage (Supabase PostgreSQL) - Pro Only
-- ==========================================

-- Note: This schema is for reference. Actual Supabase schema uses
-- UUID and auth.users references.

/*
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    type TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own sessions"
    ON user_sessions FOR ALL
    USING (auth.uid() = user_id);

CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_started ON user_sessions(started_at);
*/
