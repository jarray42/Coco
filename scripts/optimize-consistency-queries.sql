-- Optimize the price_history table for consistency score queries
-- Add indexes for better performance

-- Index for coingecko_id and date (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_price_history_coin_date 
ON price_history (coingecko_id, date DESC);

-- Index for github_last_updated for consistency calculations
CREATE INDEX IF NOT EXISTS idx_price_history_github_updated 
ON price_history (github_last_updated) 
WHERE github_last_updated IS NOT NULL;

-- Index for twitter_first_tweet_date for consistency calculations
CREATE INDEX IF NOT EXISTS idx_price_history_twitter_date 
ON price_history (twitter_first_tweet_date) 
WHERE twitter_first_tweet_date IS NOT NULL;

-- Composite index for consistency score calculations
CREATE INDEX IF NOT EXISTS idx_price_history_consistency 
ON price_history (coingecko_id, date DESC, github_last_updated, twitter_first_tweet_date);

-- Analyze the table to update statistics
ANALYZE price_history;
