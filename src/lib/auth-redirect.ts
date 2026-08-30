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
  if (!hasSupabaseBrowserConfig()) {
    authLog("callback.config-missing");
    return null;
  }

  const params = new URLSearchParams(
    window.location.hash ? window.location.hash.slice(1) : window.location.search,
  );
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) {
    authLog("callback.no-token-fragment", { hasCode: params.has("code") });
    return consumeOAuthCodeSession();
  }

  authLog("callback.token-fragment-found");

  const url = new URL(window.location.href);
  url.searchParams.delete("access_token");
  url.searchParams.delete("refresh_token");
  url.searchParams.delete("expires_at");
  url.searchParams.delete("expires_in");
  url.searchParams.delete("provider_token");
  url.searchParams.delete("refresh_token");
  url.searchParams.delete("state");

  window.history.replaceState(window.history.state, document.title, `${url.pathname}${url.search}`);

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) {
    authLog("callback.set-session-failed", { reason: error.message });
    throw error;
  }
  authLog("callback.set-session-complete", { hasUser: Boolean(data.user) });
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
  if (!hasSupabaseBrowserConfig()) {
    authLog("session.wait-config-missing");
    return null;
  }
  const deadline = Date.now() + timeoutMs;
  const startedAt = Date.now();

  while (Date.now() < deadline) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        authLog("session.found", { source: "session", elapsedMs: Date.now() - startedAt });
        return sessionData.session.user;
      }

      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        authLog("session.found", { source: "user", elapsedMs: Date.now() - startedAt });
        return data.user;
      }
    } catch {
      /* keep polling until Supabase finishes restoring the browser session */
    }
    await new Promise((resolve) => window.setTimeout(resolve, 200));
  }

  authLog("session.wait-timeout", { elapsedMs: Date.now() - startedAt });
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

/**
 * Guard-side session resolution.
 *
 * A protected route must never redirect to /auth while Supabase is still
 * restoring the session from storage (that is the loop users saw right after
 * Google sign-in). So:
 *  - fast path: an already-restored session resolves immediately;
 *  - handoff path: if an OAuth response is in the URL, or a post-auth
 *    destination is pending, wait up to `handoffTimeoutMs` for the session;
 *  - cold path: otherwise wait only a short grace period, then fall back to
 *    the sign-in page.
 */
export function hasOAuthResponseInUrl() {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash ?? "";
  const search = window.location.search ?? "";
  return (
    hash.includes("access_token") ||
    hash.includes("refresh_token") ||
    new URLSearchParams(search).has("code")
  );
}

export async function resolveGuardUser(options: {
  handoffTimeoutMs?: number;
  graceMs?: number;
} = {}) {
  const { handoffTimeoutMs = 10_000, graceMs = 1_500 } = options;

  if (!hasSupabaseBrowserConfig()) {
    authLog("guard.config-missing");
    return null;
  }

  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      authLog("guard.session-fast-path");
      return data.session.user;
    }
  } catch {
    /* fall through to the polling paths */
  }

  const inHandoff = hasOAuthResponseInUrl() || hasPendingAuthDestination();
  authLog("guard.session-pending", { inHandoff });

  if (inHandoff) {
    try {
      const fragmentUser = await consumeOAuthFragmentSession();
      if (fragmentUser) {
        authLog("guard.session-from-oauth-response");
        return fragmentUser;
      }
    } catch {
      /* the guard still polls below before giving up */
    }
  }

  const user = await waitForAuthenticatedUser(inHandoff ? handoffTimeoutMs : graceMs);
  if (!user) authLog("guard.session-unresolved", { inHandoff });
  return user;
}
