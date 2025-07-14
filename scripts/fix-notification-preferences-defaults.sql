-- Fix notification preferences table defaults
-- This updates the default values to match the application expectations

-- Update the default for max_notifications_per_hour from 3 to 10
ALTER TABLE public.notification_preferences 
ALTER COLUMN max_notifications_per_hour SET DEFAULT 10;

-- Update the constraint to allow up to 10 notifications per hour
ALTER TABLE public.notification_preferences 
DROP CONSTRAINT IF EXISTS notification_preferences_max_notifications_per_hour_check;

ALTER TABLE public.notification_preferences 
ADD CONSTRAINT notification_preferences_max_notifications_per_hour_check 
CHECK (max_notifications_per_hour >= 1 AND max_notifications_per_hour <= 10);

-- Create the missing trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS trigger_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER trigger_notification_preferences_updated_at 
    BEFORE UPDATE ON notification_preferences 
    FOR EACH ROW 
    EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Update existing records with old defaults to new defaults
UPDATE public.notification_preferences 
SET max_notifications_per_hour = 10 
WHERE max_notifications_per_hour = 3;

-- Ensure all existing records satisfy the urgency constraint
UPDATE public.notification_preferences 
SET 
    critical_only = false,
    important_and_critical = true,
    all_notifications = false
WHERE (critical_only::integer + important_and_critical::integer + all_notifications::integer) != 1;

-- Verify the changes
SELECT 
    user_id,
    max_notifications_per_hour,
    snooze_duration,
    critical_only,
    important_and_critical,
    all_notifications
FROM public.notification_preferences 
LIMIT 5; 