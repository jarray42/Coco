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

-- ============================================================================
-- COINS TABLE OPTIMIZATION
-- ============================================================================

-- Primary index for coingecko_id lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_coins_coingecko_id 
ON coins (coingecko_id);

-- Index for symbol lookups (case insensitive)
CREATE INDEX IF NOT EXISTS idx_coins_symbol 
ON coins (symbol);

-- Index for market cap ordering (used in main page)
CREATE INDEX IF NOT EXISTS idx_coins_market_cap 
ON coins (market_cap DESC NULLS LAST);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_coins_coingecko_market_cap 
ON coins (coingecko_id, market_cap DESC NULLS LAST);

-- Index for health score queries
CREATE INDEX IF NOT EXISTS idx_coins_health_score 
ON coins (health_score DESC NULLS LAST);

-- Index for consistency score queries
CREATE INDEX IF NOT EXISTS idx_coins_consistency_score 
ON coins (consistency_score DESC NULLS LAST);

-- ============================================================================
-- CRYPTO_DATA TABLE OPTIMIZATION
-- ============================================================================

-- Index for coingecko_id and scraped_at (for historical data)
CREATE INDEX IF NOT EXISTS idx_crypto_data_coin_date 
ON crypto_data (coingecko_id, scraped_at DESC);

-- Analyze the tables to update statistics
ANALYZE price_history;
ANALYZE coins;
ANALYZE crypto_data;
