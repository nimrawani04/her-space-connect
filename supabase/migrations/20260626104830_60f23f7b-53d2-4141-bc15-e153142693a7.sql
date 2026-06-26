
-- ===== journeys =====
CREATE TABLE public.journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL UNIQUE,
  tags text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journeys TO authenticated;
GRANT ALL ON public.journeys TO service_role;
ALTER TABLE public.journeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journeys read" ON public.journeys FOR SELECT TO authenticated USING (true);
CREATE POLICY "journeys insert" ON public.journeys FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "journeys update own" ON public.journeys FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "journeys delete own" ON public.journeys FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE TABLE public.journey_members (
  journey_id uuid NOT NULL REFERENCES public.journeys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (journey_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.journey_members TO authenticated;
GRANT ALL ON public.journey_members TO service_role;
ALTER TABLE public.journey_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jm read" ON public.journey_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "jm join" ON public.journey_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "jm leave" ON public.journey_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== opportunities =====
CREATE TABLE public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  org text NOT NULL,
  region text NOT NULL,
  url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "opps read" ON public.opportunities FOR SELECT TO authenticated USING (true);
CREATE POLICY "opps insert" ON public.opportunities FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "opps update own" ON public.opportunities FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "opps delete own" ON public.opportunities FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- ===== service listings =====
CREATE TABLE public.service_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_name text NOT NULL,
  craft text NOT NULL,
  price text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_listings TO authenticated;
GRANT ALL ON public.service_listings TO service_role;
ALTER TABLE public.service_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "svc read" ON public.service_listings FOR SELECT TO authenticated USING (true);
CREATE POLICY "svc insert" ON public.service_listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "svc update own" ON public.service_listings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "svc delete own" ON public.service_listings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== travel hosts =====
CREATE TABLE public.travel_hosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  city text NOT NULL,
  country text NOT NULL,
  note text,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, city)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_hosts TO authenticated;
GRANT ALL ON public.travel_hosts TO service_role;
ALTER TABLE public.travel_hosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "th read" ON public.travel_hosts FOR SELECT TO authenticated USING (true);
CREATE POLICY "th insert" ON public.travel_hosts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "th update own" ON public.travel_hosts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "th delete own" ON public.travel_hosts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===== library articles =====
CREATE TABLE public.library_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  topic text NOT NULL,
  read_minutes integer NOT NULL DEFAULT 5,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.library_articles TO authenticated;
GRANT ALL ON public.library_articles TO service_role;
ALTER TABLE public.library_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lib read" ON public.library_articles FOR SELECT TO authenticated USING (true);
CREATE POLICY "lib admin write" ON public.library_articles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== seed catalog (one-time, idempotent) =====
INSERT INTO public.journeys (title, tags) VALUES
  ('Living with PCOS', ARRAY['Health','Hormones']),
  ('Study abroad', ARRAY['Education','Move']),
  ('First engineering job', ARRAY['Career','Tech']),
  ('Divorce recovery', ARRAY['Family','Healing']),
  ('Building my startup', ARRAY['Founder']),
  ('Freelancing full-time', ARRAY['Career'])
ON CONFLICT (title) DO NOTHING;

INSERT INTO public.opportunities (type, title, org, region, url) VALUES
  ('Scholarship','Schwarzman Scholars 2026','Tsinghua University','Global','https://www.schwarzmanscholars.org'),
  ('Fellowship','Mozilla Tech Fellows','Mozilla Foundation','Remote','https://foundation.mozilla.org'),
  ('Grant','Cartier Women''s Initiative','Cartier','Global','https://www.cartierwomensinitiative.com'),
  ('Internship','ML Research Intern','DeepMind','London','https://deepmind.google/careers'),
  ('Competition','Women in AI Hackathon','WAI','Online','https://www.womeninai.co')
ON CONFLICT DO NOTHING;

INSERT INTO public.library_articles (title, topic, read_minutes, summary) VALUES
  ('Understanding PCOS: a beginner''s guide','PCOS',8,'What PCOS is, common signs, and how it''s diagnosed.'),
  ('Endometriosis is not "just a bad period"','Endometriosis',11,'Why endo pain is medical, not "normal".'),
  ('What perimenopause actually feels like','Menopause',9,'Symptoms, timelines, and what helps.'),
  ('Strength training across the cycle','Fitness',7,'How to train with your cycle, not against it.'),
  ('Breast self-exam, step by step','Breast health',5,'A monthly self-exam in under 5 minutes.'),
  ('Iron, ferritin, and why women run low','Nutrition',6,'How to spot and fix low iron.')
ON CONFLICT DO NOTHING;
