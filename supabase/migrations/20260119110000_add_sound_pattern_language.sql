-- ==========================================
-- Add sound_pattern and language columns to user_settings
-- ==========================================

-- Add sound_pattern column
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS sound_pattern TEXT NOT NULL DEFAULT 'chime';

-- Add language column
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en';

-- Comment for clarity
COMMENT ON COLUMN public.user_settings.sound_pattern IS 'Sound pattern: chime, bell, digital, soft';
COMMENT ON COLUMN public.user_settings.language IS 'UI language: en, ja';
