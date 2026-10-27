-- ==============================================================================
-- Teach&Learn — Supabase CLI Local Development Seed Data
-- This script is executed by `supabase start` and `supabase db reset` to provide
-- consistent initial fixtures for local developer onboarding and testing.
-- ==============================================================================

-- ==============================================================================
-- 1. Sample Educational Institutes (Public Schema)
-- ==============================================================================
INSERT INTO public.institutes (id, name, type, country, state, city, district)
VALUES 
    -- India
    ('00000000-0000-0000-0001-000000000001', 'Delhi Public School', 'K-12', 'India', 'Delhi', 'New Delhi', 'New Delhi'),
    ('00000000-0000-0000-0001-000000000002', 'Indian Institute of Technology Bombay', 'University', 'India', 'Maharashtra', 'Mumbai', 'Mumbai Suburban'),
    ('00000000-0000-0000-0001-000000000003', 'Bangalore International School', 'High School', 'India', 'Karnataka', 'Bengaluru', 'Bengaluru Urban'),
    ('00000000-0000-0000-0001-000000000004', 'St. Xavier''s College', 'College', 'India', 'Maharashtra', 'Mumbai', 'Mumbai City'),
    ('00000000-0000-0000-0001-000000000005', 'Oakridge International School', 'High School', 'India', 'Telangana', 'Hyderabad', 'Hyderabad'),
    ('00000000-0000-0000-0001-000000000006', 'Apex Tutoring Center', 'Tutoring Center', 'India', 'Karnataka', 'Bengaluru', 'Bengaluru Urban'),
    ('00000000-0000-0000-0001-000000000007', 'NextGen Online Academy', 'Online Academy', 'India', 'Karnataka', 'Bengaluru', 'Bengaluru Urban'),
    -- United States
    ('00000000-0000-0000-0001-000000000008', 'Lincoln High School', 'High School', 'United States', 'California', 'San Francisco', 'San Francisco'),
    ('00000000-0000-0000-0001-000000000009', 'Pacific Horizon University', 'University', 'United States', 'Washington', 'Seattle', 'King County'),
    ('00000000-0000-0000-0001-000000000010', 'Westbridge Community College', 'College', 'United States', 'New York', 'New York', 'New York'),
    -- United Kingdom
    ('00000000-0000-0000-0001-000000000011', 'Westminster Grammar School', 'High School', 'United Kingdom', 'England', 'London', 'Westminster'),
    ('00000000-0000-0000-0001-000000000012', 'Cambridge Technical Institute', 'Vocational School', 'United Kingdom', 'England', 'Cambridge', 'Cambridgeshire')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    country = EXCLUDED.country,
    state = EXCLUDED.state,
    city = EXCLUDED.city,
    district = EXCLUDED.district;


