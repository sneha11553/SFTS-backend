-- Smart Fitness Tracking System (SFTS) - PostgreSQL schema
-- Matches SRS Section 2.5 entities: Users, HealthProfile, Goals,
-- WorkoutPlans, DietPlans, SleepActivityLog, Reports

DROP TABLE IF EXISTS sleep_activity_log CASCADE;
DROP TABLE IF EXISTS diet_plans CASCADE;
DROP TABLE IF EXISTS workout_plans CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS health_profile CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(120) NOT NULL,
    email           VARCHAR(160) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'user',   -- 'user' | 'admin'
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- REQ-1: age, gender, height, weight captured at registration and editable later (REQ-4)
CREATE TABLE health_profile (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    age             INTEGER NOT NULL,
    gender          VARCHAR(10) NOT NULL,       -- 'male' | 'female' | 'other'
    height_cm       NUMERIC(5,2) NOT NULL,
    weight_kg       NUMERIC(5,2) NOT NULL,
    health_issues   TEXT,                       -- REQ-11: free-text / comma separated
    bmi             NUMERIC(5,2),                -- REQ-5 (recalculated, cached)
    maintenance_cal INTEGER,                     -- REQ-6 (recalculated, cached)
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- REQ-8/9/10: one active goal at a time (business rule 5.5)
CREATE TABLE goals (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_type       VARCHAR(20) NOT NULL,        -- 'loss' | 'gain' | 'recomposition'
    environment     VARCHAR(10) NOT NULL DEFAULT 'gym', -- 'gym' | 'home' (REQ-13)
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE workout_plans (
    id              SERIAL PRIMARY KEY,
    goal_id         INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    day_name        VARCHAR(30) NOT NULL,        -- e.g. 'Day 1 - Push'
    exercises       TEXT NOT NULL,               -- JSON/text list of exercises
    day_order       INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE diet_plans (
    id                  SERIAL PRIMARY KEY,
    goal_id             INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    target_calories     INTEGER NOT NULL,        -- REQ-16
    protein_g           INTEGER NOT NULL,
    carbs_g             INTEGER NOT NULL,
    fat_g               INTEGER NOT NULL,
    notes               TEXT                     -- health-issue adjustments (REQ-18)
);

CREATE TABLE sleep_activity_log (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date        DATE NOT NULL,
    sleep_hours     NUMERIC(4,2),                -- REQ-19
    activity_type   VARCHAR(60),                 -- REQ-20
    activity_minutes INTEGER,
    UNIQUE(user_id, log_date)
);

CREATE INDEX idx_health_profile_user ON health_profile(user_id);
CREATE INDEX idx_goals_user_active ON goals(user_id, is_active);
CREATE INDEX idx_sleep_log_user_date ON sleep_activity_log(user_id, log_date);
