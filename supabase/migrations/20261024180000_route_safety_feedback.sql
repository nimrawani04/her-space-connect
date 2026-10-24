-- Migration for Route Safety Feedback & Real-Time Safety Weights
-- Enables women to rate their trips and dynamically update safety scores for routes

CREATE TABLE IF NOT EXISTS public.route_safety_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  route_title text,
  start_lat numeric(9,6) NOT NULL,
  start_lng numeric(9,6) NOT NULL,
  start_name text,
  end_lat numeric(9,6) NOT NULL,
  end_lng numeric(9,6) NOT NULL,
  end_name text,
  safety_rating integer NOT NULL CHECK (safety_rating BETWEEN 1 AND 5),
  felt_safe boolean NOT NULL DEFAULT true,
  lighting_level text CHECK (lighting_level IN ('bright', 'moderate', 'poor', 'dark')),
  crowd_level text CHECK (crowd_level IN ('crowded', 'moderate', 'deserted')),
  hazards text[] DEFAULT '{}',
  safe_spots text[] DEFAULT '{}',
  comment text,
  route_type text DEFAULT 'safest',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.route_safety_feedback ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users and anonymous to read aggregate trip feedback
DROP POLICY IF EXISTS "Public route feedback read" ON public.route_safety_feedback;
CREATE POLICY "Public route feedback read" ON public.route_safety_feedback
  FOR SELECT
  USING (true);

-- Allow authenticated or anonymous guests to insert trip feedback
DROP POLICY IF EXISTS "Insert route feedback" ON public.route_safety_feedback;
CREATE POLICY "Insert route feedback" ON public.route_safety_feedback
  FOR INSERT
  WITH CHECK (true);

GRANT SELECT, INSERT ON public.route_safety_feedback TO authenticated, anon;
GRANT ALL ON public.route_safety_feedback TO service_role;

-- Add to realtime publication so clients receive instant live updates
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.route_safety_feedback;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
