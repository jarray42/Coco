-- Comprehensive Notification System Setup
-- This script sets up all tables and functions needed for the notification system

-- ============================================================================
-- 1. CREATE user_alerts TABLE
-- ============================================================================

-- Create user_alerts table for managing user notification alerts
CREATE TABLE IF NOT EXISTS user_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coin_id TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('health_score', 'consistency_score', 'price_drop', 'migration', 'delisting')),
  threshold_value NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one alert per user/coin/type combination
  UNIQUE(user_id, coin_id, alert_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_alerts_user_id ON user_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_alerts_coin_id ON user_alerts(coin_id);
CREATE INDEX IF NOT EXISTS idx_user_alerts_alert_type ON user_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_user_alerts_is_active ON user_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_user_alerts_compound ON user_alerts(user_id, coin_id, alert_type);

-- Enable Row Level Security
ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_alerts
CREATE POLICY "Users can view own alerts" ON user_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own alerts" ON user_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON user_alerts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own alerts" ON user_alerts FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 2. CREATE notification_preferences TABLE (if not exists)
-- ============================================================================

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

-- Create RLS policies for notification_preferences
CREATE POLICY "Users can view own notification preferences" ON notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notification preferences" ON notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notification preferences" ON notification_preferences FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own notification preferences" ON notification_preferences FOR DELETE USING (auth.uid() = user_id);

-- Add constraint to ensure only one urgency level is selected
ALTER TABLE notification_preferences 
ADD CONSTRAINT IF NOT EXISTS check_single_urgency_level 
CHECK ((critical_only::integer + important_and_critical::integer + all_notifications::integer) = 1);

-- ============================================================================
-- 3. CREATE notification_log TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coin_id TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivery_status TEXT DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'failed', 'read')),
  acknowledged_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_log_anti_spam ON notification_log(user_id, coin_id, alert_type, sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_log_user_id ON notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at ON notification_log(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_log_delivery_status ON notification_log(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notification_log_acknowledged ON notification_log(user_id, acknowledged_at) WHERE acknowledged_at IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notification_log
CREATE POLICY "Users can view own notifications" ON notification_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON notification_log FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notification acknowledgments" ON notification_log FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- 4. CREATE TRIGGER FUNCTIONS
-- ============================================================================

-- Function to update the updated_at timestamp for user_alerts
CREATE OR REPLACE FUNCTION update_user_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update the updated_at timestamp for notification_preferences
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. CREATE TRIGGERS
-- ============================================================================

-- Create trigger for user_alerts
DROP TRIGGER IF EXISTS trigger_user_alerts_updated_at ON user_alerts;
CREATE TRIGGER trigger_user_alerts_updated_at
  BEFORE UPDATE ON user_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_user_alerts_updated_at();

-- Create trigger for notification_preferences
DROP TRIGGER IF EXISTS trigger_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER trigger_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON user_alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notification_log TO authenticated;
GRANT UPDATE(acknowledged_at) ON notification_log TO authenticated;

-- ============================================================================
-- 7. VERIFICATION QUERIES
-- ============================================================================

-- Verify all tables exist
SELECT 
  schemaname, 
  tablename 
FROM pg_tables 
WHERE tablename IN ('user_alerts', 'notification_preferences', 'notification_log') 
  AND schemaname = 'public'
ORDER BY tablename;

-- Verify all indexes exist
SELECT 
  indexname, 
  tablename 
FROM pg_indexes 
WHERE tablename IN ('user_alerts', 'notification_preferences', 'notification_log') 
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- Verification complete
SELECT 'Notification system setup completed successfully!' as status; 