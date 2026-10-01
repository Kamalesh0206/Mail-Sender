-- ==============================================================================
-- AI Birthday & Wishes Email Agent - PostgreSQL Database Schema
-- ==============================================================================

-- 1. Create Friends Table
CREATE TABLE IF NOT EXISTS friends (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    birth_date DATE NULL,
    birth_month INTEGER NOT NULL CHECK (birth_month >= 1 AND birth_month <= 12),
    birth_day INTEGER NOT NULL CHECK (birth_day >= 1 AND birth_day <= 31),
    birth_year INTEGER NULL CHECK (birth_year >= 1900 AND birth_year <= 2100),
    occasion_type VARCHAR(50) NOT NULL DEFAULT 'Birthday',
    relationship_type VARCHAR(50) NOT NULL DEFAULT 'Friend',
    personal_notes TEXT NULL,
    preferred_tone VARCHAR(50) NOT NULL DEFAULT 'Friendly',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_friends_email ON friends(email);
CREATE INDEX IF NOT EXISTS idx_friends_month_day ON friends(birth_month, birth_day);
CREATE INDEX IF NOT EXISTS idx_friends_active ON friends(is_active);

-- 2. Create Wishes History & Approval Queue Table
-- Includes Unique Constraint: (friend_id, occasion_type, year) for DUPLICATE PROTECTION
CREATE TABLE IF NOT EXISTS wishes_history (
    id SERIAL PRIMARY KEY,
    friend_id INTEGER NOT NULL REFERENCES friends(id) ON DELETE CASCADE,
    occasion_type VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL,
    recipient_name VARCHAR(150) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    tone VARCHAR(50) NOT NULL DEFAULT 'Friendly',
    generated_subject VARCHAR(255) NOT NULL,
    generated_body TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
    scheduled_for DATE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE NULL,
    gmail_message_id VARCHAR(255) NULL,
    error_message TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_friend_occasion_year UNIQUE (friend_id, occasion_type, year)
);

CREATE INDEX IF NOT EXISTS idx_wishes_friend_id ON wishes_history(friend_id);
CREATE INDEX IF NOT EXISTS idx_wishes_status ON wishes_history(status);
CREATE INDEX IF NOT EXISTS idx_wishes_scheduled ON wishes_history(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_wishes_occasion_year ON wishes_history(occasion_type, year);

-- 3. Create Application Settings Table
CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    gmail_connected BOOLEAN NOT NULL DEFAULT FALSE,
    gmail_email VARCHAR(255) NULL,
    encrypted_refresh_token TEXT NULL,
    access_token TEXT NULL,
    token_expiry TIMESTAMP WITH TIME ZONE NULL,
    automation_mode VARCHAR(20) NOT NULL DEFAULT 'APPROVAL',
    daily_send_time VARCHAR(10) NOT NULL DEFAULT '08:00',
    default_tone VARCHAR(50) NOT NULL DEFAULT 'Friendly',
    sender_name VARCHAR(100) NOT NULL DEFAULT 'Kamalesh',
    email_signature TEXT NOT NULL DEFAULT 'Best wishes,
Kamalesh',
    ai_model VARCHAR(50) NOT NULL DEFAULT 'gemini-2.5-flash',
    is_scheduler_running BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed default application settings row
INSERT INTO app_settings (id, gmail_connected, automation_mode, daily_send_time, default_tone, sender_name, email_signature, ai_model)
VALUES (1, FALSE, 'APPROVAL', '08:00', 'Friendly', 'Kamalesh', 'Best wishes,
Kamalesh', 'gemini-2.5-flash')
ON CONFLICT (id) DO NOTHING;
