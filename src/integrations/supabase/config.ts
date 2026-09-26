const DEFAULT_SUPABASE_URL = "https://foteraufomwdujwappjt.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdGVyYXVmb213ZHVqd2FwcGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NTY0MTYsImV4cCI6MjA5ODAzMjQxNn0.upuLKtTRcIBXpLG-W0eozuiF5gImWS2cZq06_PW4Jdw";

export function getSupabaseUrl(): string {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  if (envUrl && !envUrl.includes("syvqiqhyaoohbjbkftaj")) {
    return envUrl;
  }
  return DEFAULT_SUPABASE_URL;
}

export function getSupabasePublishableKey(): string {
  const envKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (
    envKey &&
    !envKey.startsWith("sb_publishable_") &&
    !envKey.startsWith("sb_secret_") &&
    envKey !== "replace_with_your_supabase_publishable_or_anon_key" &&
    envKey !== "your_supabase_publishable_or_anon_key"
  ) {
    return envKey;
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
