import { supabase } from "@/integrations/supabase/client";
import { hasSupabaseBrowserConfig } from "@/integrations/supabase/config";

const AUTH_DESTINATION_KEY = "herspace:post-auth-path";
const DEFAULT_AUTH_DESTINATION = "/dashboard";

function safeDestination(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export function rememberAuthDestination(destination = DEFAULT_AUTH_DESTINATION) {
  const safe = safeDestination(destination) ?? DEFAULT_AUTH_DESTINATION;
  localStorage.setItem(AUTH_DESTINATION_KEY, safe);
  sessionStorage.setItem(AUTH_DESTINATION_KEY, safe);
}

export function getAuthDestination() {
  return (
    safeDestination(localStorage.getItem(AUTH_DESTINATION_KEY)) ??
    safeDestination(sessionStorage.getItem(AUTH_DESTINATION_KEY)) ??
    DEFAULT_AUTH_DESTINATION
  );
}

export function hasPendingAuthDestination() {
  return Boolean(
    safeDestination(localStorage.getItem(AUTH_DESTINATION_KEY)) ??
      safeDestination(sessionStorage.getItem(AUTH_DESTINATION_KEY)),
  );
}

export function clearAuthDestination() {
  localStorage.removeItem(AUTH_DESTINATION_KEY);
  sessionStorage.removeItem(AUTH_DESTINATION_KEY);
}

export function completeAuthRedirect() {
  const destination = getAuthDestination();
  clearAuthDestination();
  window.location.replace(destination);
}

export async function waitForAuthenticatedUser(timeoutMs = 12_000) {
  if (!hasSupabaseBrowserConfig()) return null;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) return data.user;
    } catch {}
    await new Promise((resolve) => window.setTimeout(resolve, 200));
  }

  return null;
}
const SIGN_IN_PATH = "/auth";

/**
 * Consistent logout: clears any pending post-auth destination, ends the
 * Supabase session (locally even if the network call fails), clears cached
 * data, then hard-redirects to the sign-in page — never the homepage.
 */
export async function performSignOut(clearCache?: () => void | Promise<void>) {
  clearAuthDestination();
  localStorage.removeItem("herspace_demo_user");
  sessionStorage.removeItem("herspace_demo_user");
  try {
    await clearCache?.();
  } catch {
    /* cache teardown must never block sign-out */
  }
  if (hasSupabaseBrowserConfig()) {
    try {
      await supabase.auth.signOut();
    } catch {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        /* ignore — we still force the redirect below */
      }
    }
  }
  window.location.replace(SIGN_IN_PATH);
}
