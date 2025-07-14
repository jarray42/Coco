-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Delivery Methods
  browser_push BOOLEAN DEFAULT true,
  email_alerts BOOLEAN DEFAULT false,
  in_app_only BOOLEAN DEFAULT false,
  
  -- Smart Controls
  notification_style TEXT DEFAULT 'detailed' CHECK (notification_style IN ('minimal', 'detailed', 'custom')),
  quiet_hours_enabled BOOLEAN DEFAULT true,
  quiet_start INTEGER DEFAULT 22 CHECK (quiet_start >= 0 AND quiet_start <= 23),
  quiet_end INTEGER DEFAULT 8 CHECK (quiet_end >= 0 AND quiet_end <= 23),
  
  -- Urgency Levels (only one should be true)
  critical_only BOOLEAN DEFAULT false,
  important_and_critical BOOLEAN DEFAULT true,
  all_notifications BOOLEAN DEFAULT false,
  
  -- Batching & Rate Limiting
  batch_portfolio_alerts BOOLEAN DEFAULT true,
  max_notifications_per_hour INTEGER DEFAULT 3 CHECK (max_notifications_per_hour >= 1 AND max_notifications_per_hour <= 10),
  
  -- Sound & Visual
  sound_enabled BOOLEAN DEFAULT true,
  vibration_enabled BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one preferences record per user
  UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Enable Row Level Security
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own preferences
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own preferences
CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own preferences
CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own preferences
CREATE POLICY "Users can delete own notification preferences"
  ON notification_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER trigger_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Add constraint to ensure only one urgency level is selected
ALTER TABLE notification_preferences 
ADD CONSTRAINT check_single_urgency_level 
CHECK (
  (critical_only::integer + important_and_critical::integer + all_notifications::integer) = 1
);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO authenticated;

-- Comment on table and columns for documentation
COMMENT ON TABLE notification_preferences IS 'User notification preferences for personalized alert management';
COMMENT ON COLUMN notification_preferences.user_id IS 'User who owns these preferences';
COMMENT ON COLUMN notification_preferences.browser_push IS 'Enable browser push notifications';
COMMENT ON COLUMN notification_preferences.email_alerts IS 'Enable email notifications for critical alerts';
COMMENT ON COLUMN notification_preferences.notification_style IS 'Style of notifications: minimal, detailed, or custom';
COMMENT ON COLUMN notification_preferences.quiet_hours_enabled IS 'Enable quiet hours to pause non-critical notifications';
COMMENT ON COLUMN notification_preferences.quiet_start IS 'Hour when quiet hours begin (0-23)';
COMMENT ON COLUMN notification_preferences.quiet_end IS 'Hour when quiet hours end (0-23)';
COMMENT ON COLUMN notification_preferences.critical_only IS 'Only send critical alerts (migrations, delistings)';
COMMENT ON COLUMN notification_preferences.important_and_critical IS 'Send important and critical alerts (recommended)';
COMMENT ON COLUMN notification_preferences.all_notifications IS 'Send all notifications including minor updates';
COMMENT ON COLUMN notification_preferences.batch_portfolio_alerts IS 'Group multiple portfolio alerts into single notification';
COMMENT ON COLUMN notification_preferences.max_notifications_per_hour IS 'Maximum number of notifications per hour (1-10)'; 