-- Test database performance and check if indexes are working
-- Run this to see what's causing the slow queries

-- ============================================================================
-- CHECK INDEXES
-- ============================================================================

-- Check if indexes exist
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'coins'
ORDER BY indexname;

-- ============================================================================
-- TEST QUERY PERFORMANCE
-- ============================================================================

-- Test 1: Simple lookup by coingecko_id
EXPLAIN (ANALYZE, BUFFERS) 
SELECT coingecko_id, name, symbol, price 
FROM coins 
WHERE coingecko_id = 'bitcoin' 
LIMIT 1;

-- Test 2: Symbol lookup
EXPLAIN (ANALYZE, BUFFERS) 
SELECT coingecko_id, name, symbol, price 
FROM coins 
WHERE symbol ILIKE 'BTC' 
LIMIT 1;

-- Test 3: Market cap ordering (main page query)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT coingecko_id, name, symbol, price, market_cap 
FROM coins 
ORDER BY market_cap DESC NULLS LAST 
LIMIT 10;

-- ============================================================================
-- CHECK TABLE STATISTICS
-- ============================================================================

-- Check table size and row count
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    (SELECT reltuples FROM pg_class WHERE relname = tablename) as estimated_rows
FROM pg_tables 
WHERE tablename = 'coins';

-- ============================================================================
-- CHECK SLOW QUERIES
-- ============================================================================

-- Check if there are any slow queries in the logs (if enabled)
-- This will only work if slow query logging is enabled
SELECT 
    query,
    mean_time,
    calls,
    total_time
FROM pg_stat_statements 
WHERE query LIKE '%coins%'
ORDER BY mean_time DESC
LIMIT 5; 