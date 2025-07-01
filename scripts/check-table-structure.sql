-- Check the actual table structure and data
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('coins', 'crypto_data', 'price_history')
ORDER BY table_name, ordinal_position;

-- Check what data we actually have
SELECT * FROM coins LIMIT 3;

-- Check if we have historical data
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('crypto_data', 'price_history');
