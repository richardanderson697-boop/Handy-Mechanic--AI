-- Handy Mechanic AI Database Schema
-- Production-ready schema with RLS enabled

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name VARCHAR(255),
    phone VARCHAR(20),
    credits INTEGER DEFAULT 0,
    subscription_status VARCHAR(50) DEFAULT 'none', -- 'none', 'active', 'cancelled'
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Diagnoses table
CREATE TABLE IF NOT EXISTS diagnoses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Vehicle info
    vehicle_year INTEGER NOT NULL,
    vehicle_make VARCHAR(100) NOT NULL,
    vehicle_model VARCHAR(100) NOT NULL,
    vin VARCHAR(17),
    mileage INTEGER,
    
    -- Input data
    symptom_text TEXT NOT NULL,
    audio_url TEXT,
    photo_urls TEXT[], -- Array of photo URLs
    audio_features JSONB, -- Extracted audio features
    
    -- AI Analysis
    diagnosis_result JSONB NOT NULL, -- Complete diagnosis from AI
    primary_issue VARCHAR(255),
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    severity VARCHAR(50), -- 'low', 'medium', 'high', 'critical'
    safe_to_drive BOOLEAN,
    
    -- RAG Context
    retrieved_tsbs JSONB, -- TSBs from vector database
    retrieved_procedures JSONB, -- Repair procedures
    audio_classification JSONB, -- Audio ML classification results
    
    -- Recommendations
    repair_steps JSONB,
    parts_needed JSONB,
    estimated_cost JSONB,
    youtube_videos JSONB,
    
    -- Safety
    safety_warnings TEXT[],
    immediate_action_required TEXT,
    
    -- Metadata
    credits_used INTEGER DEFAULT 1,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    amount INTEGER NOT NULL, -- Amount in cents
    currency VARCHAR(3) DEFAULT 'usd',
    status VARCHAR(50) NOT NULL, -- 'pending', 'succeeded', 'failed'
    credits_purchased INTEGER NOT NULL,
    payment_method VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehicle History Lookups table
CREATE TABLE IF NOT EXISTS vehicle_history_lookups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vin VARCHAR(17) NOT NULL,
    
    -- NHTSA Data
    nhtsa_data JSONB,
    recalls JSONB,
    complaints JSONB,
    
    -- Carfax/NMVTIS Data
    vehicle_history JSONB,
    accident_history JSONB,
    ownership_history JSONB,
    title_info JSONB,
    
    -- Price Data
    estimated_value JSONB,
    market_price JSONB,
    
    credits_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insurance Quotes table
CREATE TABLE IF NOT EXISTS insurance_quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vehicle_year INTEGER NOT NULL,
    vehicle_make VARCHAR(100) NOT NULL,
    vehicle_model VARCHAR(100) NOT NULL,
    vin VARCHAR(17),
    
    -- User info for quote
    zip_code VARCHAR(10),
    age INTEGER,
    driving_history VARCHAR(50),
    
    -- Quotes from providers
    quotes JSONB NOT NULL, -- Array of quotes from different insurers
    
    -- Affiliate tracking
    affiliate_clicks JSONB, -- Track which quotes were clicked
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Affiliate Conversions table
CREATE TABLE IF NOT EXISTS affiliate_conversions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    quote_id UUID REFERENCES insurance_quotes(id) ON DELETE SET NULL,
    
    affiliate_provider VARCHAR(100) NOT NULL, -- 'progressive', 'geico', etc.
    affiliate_click_id VARCHAR(255),
    conversion_type VARCHAR(50), -- 'quote_click', 'policy_purchase'
    
    commission_amount DECIMAL(10,2),
    commission_status VARCHAR(50) DEFAULT 'pending',
    
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Knowledge Base Cache table (for caching frequent queries)
CREATE TABLE IF NOT EXISTS knowledge_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    vehicle_make VARCHAR(100),
    vehicle_model VARCHAR(100),
    vehicle_year INTEGER,
    symptom_hash VARCHAR(64), -- SHA256 of symptom text
    
    cached_result JSONB NOT NULL,
    hit_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_user ON diagnoses(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_created ON diagnoses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diagnoses_vehicle ON diagnoses(vehicle_make, vehicle_model, vehicle_year);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_history_vin ON vehicle_history_lookups(vin);
CREATE INDEX IF NOT EXISTS idx_insurance_quotes_user ON insurance_quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_cache_key ON knowledge_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_knowledge_cache_vehicle ON knowledge_cache(vehicle_make, vehicle_model, vehicle_year);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_history_lookups ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_conversions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users: Can only read/update their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Diagnoses: Users can only see their own diagnoses
CREATE POLICY "Users can view own diagnoses" ON diagnoses
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create own diagnoses" ON diagnoses
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Payments: Users can only see their own payments
CREATE POLICY "Users can view own payments" ON payments
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create own payments" ON payments
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Vehicle History: Users can only see their own lookups
CREATE POLICY "Users can view own vehicle history" ON vehicle_history_lookups
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create vehicle history lookups" ON vehicle_history_lookups
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Insurance Quotes: Users can only see their own quotes
CREATE POLICY "Users can view own insurance quotes" ON insurance_quotes
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create insurance quotes" ON insurance_quotes
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Functions

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diagnoses_updated_at BEFORE UPDATE ON diagnoses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to decrement user credits
CREATE OR REPLACE FUNCTION decrement_user_credits(user_uuid UUID, amount INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    current_credits INTEGER;
BEGIN
    SELECT credits INTO current_credits FROM users WHERE id = user_uuid FOR UPDATE;
    
    IF current_credits >= amount THEN
        UPDATE users SET credits = credits - amount WHERE id = user_uuid;
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to add user credits
CREATE OR REPLACE FUNCTION add_user_credits(user_uuid UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE users SET credits = credits + amount WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE users IS 'User accounts with authentication and subscription info';
COMMENT ON TABLE diagnoses IS 'AI diagnostic results with RAG context';
COMMENT ON TABLE payments IS 'Stripe payment records';
COMMENT ON TABLE vehicle_history_lookups IS 'VIN lookups and vehicle history reports';
COMMENT ON TABLE insurance_quotes IS 'Insurance quotes from affiliate partners';
COMMENT ON TABLE affiliate_conversions IS 'Tracking for affiliate commissions';
COMMENT ON TABLE knowledge_cache IS 'Cache for frequently accessed diagnostic knowledge';
