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

-- Create RLS policies
-- Users can only see their own alerts
CREATE POLICY "Users can view own alerts"
  ON user_alerts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own alerts
CREATE POLICY "Users can insert own alerts"
  ON user_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own alerts
CREATE POLICY "Users can update own alerts"
  ON user_alerts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own alerts
CREATE POLICY "Users can delete own alerts"
  ON user_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_user_alerts_updated_at ON user_alerts;
CREATE TRIGGER trigger_user_alerts_updated_at
  BEFORE UPDATE ON user_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_user_alerts_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_alerts TO authenticated;

-- Comment on table and columns for documentation
COMMENT ON TABLE user_alerts IS 'User-configured alerts for cryptocurrency monitoring';
COMMENT ON COLUMN user_alerts.user_id IS 'User who owns this alert';
COMMENT ON COLUMN user_alerts.coin_id IS 'Cryptocurrency identifier (coingecko_id)';
COMMENT ON COLUMN user_alerts.alert_type IS 'Type of alert: health_score, consistency_score, price_drop, migration, delisting';
COMMENT ON COLUMN user_alerts.threshold_value IS 'Threshold value that triggers the alert (null for event-based alerts)';
COMMENT ON COLUMN user_alerts.is_active IS 'Whether this alert is currently active';
COMMENT ON COLUMN user_alerts.created_at IS 'When the alert was created';
COMMENT ON COLUMN user_alerts.updated_at IS 'When the alert was last modified'; 