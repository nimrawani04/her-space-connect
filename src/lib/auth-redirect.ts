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
  
  // Extra safety: ensure we're going to dashboard
  if (!destination || destination === "/auth" || destination === "/") {
    console.warn("[HerSpaceAuth] Invalid destination, forcing /dashboard", { destination });
    window.location.replace("/dashboard");
    return;
  }
  
  window.location.replace(destination);
}

/**
 * Full-page OAuth can return credentials in the URL fragment. Fragments are
 * never sent to the server, so establish the browser session before the
 * protected route guard runs, then remove the credentials from browser
 * history immediately.
 */
let fragmentConsumePromise: Promise<unknown | null> | null = null;

function decodeJwtMeta(token: string): { kid?: string; iss?: string } {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return {};
    const header = JSON.parse(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")));
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return { kid: header?.kid, iss: payload?.iss };
  } catch {
    return {};
  }
}

function clearOAuthParamsFromUrl() {
  const url = new URL(window.location.href);
  for (const k of [
    "access_token",
    "refresh_token",
    "expires_at",
    "expires_in",
    "provider_token",
    "token_type",
    "type",
    "state",
    "code",
  ]) {
    url.searchParams.delete(k);
  }
  // Drop the hash entirely — OAuth tokens live there and must not linger in history.
  window.history.replaceState(window.history.state, document.title, `${url.pathname}${url.search}`);
}

export function consumeOAuthFragmentSession() {
  if (fragmentConsumePromise) return fragmentConsumePromise;
  fragmentConsumePromise = consumeOAuthFragmentSessionInner().finally(() => {
    fragmentConsumePromise = null;
  });
  return fragmentConsumePromise;
}

async function consumeOAuthFragmentSessionInner() {
  if (!hasSupabaseBrowserConfig()) {
    authLog("callback.config-missing");
    return null;
  }

  const hashStr = window.location.hash ? window.location.hash.replace(/^#/, "") : "";
  const searchStr = window.location.search ? window.location.search.replace(/^\?/, "") : "";
  const hashParams = new URLSearchParams(hashStr);
  const searchParams = new URLSearchParams(searchStr);

  const accessToken = hashParams.get("access_token") || searchParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token") || searchParams.get("refresh_token");

  if (!accessToken || !refreshToken) {
    const hasCode = searchParams.has("code") || hashParams.has("code");
    authLog("callback.no-token-fragment", { hasCode });
    if (hasCode) {
      return consumeOAuthCodeSession();
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        return sessionData.session.user;
      }
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        return userData.user;
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  authLog("callback.token-fragment-found");

  try {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      const meta = decodeJwtMeta(accessToken);
      authLog("callback.set-session-failed", {
        reason: error.message,
        tokenIss: meta.iss,
        tokenKid: meta.kid,
      });
      const currentSession = await supabase.auth.getSession();
      if (currentSession.data.session?.user) {
        clearOAuthParamsFromUrl();
        return currentSession.data.session.user;
      }
      const currentUser = await supabase.auth.getUser();
      if (currentUser.data?.user) {
        clearOAuthParamsFromUrl();
        return currentUser.data.user;
      }
      // Keep the URL fragment intact so a retry / correct-project client can still use it.
      throw error;
    }
    authLog("callback.set-session-complete", { hasUser: Boolean(data.user) });
    clearOAuthParamsFromUrl();
    return data.user;
  } catch (err) {
    const currentSession = await supabase.auth.getSession();
    if (currentSession.data.session?.user) {
      return currentSession.data.session.user;
    }
    const currentUser = await supabase.auth.getUser();
    if (currentUser.data?.user) {
      return currentUser.data.user;
    }
    throw err;
  }
}

/**
 * Some OAuth providers return an authorization code in the query string
 * instead of tokens in the fragment. Exchange it before the auth guard runs.
 */
let codeConsumePromise: Promise<unknown | null> | null = null;

export function consumeOAuthCodeSession() {
  if (codeConsumePromise) return codeConsumePromise;
  codeConsumePromise = consumeOAuthCodeSessionInner().finally(() => {
    codeConsumePromise = null;
  });
  return codeConsumePromise;
}

async function consumeOAuthCodeSessionInner() {
  if (!hasSupabaseBrowserConfig()) return null;

  // Check if session was already established automatically by Supabase client
  try {
    const { data: existing } = await supabase.auth.getSession();
    if (existing.session?.user) {
      authLog("consume-code.already-active-session");
      return existing.session.user;
    }
  } catch {
    /* continue to manual exchange */
  }

  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
  const code = url.searchParams.get("code") || hashParams.get("code");
  if (!code) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) return sessionData.session.user;
      const { data: userData } = await supabase.auth.getUser();
      return userData?.user ?? null;
    } catch {
      return null;
    }
  }

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    // Clean up code from url
    url.searchParams.delete("code");
    url.searchParams.delete("state");
    window.history.replaceState(
      window.history.state,
      document.title,
      `${url.pathname}${url.search}`,
    );

    if (error) {
      authLog("callback.exchange-code-error", { reason: error.message });
      const currentSession = await supabase.auth.getSession();
      if (currentSession.data.session?.user) {
        authLog("callback.session-recovered-after-code-error");
        return currentSession.data.session.user;
      }
      const currentUser = await supabase.auth.getUser();
      if (currentUser.data?.user) {
        authLog("callback.user-recovered-after-code-error");
        return currentUser.data.user;
      }
      const delayedUser = await waitForAuthenticatedUser(4_000);
      if (delayedUser) {
        authLog("callback.user-recovered-after-delay");
        return delayedUser;
      }
      return null;
    }

    return data.user;
  } catch (err) {
    authLog("callback.exchange-code-exception", {
      reason: err instanceof Error ? err.message : "unknown",
    });
    const currentSession = await supabase.auth.getSession();
    if (currentSession.data.session?.user) {
      return currentSession.data.session.user;
    }
    const currentUser = await supabase.auth.getUser();
    if (currentUser.data?.user) {
      return currentUser.data.user;
    }
    const delayedUser = await waitForAuthenticatedUser(4_000);
    if (delayedUser) {
      return delayedUser;
    }
    return null;
  }
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
  const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(search);

  return (
    hash.includes("access_token") ||
    hash.includes("refresh_token") ||
    searchParams.has("code") ||
    hashParams.has("code") ||
    searchParams.has("error") ||
    hashParams.has("error") ||
    searchParams.has("error_description") ||
    hashParams.has("error_description")
  );
}

export async function resolveGuardUser(options: {
  handoffTimeoutMs?: number;
  graceMs?: number;
} = {}) {
  const { handoffTimeoutMs = 15_000, graceMs = 2_500 } = options;

  if (!hasSupabaseBrowserConfig()) {
    authLog("guard.config-missing");
    return null;
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) {
      authLog("guard.session-fast-path");
      clearAuthDestination();
      return sessionData.session.user;
    }
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      authLog("guard.user-fast-path");
      clearAuthDestination();
      return userData.user;
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
        clearAuthDestination();
        return fragmentUser;
      }
    } catch {
      /* the guard still polls below before giving up */
    }
  }

  const user = await waitForAuthenticatedUser(inHandoff ? handoffTimeoutMs : graceMs);
  if (user) {
    clearAuthDestination();
  } else {
    authLog("guard.session-unresolved", { inHandoff });
  }
  return user;
}

