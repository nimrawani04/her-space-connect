// Persistent browser storage for Supabase auth.
//
// localStorage is the primary store. Every write is mirrored to a first-party
// document.cookie (1-year expiry) so the session survives localStorage being
// cleared and can be read by server-side code from the Cookie header.
// Reads prefer localStorage and fall back to the cookie.
//
// Supabase session payloads can exceed the ~4KB cookie limit, so values over
// COOKIE_LIMIT stay localStorage-only instead of risking a truncated cookie.

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const COOKIE_LIMIT = 3500;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${escapeRegExp(name)}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function cookieFlags() {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  return `Path=/; SameSite=Lax${secure}`;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${COOKIE_MAX_AGE}; ${cookieFlags()}`;
}

function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Max-Age=0; ${cookieFlags()}`;
}

type SyncOrAsync<T> = T | Promise<T>;

interface AuthStore {
  getItem: (key: string) => SyncOrAsync<string | null>;
  setItem: (key: string, value: string) => SyncOrAsync<void>;
  removeItem: (key: string) => SyncOrAsync<void>;
}

type BaseStorage = Pick<Storage, "getItem" | "setItem" | "removeItem"> | AuthStore | undefined;

export function persistentAuthStorage(base?: BaseStorage) {
  const backing: BaseStorage =
    base ?? (typeof window !== "undefined" ? window.localStorage : undefined);

  return {
    getItem: (key: string) => {
      try {
        const value = backing?.getItem(key);
        // The brokered preview adapter is async — pass promises straight through.
        if (value && typeof (value as unknown as Promise<string>).then === "function") return value;
        if (value) return value;
      } catch {
        /* fall through to cookie */
      }
      return readCookie(key);
    },
    setItem: (key: string, value: string) => {
      try {
        backing?.setItem(key, value);
      } catch {
        /* cookie mirror below still persists the session */
      }
      try {
        if (value.length <= COOKIE_LIMIT) writeCookie(key, value);
        else clearCookie(key);
      } catch {
        /* non-fatal */
      }
    },
    removeItem: (key: string) => {
      try {
        backing?.removeItem(key);
      } catch {
        /* continue */
      }
      try {
        clearCookie(key);
      } catch {
        /* non-fatal */
      }
    },
  };
}
