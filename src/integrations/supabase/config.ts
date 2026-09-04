/**
 * The preview can briefly render before managed Cloud variables are injected.
 * Public UI must remain available during that window instead of touching the
 * lazy client and sending the whole route to the error boundary.
 */
export function hasSupabaseBrowserConfig(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  return Boolean(
    url &&
    key &&
    key !== "replace_with_your_supabase_publishable_or_anon_key" &&
    key !== "your_supabase_publishable_or_anon_key",
  );
}
