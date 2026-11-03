-- ============================================================================
-- Teach&Learn: Storage Buckets Creation
-- Timestamp: 20260915110000
-- ============================================================================

-- 1. Create the 'class-materials' storage bucket (private by default)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'class-materials',
  'class-materials',
  false,
  52428800, -- 50 MB limit
  ARRAY[
    'image/jpeg', 
    'image/png', 
    'image/svg+xml', 
    'application/pdf', 
    'text/plain', 
    'text/csv', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
    'application/vnd.ms-excel', 
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', 
    'application/vnd.ms-powerpoint'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Create the 'student-submissions' storage bucket (private by default)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-submissions',
  'student-submissions',
  false,
  52428800, -- 50 MB limit
  ARRAY[
    'image/jpeg', 
    'image/png', 
    'image/svg+xml', 
    'application/pdf', 
    'text/plain', 
    'text/csv', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
    'application/vnd.ms-excel', 
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', 
    'application/vnd.ms-powerpoint'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
