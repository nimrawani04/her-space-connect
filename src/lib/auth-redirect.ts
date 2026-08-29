import { supabase } from "@/integrations/supabase/client";
import { hasSupabaseBrowserConfig } from "@/integrations/supabase/config";

const AUTH_DESTINATION_KEY = "herspace:post-auth-path";
const DEFAULT_AUTH_DESTINATION = "/dashboard";

/**
 * Auth flow diagnostics. Logs every decision point so we can see exactly
 * where a session is established, lost, or fails to resolve. No tokens or
 * PII are ever logged — only event names, presence booleans, and timing.
 */
export function authLog(event: string, details: Record<string, unknown> = {}) {
  try {
    console.info(`[HerSpaceAuth] ${event}`, {
      path: typeof window !== "undefined" ? window.location.pathname : "ssr",
      hasHash: typeof window !== "undefined" ? Boolean(window.location.hash) : false,
      ...details,
    });
  } catch {
    /* logging must never break auth */
  }
}

function safeDestination(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export function rememberAuthDestination(destination = DEFAULT_AUTH_DESTINATION) {
  const safe = safeDestination(destination) ?? DEFAULT_AUTH_DESTINATION;
  localStorage.setItem(AUTH_DESTINATION_KEY, safe);
  sessionStorage.setItem(AUTH_DESTINATION_KEY, safe);
  authLog("destination.remembered", { destination: safe });
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
  authLog("redirect.complete", { destination });
  window.location.replace(destination);
}

/**
 * Full-page OAuth can return credentials in the URL fragment. Fragments are
 * never sent to the server, so establish the browser session before the
 * protected route guard runs, then remove the credentials from browser
 * history immediately.
 */
export async function consumeOAuthFragmentSession() {
  if (!hasSupabaseBrowserConfig()) return null;

  const params = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return consumeOAuthCodeSession();

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

/**
 * Some OAuth providers return an authorization code in the query string
 * instead of tokens in the fragment. Exchange it before the auth guard runs.
 */
export async function consumeOAuthCodeSession() {
  if (!hasSupabaseBrowserConfig()) return null;

  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  if (!code) return null;

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;

  url.searchParams.delete("code");
  url.searchParams.delete("state");
  window.history.replaceState(
    window.history.state,
    document.title,
    `${url.pathname}${url.search}${url.hash}`,
  );

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
    } catch {
      /* keep polling until Supabase finishes restoring the browser session */
    }
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
