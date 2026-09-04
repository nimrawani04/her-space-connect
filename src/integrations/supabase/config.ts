const DEFAULT_SUPABASE_URL = "https://syvqiqhyaoohbjbkftaj.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_B8OjiP_STSjviMyhtF_5RQ_D5mRy53Unpx";

export function getSupabaseUrl(): string {
  return import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
}

export function getSupabasePublishableKey(): string {
  return import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
}

export function hasSupabaseBrowserConfig(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();

  return Boolean(
    url &&
    key &&
    key !== "replace_with_your_supabase_publishable_or_anon_key" &&
    key !== "your_supabase_publishable_or_anon_key",
  );
}
