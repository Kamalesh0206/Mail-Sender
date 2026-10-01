-- ==============================================================================
-- WishMail AI - PostgreSQL Database Schema
-- Tagline: Personal wishes. Meaningful quotes. Automatically delivered.
-- ==============================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Friends Table
CREATE TABLE IF NOT EXISTS friends (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    birthday VARCHAR(50) NULL,
    birth_month INTEGER NULL,
    birth_day INTEGER NULL,
    birth_year INTEGER NULL,
    anniversary VARCHAR(50) NULL,
    anniversary_month INTEGER NULL,
    anniversary_day INTEGER NULL,
    anniversary_year INTEGER NULL,
    relationship VARCHAR(100) NOT NULL DEFAULT 'Close Friend',
    personal_notes TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    enable_wishes BOOLEAN NOT NULL DEFAULT TRUE,
    enable_quotes BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_friends_email ON friends(email);
CREATE INDEX IF NOT EXISTS idx_friends_active ON friends(is_active);

-- 3. Friend Groups
CREATE TABLE IF NOT EXISTS friend_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Friend Group Members Junction Table
CREATE TABLE IF NOT EXISTS friend_group_members (
    id SERIAL PRIMARY KEY,
    friend_id INTEGER NOT NULL REFERENCES friends(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES friend_groups(id) ON DELETE CASCADE,
    CONSTRAINT uq_friend_group UNIQUE (friend_id, group_id)
);

-- 5. Generic Occasion Model (Birthday, Anniversary, Custom Occasion)
CREATE TABLE IF NOT EXISTS occasions (
    id SERIAL PRIMARY KEY,
    friend_id INTEGER NOT NULL REFERENCES friends(id) ON DELETE CASCADE,
    occasion_type VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    date_str VARCHAR(50) NOT NULL,
    month INTEGER NOT NULL,
    day INTEGER NOT NULL,
    year INTEGER NULL,
    notes TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_occasions_friend_id ON occasions(friend_id);
CREATE INDEX IF NOT EXISTS idx_occasions_month_day ON occasions(month, day);

-- 6. Quotes Table (User-provided quotes, exact preservation)
CREATE TABLE IF NOT EXISTS quotes (
    id SERIAL PRIMARY KEY,
    quote_text TEXT NOT NULL,
    author VARCHAR(150) NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Quote Schedules Table
CREATE TABLE IF NOT EXISTS quote_schedules (
    id SERIAL PRIMARY KEY,
    quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    send_date DATE NOT NULL,
    send_time VARCHAR(10) NOT NULL DEFAULT '08:00',
    recipient_type VARCHAR(50) NOT NULL DEFAULT 'ALL',
    target_group_id INTEGER NULL REFERENCES friend_groups(id) ON DELETE SET NULL,
    target_friend_id INTEGER NULL REFERENCES friends(id) ON DELETE SET NULL,
    target_recipient_ids TEXT NULL,
    subject VARCHAR(255) NOT NULL DEFAULT '🌅 Today''s Thought',
    personalized_intro BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quote_schedules_date ON quote_schedules(send_date);
CREATE INDEX IF NOT EXISTS idx_quote_schedules_status ON quote_schedules(status);

-- 8. Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    template_type VARCHAR(50) NOT NULL,
    greeting VARCHAR(150) NOT NULL DEFAULT 'Hi {{friend_name}},',
    body_structure TEXT NOT NULL,
    closing VARCHAR(150) NOT NULL DEFAULT 'Have a great day!',
    signature VARCHAR(150) NOT NULL DEFAULT 'Best wishes,
{{sender_name}}',
    is_default BOOLEAN NOT NULL DEFAULT FALSE
);

-- 9. Email History & Delivery Table
CREATE TABLE IF NOT EXISTS email_history (
    id SERIAL PRIMARY KEY,
    recipient_name VARCHAR(150) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    email_type VARCHAR(20) NOT NULL,
    occasion_id INTEGER NULL REFERENCES occasions(id) ON DELETE SET NULL,
    occasion_name VARCHAR(100) NULL,
    quote_id INTEGER NULL REFERENCES quotes(id) ON DELETE SET NULL,
    quote_schedule_id INTEGER NULL REFERENCES quote_schedules(id) ON DELETE SET NULL,
    friend_id INTEGER NULL REFERENCES friends(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    sent_date DATE NOT NULL,
    sent_time VARCHAR(20) NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    gmail_message_id VARCHAR(255) NULL,
    error_message TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_wish_friend_occasion_date UNIQUE (friend_id, occasion_name, sent_date),
    CONSTRAINT uq_quote_schedule_recipient_date UNIQUE (quote_schedule_id, recipient_email, sent_date)
);

CREATE INDEX IF NOT EXISTS idx_email_history_type ON email_history(email_type);
CREATE INDEX IF NOT EXISTS idx_email_history_status ON email_history(status);
CREATE INDEX IF NOT EXISTS idx_email_history_date ON email_history(sent_date);

-- 10. Application Settings Table
CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    gmail_connected BOOLEAN NOT NULL DEFAULT FALSE,
    gmail_email VARCHAR(255) NULL,
    encrypted_refresh_token TEXT NULL,
    access_token TEXT NULL,
    token_expiry TIMESTAMP WITH TIME ZONE NULL,
    timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
    default_send_time VARCHAR(10) NOT NULL DEFAULT '08:00',
    default_wish_tone VARCHAR(50) NOT NULL DEFAULT 'Friendly',
    auto_send_wishes BOOLEAN NOT NULL DEFAULT FALSE,
    auto_send_quotes BOOLEAN NOT NULL DEFAULT TRUE,
    default_quote_greeting VARCHAR(150) NOT NULL DEFAULT 'Hi {{friend_name}},',
    default_quote_closing VARCHAR(150) NOT NULL DEFAULT 'Have a great day!',
    sender_name VARCHAR(100) NOT NULL DEFAULT 'Kamalesh',
    email_signature TEXT NOT NULL DEFAULT 'Best wishes,
Kamalesh',
    ai_model VARCHAR(50) NOT NULL DEFAULT 'gemini-2.5-flash',
    ai_personalization BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
