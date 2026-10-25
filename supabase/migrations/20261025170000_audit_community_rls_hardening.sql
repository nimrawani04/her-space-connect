-- Supabase Migration: Strict Row-Level Security & Index Hardening for Community Posts and Comments
-- Ensures zero privilege leakage, explicit author check on all mutations, and index-backed RLS evaluation

-- 1. Enforce Row-Level Security on both tables
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

-- 2. Restrict table-level permissions: anonymous/public users cannot access directly
REVOKE ALL ON public.community_posts FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;

REVOKE ALL ON public.community_comments FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_comments TO authenticated;
GRANT ALL ON public.community_comments TO service_role;

-- 3. Community Posts Policies
DROP POLICY IF EXISTS "Posts readable by authenticated" ON public.community_posts;
DROP POLICY IF EXISTS "Users insert own posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users edit own posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users delete own posts" ON public.community_posts;

CREATE POLICY "Posts readable by authenticated" ON public.community_posts
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users insert own posts" ON public.community_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users edit own posts" ON public.community_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users delete own posts" ON public.community_posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- 4. Community Comments Policies
DROP POLICY IF EXISTS "Comments readable" ON public.community_comments;
DROP POLICY IF EXISTS "Insert own comments" ON public.community_comments;
DROP POLICY IF EXISTS "Users update own comments" ON public.community_comments;
DROP POLICY IF EXISTS "Delete own comments" ON public.community_comments;

CREATE POLICY "Comments readable" ON public.community_comments
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Insert own comments" ON public.community_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users update own comments" ON public.community_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Delete own comments" ON public.community_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- 5. Performance Indexes for foreign keys and RLS filtering
CREATE INDEX IF NOT EXISTS idx_community_posts_author_id ON public.community_posts (author_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON public.community_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_comments_post_id ON public.community_comments (post_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_author_id ON public.community_comments (author_id);
