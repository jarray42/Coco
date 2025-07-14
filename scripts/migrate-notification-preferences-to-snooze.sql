-- Migration: Replace quiet hours with snooze feature in notification_preferences table
-- This script updates the table structure to support the new snooze functionality

-- Step 1: Remove old constraints related to quiet hours
ALTER TABLE public.notification_preferences 
DROP CONSTRAINT IF EXISTS notification_preferences_quiet_start_check;

ALTER TABLE public.notification_preferences 
DROP CONSTRAINT IF EXISTS notification_preferences_quiet_end_check;

-- Step 2: Add new snooze columns
ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS snooze_enabled boolean DEFAULT true;

ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS snooze_duration integer DEFAULT 16;

-- Step 3: Update existing rows to have default snooze values
UPDATE public.notification_preferences 
SET snooze_enabled = true, snooze_duration = 16 
WHERE snooze_enabled IS NULL OR snooze_duration IS NULL;

-- Step 4: Remove old quiet hours columns (optional - uncomment if you want to fully remove them)
-- ALTER TABLE public.notification_preferences DROP COLUMN IF EXISTS quiet_hours_enabled;
-- ALTER TABLE public.notification_preferences DROP COLUMN IF EXISTS quiet_start;
-- ALTER TABLE public.notification_preferences DROP COLUMN IF EXISTS quiet_end;

-- Step 5: Add constraints for the new snooze columns
ALTER TABLE public.notification_preferences 
ADD CONSTRAINT notification_preferences_snooze_duration_check 
CHECK (snooze_duration >= 1 AND snooze_duration <= 48);

-- Step 6: Make snooze columns NOT NULL now that we have defaults
ALTER TABLE public.notification_preferences 
ALTER COLUMN snooze_enabled SET NOT NULL;

ALTER TABLE public.notification_preferences 
ALTER COLUMN snooze_duration SET NOT NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'notification_preferences' 
AND table_schema = 'public'
ORDER BY ordinal_position; 