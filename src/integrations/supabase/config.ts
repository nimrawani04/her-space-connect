/**
 * The preview can briefly render before managed Cloud variables are injected.
 * Public UI must remain available during that window instead of touching the
 * lazy client and sending the whole route to the error boundary.
 */
export function hasSupabaseBrowserConfig(): boolean {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  );
}