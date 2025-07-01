-- Check if user_portfolios table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'user_portfolios'
);

-- Describe the structure of the user_portfolios table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_portfolios'
ORDER BY ordinal_position;
