-- Database Performance Optimization Script
-- Run this script to add indexes and optimize queries
-- This script only creates indexes for existing tables

-- ============================================================================
-- COINS TABLE OPTIMIZATION
-- ============================================================================

-- Check if coins table exists before creating indexes
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'coins') THEN
        -- Primary index for coingecko_id lookups (most common query)
        CREATE INDEX IF NOT EXISTS idx_coins_coingecko_id ON coins (coingecko_id);
        
        -- Index for symbol lookups (case insensitive)
        CREATE INDEX IF NOT EXISTS idx_coins_symbol ON coins (symbol);
        
        -- Index for market cap ordering (used in main page)
        CREATE INDEX IF NOT EXISTS idx_coins_market_cap ON coins (market_cap DESC NULLS LAST);
        
        -- Composite index for common queries
        CREATE INDEX IF NOT EXISTS idx_coins_coingecko_market_cap ON coins (coingecko_id, market_cap DESC NULLS LAST);
        
        -- Index for health score queries
        CREATE INDEX IF NOT EXISTS idx_coins_health_score ON coins (health_score DESC NULLS LAST);
        
        -- Index for consistency score queries
        CREATE INDEX IF NOT EXISTS idx_coins_consistency_score ON coins (consistency_score DESC NULLS LAST);
        
        RAISE NOTICE 'Created indexes for coins table';
    ELSE
        RAISE NOTICE 'coins table does not exist, skipping coins indexes';
    END IF;
END $$;

-- ============================================================================
-- PRICE_HISTORY TABLE OPTIMIZATION
-- ============================================================================

-- Check if price_history table exists before creating indexes
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'price_history') THEN
        -- Index for coingecko_id and date (most common query pattern)
        CREATE INDEX IF NOT EXISTS idx_price_history_coin_date ON price_history (coingecko_id, date DESC);
        
        -- Index for github_last_updated for consistency calculations
        CREATE INDEX IF NOT EXISTS idx_price_history_github_updated ON price_history (github_last_updated) WHERE github_last_updated IS NOT NULL;
        
        -- Index for twitter_first_tweet_date for consistency calculations
        CREATE INDEX IF NOT EXISTS idx_price_history_twitter_date ON price_history (twitter_first_tweet_date) WHERE twitter_first_tweet_date IS NOT NULL;
        
        RAISE NOTICE 'Created indexes for price_history table';
    ELSE
        RAISE NOTICE 'price_history table does not exist, skipping price_history indexes';
    END IF;
END $$;

-- ============================================================================
-- USER TABLES OPTIMIZATION
-- ============================================================================

-- Check if user_alerts table exists before creating indexes
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_alerts') THEN
        -- User alerts optimization
        CREATE INDEX IF NOT EXISTS idx_user_alerts_user_coin ON user_alerts (user_id, coin_id);
        CREATE INDEX IF NOT EXISTS idx_user_alerts_active ON user_alerts (is_active) WHERE is_active = true;
        
        RAISE NOTICE 'Created indexes for user_alerts table';
    ELSE
        RAISE NOTICE 'user_alerts table does not exist, skipping user_alerts indexes';
    END IF;
END $$;

-- Check if user_portfolios table exists before creating indexes
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_portfolios') THEN
        -- User portfolio optimization
        CREATE INDEX IF NOT EXISTS idx_user_portfolios_user_coin ON user_portfolios (user_id, coingecko_id);
        
        RAISE NOTICE 'Created indexes for user_portfolios table';
    ELSE
        RAISE NOTICE 'user_portfolios table does not exist, skipping user_portfolios indexes';
    END IF;
END $$;

-- ============================================================================
-- ANALYZE TABLES (only if they exist)
-- ============================================================================

-- Analyze coins table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'coins') THEN
        ANALYZE coins;
        RAISE NOTICE 'Analyzed coins table';
    END IF;
END $$;

-- Analyze price_history table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'price_history') THEN
        ANALYZE price_history;
        RAISE NOTICE 'Analyzed price_history table';
    END IF;
END $$;

-- Analyze user_alerts table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_alerts') THEN
        ANALYZE user_alerts;
        RAISE NOTICE 'Analyzed user_alerts table';
    END IF;
END $$;

-- Analyze user_portfolios table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_portfolios') THEN
        ANALYZE user_portfolios;
        RAISE NOTICE 'Analyzed user_portfolios table';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Show what tables actually exist
SELECT 
    table_name,
    'EXISTS' as status
FROM information_schema.tables 
WHERE table_name IN ('coins', 'price_history', 'user_alerts', 'user_portfolios')
ORDER BY table_name;

-- Check if indexes were created successfully (only for existing tables)
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('coins', 'price_history', 'user_alerts', 'user_portfolios')
ORDER BY tablename, indexname;

-- Check table sizes (only for existing tables)
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE tablename IN ('coins', 'price_history', 'user_alerts', 'user_portfolios')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC; 