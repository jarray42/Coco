-- Disable RLS on user_ai_usage table temporarily
ALTER TABLE user_ai_usage DISABLE ROW LEVEL SECURITY;

-- Ensure the table has the correct structure
ALTER TABLE user_ai_usage 
ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS tokens_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS token_balance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS billing_plan TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS last_reset_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS model_provider TEXT DEFAULT 'groq',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Grant permissions to authenticated users
GRANT ALL ON user_ai_usage TO authenticated;
GRANT ALL ON user_ai_usage TO anon;
