-- ==============================================================================
-- Teach&Learn — Supabase CLI Local Development Seed Data
-- This script is executed by `supabase start` and `supabase db reset` to provide
-- consistent initial fixtures for local developer onboarding.
-- ==============================================================================

-- 1. Sample Educational Institutes
INSERT INTO public.institutes (id, name, type, country, state, city, district)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Oakridge High School', 'School', 'United States', 'California', 'San Francisco', 'North Bay'),
    ('00000000-0000-0000-0000-000000000002', 'Pacific Horizon University', 'University', 'United States', 'Washington', 'Seattle', 'King County')
ON CONFLICT (id) DO NOTHING;
