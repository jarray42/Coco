-- Check what coins are available in the database
SELECT 
  coingecko_id, 
  name, 
  symbol, 
  price,
  market_cap,
  scraped_at
FROM coins 
WHERE 
  coingecko_id ILIKE '%bitcoin%' 
  OR name ILIKE '%bitcoin%' 
  OR symbol ILIKE '%btc%'
ORDER BY market_cap DESC NULLS LAST
LIMIT 10;

-- Check total number of coins
SELECT COUNT(*) as total_coins FROM coins;

-- Check recent coins
SELECT 
  coingecko_id, 
  name, 
  symbol, 
  price,
  market_cap
FROM coins 
ORDER BY market_cap DESC NULLS LAST
LIMIT 20;
