-- Create user_portfolios table
CREATE TABLE IF NOT EXISTS public.user_portfolios (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  coingecko_id TEXT NOT NULL,
  coin_name TEXT NOT NULL,
  coin_symbol TEXT NOT NULL,
  amount DECIMAL(20, 8) DEFAULT 0,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, coingecko_id)
);

-- Enable RLS
ALTER TABLE public.user_portfolios ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own portfolio
DROP POLICY IF EXISTS "Users can manage their own portfolio" ON public.user_portfolios;
CREATE POLICY "Users can manage their own portfolio" ON public.user_portfolios
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_portfolios_user_id ON public.user_portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_user_portfolios_coingecko_id ON public.user_portfolios(coingecko_id);
