-- Complete Migration: Replace quiet hours with snooze feature
-- This script completely removes old columns and adds new ones

-- Step 1: Remove old constraints
ALTER TABLE public.notification_preferences 
DROP CONSTRAINT IF EXISTS notification_preferences_quiet_start_check;

ALTER TABLE public.notification_preferences 
DROP CONSTRAINT IF EXISTS notification_preferences_quiet_end_check;

-- Step 2: Add new snooze columns with defaults
ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS snooze_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS snooze_duration integer NOT NULL DEFAULT 16;

-- Step 3: Add constraints for new columns
ALTER TABLE public.notification_preferences 
ADD CONSTRAINT notification_preferences_snooze_duration_check 
CHECK (snooze_duration >= 1 AND snooze_duration <= 48);

-- Step 4: Remove old quiet hours columns
ALTER TABLE public.notification_preferences 
DROP COLUMN IF EXISTS quiet_hours_enabled;

ALTER TABLE public.notification_preferences 
DROP COLUMN IF EXISTS quiet_start;

ALTER TABLE public.notification_preferences 
DROP COLUMN IF EXISTS quiet_end;

-- Step 5: Verify the final structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'notification_preferences' 
AND table_schema = 'public'
ORDER BY ordinal_position; 