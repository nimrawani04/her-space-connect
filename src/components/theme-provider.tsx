import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hasSupabaseBrowserConfig } from "@/integrations/supabase/config";

type Mode = "light" | "dark" | "system";
export type Background = "plain" | "warm" | "sage" | "dusk" | "grain" | "gradient";
type ThemeCtx = {
  mode: Mode;
  setMode: (m: Mode) => void;
  accent: string; // hex
  setAccent: (hex: string) => void;
  resetAccent: () => void;
  background: Background;
  setBackground: (b: Background) => void;
};

const DEFAULT_ACCENT = "#c2410c"; // earth / burnt orange
const DEFAULT_BG: Background = "plain";
const ThemeContext = createContext<ThemeCtx | null>(null);

function applyMode(mode: Mode) {
  if (typeof document === "undefined") return;
  const isDark =
    mode === "dark" ||
    (mode === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

function hexToOklch(hex: string): string | null {
  const m = /^#?([a-f\d]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const rs = ((n >> 16) & 255) / 255;
  const gs = ((n >> 8) & 255) / 255;
  const bs = (n & 255) / 255;
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const r = lin(rs), g = lin(gs), b = lin(bs);
  // sRGB -> OKLab
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m_ - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m_ + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m_ - 0.808675766 * s;
  const C = Math.sqrt(a * a + bb * bb);
  let h = (Math.atan2(bb, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${h.toFixed(1)})`;
}

function applyAccent(hex: string) {
  if (typeof document === "undefined") return;
  const ok = hexToOklch(hex);
  if (!ok) return;
  const root = document.documentElement.style;
  root.setProperty("--primary", ok);
  root.setProperty("--ring", ok);
  root.setProperty("--earth", ok);
  root.setProperty("--sidebar-primary", ok);
  root.setProperty("--sidebar-ring", ok);
  root.setProperty("--chart-1", ok);
}

function clearAccent() {
  if (typeof document === "undefined") return;
  const root = document.documentElement.style;
  ["--primary", "--ring", "--earth", "--sidebar-primary", "--sidebar-ring", "--chart-1"].forEach((p) =>
    root.removeProperty(p),
  );
}

const BG_CLASSES = ["bg-plain", "bg-warm", "bg-sage", "bg-dusk", "bg-grain", "bg-gradient"];
function applyBackground(bg: Background) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  BG_CLASSES.forEach((c) => el.classList.remove(c));
  el.classList.add(`bg-${bg}`);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>("light");
  const [accent, setAccentState] = useState<string>(DEFAULT_ACCENT);
  const [background, setBackgroundState] = useState<Background>(DEFAULT_BG);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const m = (localStorage.getItem("hs-theme-mode") as Mode | null) ?? "light";
    const a = localStorage.getItem("hs-theme-accent") ?? DEFAULT_ACCENT;
    const b = (localStorage.getItem("hs-theme-bg") as Background | null) ?? DEFAULT_BG;
    setModeState(m);
    setAccentState(a);
    setBackgroundState(b);
    applyMode(m);
    if (a !== DEFAULT_ACCENT) applyAccent(a);
    applyBackground(b);
  }, []);

  // Sync with the signed-in user's profile so theme follows across devices.
  useEffect(() => {
    if (!hasSupabaseBrowserConfig()) return;
    let cancelled = false;

    async function loadFromProfile(uid: string) {
      const { data } = await supabase
        .from("profile_settings")
        .select("theme_mode, accent_color, background_style")
        .eq("user_id", uid)
        .maybeSingle();
      if (cancelled || !data) return;
      const remoteMode = (data.theme_mode as Mode | null) ?? null;
      const remoteAccent = data.accent_color ?? null;
      const remoteBg = (data.background_style as Background | null) ?? null;
      if (remoteMode) {
        setModeState(remoteMode);
        localStorage.setItem("hs-theme-mode", remoteMode);
        applyMode(remoteMode);
      }
      if (remoteAccent) {
        setAccentState(remoteAccent);
        localStorage.setItem("hs-theme-accent", remoteAccent);
        applyAccent(remoteAccent);
      } else {
        clearAccent();
      }
      if (remoteBg) {
        setBackgroundState(remoteBg);
        localStorage.setItem("hs-theme-bg", remoteBg);
        applyBackground(remoteBg);
      }
    }

    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null;
      if (cancelled) return;
      setUserId(uid);
      if (uid) loadFromProfile(uid);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (event === "SIGNED_IN" && uid) loadFromProfile(uid);
    });

    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  async function persist(patch: { theme_mode?: Mode; accent_color?: string | null; background_style?: Background }) {
    if (!userId || !hasSupabaseBrowserConfig()) return;
    await supabase.from("profile_settings").upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
  }

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyMode("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  const setMode = (m: Mode) => {
    setModeState(m);
    localStorage.setItem("hs-theme-mode", m);
    applyMode(m);
    void persist({ theme_mode: m });
  };
  const setAccent = (hex: string) => {
    setAccentState(hex);
    localStorage.setItem("hs-theme-accent", hex);
    applyAccent(hex);
    void persist({ accent_color: hex });
  };
  const resetAccent = () => {
    setAccentState(DEFAULT_ACCENT);
    localStorage.setItem("hs-theme-accent", DEFAULT_ACCENT);
    clearAccent();
    void persist({ accent_color: null });
  };
  const setBackground = (b: Background) => {
    setBackgroundState(b);
    localStorage.setItem("hs-theme-bg", b);
    applyBackground(b);
    void persist({ background_style: b });
  };

  return (
    <ThemeContext.Provider value={{ mode, setMode, accent, setAccent, resetAccent, background, setBackground }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

export const ACCENT_PRESETS: { name: string; hex: string }[] = [
  { name: "Earth", hex: "#c2410c" },
  { name: "Rose", hex: "#be3a5b" },
  { name: "Plum", hex: "#7c3aed" },
  { name: "Sage", hex: "#5a7a5f" },
  { name: "Ocean", hex: "#0e7490" },
  { name: "Indigo", hex: "#4f46e5" },
  { name: "Gold", hex: "#a16207" },
  { name: "Ink", hex: "#374151" },
];