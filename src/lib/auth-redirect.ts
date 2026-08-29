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

/**
 * Full-page OAuth can return credentials in the URL fragment. Fragments are
 * never sent to the server, so establish the browser session before the
 * protected route guard runs, then remove the credentials from browser
 * history immediately.
 */
export async function consumeOAuthFragmentSession() {
  if (!hasSupabaseBrowserConfig() || !window.location.hash) return null;

  const params = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return null;

  window.history.replaceState(
    window.history.state,
    document.title,
    `${window.location.pathname}${window.location.search}`,
  );

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw error;
  return data.user;
}

export async function waitForAuthenticatedUser(timeoutMs = 12_000) {
  if (!hasSupabaseBrowserConfig()) return null;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) return sessionData.session.user;

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
