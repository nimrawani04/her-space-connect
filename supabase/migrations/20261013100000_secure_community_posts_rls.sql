-- Security Audit & Hardening for Community Posts and Comments
-- Enforces strict RLS WITH CHECK, denies unauthenticated access, and adds atomic like increment RPC

-- 1. Ensure anonymous role cannot access community content directly
REVOKE ALL ON public.community_posts FROM anon, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;

REVOKE ALL ON public.community_comments FROM anon, public;
GRANT SELECT, INSERT, DELETE ON public.community_comments TO authenticated;
GRANT ALL ON public.community_comments TO service_role;

-- 2. Harden Community Posts UPDATE Policy
DROP POLICY IF EXISTS "Users edit own posts" ON public.community_posts;
CREATE POLICY "Users edit own posts" ON public.community_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- 3. Harden Community Posts DELETE Policy
DROP POLICY IF EXISTS "Users delete own posts" ON public.community_posts;
CREATE POLICY "Users delete own posts" ON public.community_posts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- 4. Harden Community Posts INSERT Policy
DROP POLICY IF EXISTS "Users insert own posts" ON public.community_posts;
CREATE POLICY "Users insert own posts" ON public.community_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- 5. Harden Community Posts SELECT Policy
DROP POLICY IF EXISTS "Posts readable by authenticated" ON public.community_posts;
CREATE POLICY "Posts readable by authenticated" ON public.community_posts
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- 6. Atomic, Secure RPC for Liking Posts
-- Prevents non-authors from directly updating post fields while allowing authenticated members to like
CREATE OR REPLACE FUNCTION public.increment_community_post_like(p_post_id UUID)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to like posts';
  END IF;

  UPDATE public.community_posts
  SET like_count = coalesce(like_count, 0) + 1
  WHERE id = p_post_id
  RETURNING like_count INTO v_new_count;

  RETURN coalesce(v_new_count, 0);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_community_post_like(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_community_post_like(UUID) TO authenticated;
