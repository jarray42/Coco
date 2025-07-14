-- Safe Migration: Replace quiet hours with snooze feature
-- This script handles cases where migration has been partially run

-- Step 1: Remove old constraints (safe if they don't exist)
ALTER TABLE public.notification_preferences 
DROP CONSTRAINT IF EXISTS notification_preferences_quiet_start_check;

ALTER TABLE public.notification_preferences 
DROP CONSTRAINT IF EXISTS notification_preferences_quiet_end_check;

-- Step 2: Add new snooze columns (safe if they already exist)
DO $$ 
BEGIN
    -- Add snooze_enabled column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification_preferences' 
        AND column_name = 'snooze_enabled'
    ) THEN
        ALTER TABLE public.notification_preferences 
        ADD COLUMN snooze_enabled boolean NOT NULL DEFAULT true;
    END IF;
    
    -- Add snooze_duration column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification_preferences' 
        AND column_name = 'snooze_duration'
    ) THEN
        ALTER TABLE public.notification_preferences 
        ADD COLUMN snooze_duration integer NOT NULL DEFAULT 16;
    END IF;
END $$;

-- Step 3: Add constraints (safe if they already exist)
DO $$
BEGIN
    -- Add snooze duration constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE constraint_name = 'notification_preferences_snooze_duration_check'
    ) THEN
        ALTER TABLE public.notification_preferences 
        ADD CONSTRAINT notification_preferences_snooze_duration_check 
        CHECK (snooze_duration >= 1 AND snooze_duration <= 48);
    END IF;
END $$;

-- Step 4: Remove old quiet hours columns (safe if they don't exist)
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