-- ==============================================================================
-- 2. Pedagogical Knowledge Graph: Concepts (AI Schema)
-- ==============================================================================
INSERT INTO ai.ontology_concepts (id, subject, code, name, description, bloom_level, parent_concept_id, metadata)
VALUES
    -- Mathematics Concepts
    ('00000000-0000-0000-0002-000000000001', 'Mathematics', 'MATH-ALG-00', 'Algebra Fundamentals', 'Core operations, variables, and properties of algebraic expressions', 'Remember', NULL, '{"grade_band": "Middle School", "difficulty": 1}'::jsonb),
    ('00000000-0000-0000-0002-000000000002', 'Mathematics', 'MATH-ALG-01', 'Linear Equations in One Variable', 'Solving first-degree equations using inverse arithmetic operations', 'Apply', '00000000-0000-0000-0002-000000000001', '{"grade_band": "High School", "difficulty": 2}'::jsonb),
    ('00000000-0000-0000-0002-000000000003', 'Mathematics', 'MATH-ALG-02', 'Quadratic Equations & Factoring', 'Solving second-degree polynomial equations by factoring, completing the square, or quadratic formula', 'Analyze', '00000000-0000-0000-0002-000000000001', '{"grade_band": "High School", "difficulty": 3}'::jsonb),
    ('00000000-0000-0000-0002-000000000004', 'Mathematics', 'MATH-ALG-03', 'Systems of Linear Equations', 'Solving two or more simultaneous linear equations using substitution, elimination, and graphing', 'Apply', '00000000-0000-0000-0002-000000000002', '{"grade_band": "High School", "difficulty": 3}'::jsonb),

    -- Science Concepts
    ('00000000-0000-0000-0002-000000000010', 'Science', 'PHYS-MEC-00', 'Classical Mechanics Foundations', 'Principles governing motion, forces, and physical interactions of macroscopic objects', 'Understand', NULL, '{"grade_band": "High School", "difficulty": 2}'::jsonb),
    ('00000000-0000-0000-0002-000000000011', 'Science', 'PHYS-MEC-01', 'Newton''s Laws of Motion', 'Three physical laws describing relationship between force, mass, and resultant acceleration', 'Apply', '00000000-0000-0000-0002-000000000010', '{"grade_band": "High School", "difficulty": 3}'::jsonb),
    ('00000000-0000-0000-0002-000000000012', 'Science', 'PHYS-MEC-02', 'Conservation of Energy & Momentum', 'Principles stating total energy and linear momentum remain constant in isolated systems', 'Evaluate', '00000000-0000-0000-0002-000000000010', '{"grade_band": "High School", "difficulty": 4}'::jsonb),

    -- Computer Science Concepts
    ('00000000-0000-0000-0002-000000000020', 'Computer Science', 'CS-DS-00', 'Data Structures & Algorithms Basics', 'Core paradigms for organizing, managing, and storing structured computational data', 'Understand', NULL, '{"grade_band": "College", "difficulty": 2}'::jsonb),
    ('00000000-0000-0000-0002-000000000021', 'Computer Science', 'CS-DS-01', 'Arrays & Linked Lists', 'Sequential and node-based linear data structures with pointer-based traversal', 'Apply', '00000000-0000-0000-0002-000000000020', '{"grade_band": "College", "difficulty": 2}'::jsonb),
    ('00000000-0000-0000-0002-000000000022', 'Computer Science', 'CS-DS-02', 'Binary Search Trees & Balancing', 'Hierarchical tree data structures with logarithmic search, insertion, and self-balancing mechanics', 'Analyze', '00000000-0000-0000-0002-000000000020', '{"grade_band": "College", "difficulty": 4}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
    subject = EXCLUDED.subject,
    code = EXCLUDED.code,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    bloom_level = EXCLUDED.bloom_level,
    parent_concept_id = EXCLUDED.parent_concept_id,
    metadata = EXCLUDED.metadata;


-- ==============================================================================
-- 3. Pedagogical Knowledge Graph: Relationships & Prerequisite Edges (AI Schema)
-- ==============================================================================
INSERT INTO ai.ontology_relationships (id, source_concept_id, target_concept_id, relationship_type, weight, metadata)
VALUES
    -- Algebra: Fundamentals -> Linear Equations
    ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0002-000000000002', 'prerequisite_of', 1.0, '{"strictness": "mandatory"}'::jsonb),
    -- Algebra: Linear Equations -> Quadratic Equations
    ('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0002-000000000003', 'prerequisite_of', 0.9, '{"strictness": "mandatory"}'::jsonb),
    -- Algebra: Linear Equations -> Systems of Linear Equations
    ('00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0002-000000000004', 'prerequisite_of', 1.0, '{"strictness": "mandatory"}'::jsonb),
    -- Physics: Mechanics Foundations -> Newton's Laws
    ('00000000-0000-0000-0003-000000000010', '00000000-0000-0000-0002-000000000010', '00000000-0000-0000-0002-000000000011', 'prerequisite_of', 1.0, '{"strictness": "mandatory"}'::jsonb),
    -- Physics: Newton's Laws -> Conservation of Energy
    ('00000000-0000-0000-0003-000000000011', '00000000-0000-0000-0002-000000000011', '00000000-0000-0000-0002-000000000012', 'prerequisite_of', 0.85, '{"strictness": "recommended"}'::jsonb),
    -- CS: Arrays/Lists -> BST
    ('00000000-0000-0000-0003-000000000020', '00000000-0000-0000-0002-000000000021', '00000000-0000-0000-0002-000000000022', 'prerequisite_of', 0.95, '{"strictness": "mandatory"}'::jsonb)
ON CONFLICT (source_concept_id, target_concept_id, relationship_type) DO UPDATE SET
    weight = EXCLUDED.weight,
    metadata = EXCLUDED.metadata;


-- ==============================================================================
-- 4. Common Misconceptions & Pedagogical Remediation Rules (AI Schema)
-- ==============================================================================
INSERT INTO ai.ontology_misconceptions (id, concept_id, error_pattern, remediation_strategy, severity)
VALUES
    ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0002-000000000003', 'Treats (a+b)^2 as a^2 + b^2 (Freshman''s Dream)', 'Guide student through the geometric area model (FOIL) with 4 distinct sub-quadrants demonstrating 2ab cross-term', 'Critical'),
    ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0002-000000000002', 'Forgets to reverse inequality sign when multiplying or dividing by negative values', 'Use concrete number-line reflections (-2 < 3 vs 2 > -3) to visualize sign inversion', 'Moderate'),
    ('00000000-0000-0000-0004-000000000003', '00000000-0000-0000-0002-000000000011', 'Believes constant force is required to maintain constant velocity (Aristotelian misconception)', 'Contrast friction-dominated terrestrial motion with frictionless deep-space coasting (Newton''s First Law)', 'Moderate'),
    ('00000000-0000-0000-0004-000000000004', '00000000-0000-0000-0002-000000000021', 'Confuses 0-based array index with 1-based length causing off-by-one fencepost errors', 'Emphasize index as offset from pointer head rather than cardinal item counter', 'Minor')
ON CONFLICT (id) DO UPDATE SET
    concept_id = EXCLUDED.concept_id,
    error_pattern = EXCLUDED.error_pattern,
    remediation_strategy = EXCLUDED.remediation_strategy,
    severity = EXCLUDED.severity;
