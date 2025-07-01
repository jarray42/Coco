-- Create or replace the increment function for token usage
CREATE OR REPLACE FUNCTION increment_token_usage(
  p_user_id UUID,
  p_tokens_used INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE user_ai_usage 
  SET 
    tokens_used = tokens_used + p_tokens_used,
    daily_usage = daily_usage + p_tokens_used,
    monthly_usage = monthly_usage + p_tokens_used,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- If no row was updated, insert a new record
  IF NOT FOUND THEN
    INSERT INTO user_ai_usage (
      user_id, 
      model_provider, 
      daily_usage, 
      monthly_usage, 
      tokens_used,
      token_balance,
      billing_plan,
      subscription_tier,
      monthly_limit,
      last_reset_date,
      subscription_date
    ) VALUES (
      p_user_id, 
      'groq', 
      p_tokens_used, 
      p_tokens_used, 
      p_tokens_used,
      0,
      'free',
      'free',
      20,
      CURRENT_DATE,
      CURRENT_DATE
    );
  END IF;
END;
$$ LANGUAGE plpgsql;
