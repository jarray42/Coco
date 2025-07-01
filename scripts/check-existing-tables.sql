-- Check all existing tables in the database
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check if any portfolio-related tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%portfolio%' OR table_name LIKE '%portfolios%')
ORDER BY table_name;

-- Check if user_portfolios table exists specifically
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'user_portfolios'
);
