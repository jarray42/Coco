-- Enable RLS on user_ai_usage table
ALTER TABLE user_ai_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own AI usage" ON user_ai_usage;
DROP POLICY IF EXISTS "Users can insert their own AI usage" ON user_ai_usage;
DROP POLICY IF EXISTS "Users can update their own AI usage" ON user_ai_usage;

-- Create policy for users to view their own records
CREATE POLICY "Users can view their own AI usage" ON user_ai_usage
    FOR SELECT USING (auth.uid()::text = user_id);

-- Create policy for users to insert their own records
CREATE POLICY "Users can insert their own AI usage" ON user_ai_usage
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Create policy for users to update their own records
CREATE POLICY "Users can update their own AI usage" ON user_ai_usage
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Grant necessary permissions
GRANT ALL ON user_ai_usage TO authenticated;
GRANT USAGE ON SEQUENCE user_ai_usage_id_seq TO authenticated;
