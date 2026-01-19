-- ==========================================
-- Add language and sound_pattern columns to user_settings
-- ==========================================

-- Add language column (default to 'en')
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en';

-- Add sound_pattern column (default to 'chime')
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS sound_pattern TEXT NOT NULL DEFAULT 'chime';
