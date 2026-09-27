const DEFAULT_SUPABASE_URL = "https://syvqiqhyaoohbjbkftaj.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_B8OjiP_STSjviMyhtF_5RQ_D5mRy53U";

export function getSupabaseUrl(): string {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  if (envUrl && envUrl.startsWith("https://") && envUrl.includes(".supabase.co")) {
    return envUrl.trim();
  }
  return DEFAULT_SUPABASE_URL;
}

export function getSupabasePublishableKey(): string {
  const envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (
    envKey &&
    !envKey.startsWith("sb_secret_") &&
    envKey !== "replace_with_your_supabase_publishable_or_anon_key" &&
    envKey !== "your_supabase_publishable_or_anon_key"
  ) {
    return envKey.trim();
  }
  return DEFAULT_SUPABASE_PUBLISHABLE_KEY;
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
