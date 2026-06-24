-- TradeWise Production Database Schema (PostgreSQL)
-- Auto-generated schema definitions to run in Supabase SQL editor.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. PROFILES (Extends Supabase Auth users) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow users to update their own profiles" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- ── 2. SUBSCRIPTIONS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tier TEXT NOT NULL DEFAULT 'FREE' CHECK (tier IN ('FREE', 'PREMIUM', 'ENTERPRISE')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELED', 'EXPIRED')),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- ── 3. PORTFOLIOS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    name TEXT NOT NULL DEFAULT 'My Portfolio',
    starting_balance DOUBLE PRECISION NOT NULL DEFAULT 10000.00,
    cash_balance DOUBLE PRECISION NOT NULL DEFAULT 10000.00,
    total_equity DOUBLE PRECISION NOT NULL DEFAULT 10000.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own portfolios" ON public.portfolios
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolios" ON public.portfolios
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own portfolios" ON public.portfolios
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── 4. POSITIONS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
    quantity DOUBLE PRECISION NOT NULL CHECK (quantity > 0),
    entry_price DOUBLE PRECISION NOT NULL CHECK (entry_price > 0),
    current_price DOUBLE PRECISION NOT NULL CHECK (current_price > 0),
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE,
    pnl DOUBLE PRECISION DEFAULT 0.0,
    pnl_percent DOUBLE PRECISION DEFAULT 0.0
);

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own positions" ON public.positions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.portfolios 
            WHERE portfolios.id = positions.portfolio_id AND portfolios.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own positions" ON public.positions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.portfolios 
            WHERE portfolios.id = positions.portfolio_id AND portfolios.user_id = auth.uid()
        )
    );

-- ── 5. ORDERS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
    type TEXT NOT NULL DEFAULT 'MARKET' CHECK (type IN ('MARKET', 'LIMIT', 'STOP')),
    quantity DOUBLE PRECISION NOT NULL CHECK (quantity > 0),
    price DOUBLE PRECISION,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'FILLED', 'CANCELED', 'REJECTED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders" ON public.orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.portfolios 
            WHERE portfolios.id = orders.portfolio_id AND portfolios.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own orders" ON public.orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.portfolios 
            WHERE portfolios.id = orders.portfolio_id AND portfolios.user_id = auth.uid()
        )
    );

-- ── 6. TRADES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
    position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
    quantity DOUBLE PRECISION NOT NULL CHECK (quantity > 0),
    price DOUBLE PRECISION NOT NULL CHECK (price > 0),
    total_value DOUBLE PRECISION NOT NULL,
    pnl DOUBLE PRECISION DEFAULT 0.0,
    pnl_percent DOUBLE PRECISION DEFAULT 0.0,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trades" ON public.trades
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.portfolios 
            WHERE portfolios.id = trades.portfolio_id AND portfolios.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own trades" ON public.trades
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.portfolios 
            WHERE portfolios.id = trades.portfolio_id AND portfolios.user_id = auth.uid()
        )
    );

-- ── 7. PORTFOLIO SNAPSHOTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
    equity DOUBLE PRECISION NOT NULL,
    cash DOUBLE PRECISION NOT NULL,
    snapshot_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (portfolio_id, snapshot_date)
);

ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own snapshots" ON public.portfolio_snapshots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.portfolios 
            WHERE portfolios.id = portfolio_snapshots.portfolio_id AND portfolios.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own snapshots" ON public.portfolio_snapshots
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.portfolios 
            WHERE portfolios.id = portfolio_snapshots.portfolio_id AND portfolios.user_id = auth.uid()
        )
    );

-- ── 8. WATCHLISTS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, symbol)
);

ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own watchlists" ON public.watchlists
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own watchlists" ON public.watchlists
    FOR ALL USING (auth.uid() = user_id);

