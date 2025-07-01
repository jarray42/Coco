-- Update the user_ai_usage table to ensure proper monthly quota tracking
ALTER TABLE user_ai_usage 
ADD COLUMN IF NOT EXISTS monthly_limit INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS subscription_date DATE DEFAULT CURRENT_DATE;

-- Update existing free users to have proper monthly limit
UPDATE user_ai_usage 
SET monthly_limit = 20 
WHERE billing_plan = 'free' AND monthly_limit IS NULL;

-- Update existing pro users to have proper monthly limit
UPDATE user_ai_usage 
SET monthly_limit = 200 
WHERE billing_plan = 'pro' AND monthly_limit IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_ai_usage_user_id ON user_ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ai_usage_last_reset ON user_ai_usage(last_reset_date);

-- Add a function to automatically reset monthly quotas
CREATE OR REPLACE FUNCTION reset_monthly_quotas()
RETURNS void AS $$
BEGIN
  UPDATE user_ai_usage 
  SET tokens_used = 0, 
      last_reset_date = CURRENT_DATE,
      updated_at = NOW()
  WHERE DATE_TRUNC('month', last_reset_date::date) < DATE_TRUNC('month', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;
