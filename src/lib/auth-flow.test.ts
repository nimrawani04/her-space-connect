import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * End-to-end-shaped test of the Google sign-in handoff:
 * sign-in start -> provider returns to /auth/callback -> session established
 * -> app lands on /dashboard, and never bounces back to /auth.
 */

const authState: {
  session: { user: { id: string } } | null;
  setSessionCalls: number;
} = { session: null, setSessionCalls: 0 };

vi.mock("@/integrations/supabase/config", () => ({
  hasSupabaseBrowserConfig: () => true,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: authState.session }, error: null }),
      getUser: async () => ({ data: { user: authState.session?.user ?? null }, error: null }),
      setSession: async () => {
        authState.setSessionCalls += 1;
        authState.session = { user: { id: "user-1" } };
        return { data: { user: authState.session.user, session: authState.session }, error: null };
      },
      exchangeCodeForSession: async () => {
        authState.session = { user: { id: "user-1" } };
        return { data: { user: authState.session.user, session: authState.session }, error: null };
      },
      signOut: async () => ({ error: null }),
    },
  },
}));

const {
  completeAuthRedirect,
  consumeOAuthFragmentSession,
  rememberAuthDestination,
  resolveGuardUser,
  hasPendingAuthDestination,
} = await import("./auth-redirect");

function gotoCallbackWithTokens() {
  window.history.replaceState(
    {},
    "",
    "/auth/callback#access_token=fake.access.token&refresh_token=fake-refresh&token_type=bearer",
  );
}

let replaced: string[] = [];

beforeEach(() => {
  authState.session = null;
  authState.setSessionCalls = 0;
  localStorage.clear();
  sessionStorage.clear();
  replaced = [];
  window.history.replaceState({}, "", "/auth");
  Object.defineProperty(window, "location", {
    configurable: true,
    value: new Proxy(window.location, {
      get(target, prop) {
        if (prop === "replace") return (url: string) => replaced.push(url);
        const value = Reflect.get(target, prop);
        return typeof value === "function" ? value.bind(target) : value;
      },
    }),
  });
});

describe("Google sign-in end-to-end handoff", () => {
  it("lands on /dashboard after the provider returns tokens", async () => {
    rememberAuthDestination("/dashboard");
    expect(hasPendingAuthDestination()).toBe(true);

    gotoCallbackWithTokens();

    const user = await consumeOAuthFragmentSession();
    expect(user).toEqual({ id: "user-1" });
    expect(authState.setSessionCalls).toBe(1);

    completeAuthRedirect();
    expect(replaced).toEqual(["/dashboard"]);
    expect(hasPendingAuthDestination()).toBe(false);
  });

  it("never sends the signed-in user back to the sign-in page", async () => {
    rememberAuthDestination("/dashboard");
    gotoCallbackWithTokens();
    await consumeOAuthFragmentSession();

    // The protected route guard now runs with the freshly created session.
    const guardUser = await resolveGuardUser();
    expect(guardUser).toEqual({ id: "user-1" });
    expect(replaced).not.toContain("/auth");
  });

  it("waits for the session instead of redirecting mid-handoff", async () => {
    rememberAuthDestination("/dashboard");
    window.history.replaceState({}, "", "/dashboard");

    // Session appears 400ms late, as it does right after an OAuth popup closes.
    setTimeout(() => {
      authState.session = { user: { id: "user-1" } };
    }, 400);

    const guardUser = await resolveGuardUser({ handoffTimeoutMs: 3000 });
    expect(guardUser).toEqual({ id: "user-1" });
  });

  it("falls back to no user after the grace period when there is no session", async () => {
    window.history.replaceState({}, "", "/dashboard");
    const guardUser = await resolveGuardUser({ graceMs: 300 });
    expect(guardUser).toBeNull();
  });
});