-- ── 9. ACADEMY PROGRESS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    current_level TEXT NOT NULL DEFAULT 'BEGINNER' CHECK (current_level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
    lessons_completed INTEGER DEFAULT 0 NOT NULL,
    xp_points INTEGER DEFAULT 0 NOT NULL,
    badges JSONB DEFAULT '[]'::jsonb NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.academy_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress" ON public.academy_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own progress" ON public.academy_progress
    FOR ALL USING (auth.uid() = user_id);

-- ── 10. ACADEMY LESSONS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    topic TEXT NOT NULL,
    explanation TEXT NOT NULL,
    example TEXT NOT NULL,
    difficulty TEXT DEFAULT 'BEGINNER' CHECK (difficulty IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
    quiz JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.academy_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow reading lessons to authenticated users" ON public.academy_lessons
    FOR SELECT USING (auth.role() = 'authenticated');

-- ── 11. ACADEMY QUIZZES ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.academy_quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID REFERENCES public.academy_lessons(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    answer INTEGER NOT NULL,
    rationale TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.academy_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow reading quizzes to authenticated users" ON public.academy_quizzes
    FOR SELECT USING (auth.role() = 'authenticated');

-- ── 12. QUIZ RESULTS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quiz_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    quiz_id UUID REFERENCES public.academy_quizzes(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    correct BOOLEAN NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quiz results" ON public.quiz_results
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz results" ON public.quiz_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── 13. NEWS SENTIMENT ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.news_sentiment (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    sentiment_score DOUBLE PRECISION NOT NULL,
    source TEXT,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    cached_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.news_sentiment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow reading news sentiment to authenticated users" ON public.news_sentiment
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service role management of news sentiment" ON public.news_sentiment
    FOR ALL USING (true);

-- ── 14. PATTERN CACHE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pattern_cache (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    pattern_type TEXT NOT NULL,
    confidence_score DOUBLE PRECISION,
    detected_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.pattern_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow reading pattern cache to authenticated users" ON public.pattern_cache
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service role management of pattern cache" ON public.pattern_cache
    FOR ALL USING (true);

-- ── 15. MARKET SCANS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.market_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT NOT NULL,
    scan_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    patterns JSONB DEFAULT '[]'::jsonb NOT NULL,
    trend TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.market_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow reading market scans to authenticated users" ON public.market_scans
    FOR SELECT USING (auth.role() = 'authenticated');

-- ── 16. ALERTS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    alert_type TEXT CHECK (alert_type IN ('PRICE_ABOVE', 'PRICE_BELOW', 'PATTERN_DETECTED')),
    target_price DOUBLE PRECISION,
    condition TEXT,
    is_triggered BOOLEAN DEFAULT FALSE NOT NULL,
    triggered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own alerts" ON public.alerts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own alerts" ON public.alerts
    FOR ALL USING (auth.uid() = user_id);

-- ── 17. CHAT HISTORY ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    portfolio_context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chat history" ON public.chat_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat history" ON public.chat_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── 18. AI REPORTS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL CHECK (report_type IN ('PORTFOLIO_HEALTH', 'TRADE_JOURNAL_INSIGHT')),
    input_params JSONB NOT NULL,
    response_content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reports" ON public.ai_reports
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own reports" ON public.ai_reports
    FOR ALL USING (auth.uid() = user_id);

-- ── 19. NOTIFICATIONS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own notifications" ON public.notifications
    FOR ALL USING (auth.uid() = user_id);

-- ── 20. SETTINGS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    email_alerts BOOLEAN DEFAULT TRUE NOT NULL,
    weekly_report BOOLEAN DEFAULT TRUE NOT NULL,
    theme TEXT DEFAULT 'dark' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings" ON public.settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON public.settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON public.settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_portfolios_user ON public.portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_portfolio ON public.positions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON public.positions(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_portfolio ON public.trades(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON public.trades(symbol);
CREATE INDEX IF NOT EXISTS idx_snapshots_portfolio ON public.portfolio_snapshots(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_date ON public.portfolio_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_watchlists_user ON public.watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON public.academy_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lessons_difficulty ON public.academy_lessons(difficulty);
CREATE INDEX IF NOT EXISTS idx_results_user ON public.quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_news_published ON public.news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_sentiment_score ON public.news_sentiment(sentiment_score);
CREATE INDEX IF NOT EXISTS idx_scans_symbol ON public.market_scans(symbol);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON public.alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_user ON public.chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_user ON public.ai_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_user ON public.settings(user_id);

-- ── TRIGGERS & FUNCTIONS ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    profile_id UUID;
BEGIN
    profile_id := new.id;

    -- 1. Create public profile
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        profile_id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', 'Trader'),
        COALESCE(new.raw_user_meta_data->>'avatar_url', '')
    )
    ON CONFLICT (id) DO NOTHING;

    -- 2. Create user settings
    INSERT INTO public.settings (user_id, email_alerts, weekly_report, theme)
    VALUES (profile_id, TRUE, TRUE, 'dark')
    ON CONFLICT (user_id) DO NOTHING;

    -- 3. Create initial paper trading portfolio
    INSERT INTO public.portfolios (user_id, name, starting_balance, cash_balance, total_equity)
    VALUES (profile_id, 'My Portfolio', 10000.00, 10000.00, 10000.00)
    ON CONFLICT (user_id) DO NOTHING;

    -- 4. Create initial academy progress
    INSERT INTO public.academy_progress (user_id, current_level, lessons_completed, xp_points, badges)
    VALUES (profile_id, 'BEGINNER', 0, 0, '[]'::jsonb)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind the trigger function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
