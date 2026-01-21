-- ==========================================
-- Add focus_mode and break_snooze_enabled columns to user_settings
-- ==========================================

-- Add focus_mode column (default to 'classic' for Classic Pomodoro)
-- Values: 'classic' | 'flowtime' | 'marathon'
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS focus_mode TEXT NOT NULL DEFAULT 'classic';

-- Add break_snooze_enabled column (default to false)
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS break_snooze_enabled BOOLEAN NOT NULL DEFAULT false;
