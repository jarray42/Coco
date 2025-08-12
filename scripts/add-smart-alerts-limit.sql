-- Add smart_alerts_limit column to user_ai_usage table
ALTER TABLE user_ai_usage 
ADD COLUMN IF NOT EXISTS smart_alerts_limit INTEGER DEFAULT 20;

-- Update existing free users to have 20 smart alerts
UPDATE user_ai_usage 
SET smart_alerts_limit = 20 
WHERE billing_plan = 'free' AND smart_alerts_limit IS NULL;

-- Update existing pro users to have 200 smart alerts
UPDATE user_ai_usage 
SET smart_alerts_limit = 200 
WHERE billing_plan = 'pro' AND smart_alerts_limit IS NULL;

-- Set default for any remaining NULL values
UPDATE user_ai_usage 
SET smart_alerts_limit = 20 
WHERE smart_alerts_limit IS NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_user_ai_usage_smart_alerts_limit ON user_ai_usage(smart_alerts_limit);

-- Add comment for documentation
COMMENT ON COLUMN user_ai_usage.smart_alerts_limit IS 'Maximum number of smart alerts user can create. Free: 20, Pro: 200';

