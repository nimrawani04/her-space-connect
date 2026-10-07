import { createFileRoute, Outlet, redirect, useRouterState, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hasSupabaseBrowserConfig } from "@/integrations/supabase/config";
import { usePregnancyProfile } from "@/hooks/use-pregnancy-profile";
import { useLifeStagePreferences } from "@/hooks/use-life-stage-preferences";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Activity, Users, Sparkles, GraduationCap, Briefcase,
  ShieldCheck, HeartPulse, BookOpen, LayoutDashboard, LogOut, Palette, Baby,
  MessageSquareHeart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useTheme } from "@/components/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarSignedUrl, initials } from "@/lib/avatar";
import { authLog, performSignOut, resolveGuardUser } from "@/lib/auth-redirect";
import { HerSpaceLogo } from "@/components/brand/HerSpaceLogo";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    authLog("guard.started", { path: typeof window !== "undefined" ? window.location.pathname : "ssr" });
    
    // 1. Instant fast-path: Check demo user in localStorage
    if (typeof window !== "undefined") {
      const demoUserStr = localStorage.getItem("herspace_demo_user");
      if (demoUserStr) {
        try {
          const demoUser = JSON.parse(demoUserStr);
          authLog("guard.demo-user-allowed");
          return {
            user: {
              id: "demo-user-id",
              email: demoUser.email || "demo@herspace.app",
              user_metadata: { full_name: demoUser.name || "Sister" },
            },
          };
        } catch {}
      }
    }

    // 2. Fast-path: Check existing Supabase session immediately
    if (hasSupabaseBrowserConfig()) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          authLog("guard.session-fast-confirmed", { userId: data.session.user.id });
          return { user: data.session.user };
        }
      } catch {}

      // 3. Fallback: Wait for session resolution (for OAuth redirects / login handoff)
      try {
        authLog("guard.checking-session");
        const user = await resolveGuardUser({ handoffTimeoutMs: 10_000, graceMs: 1_500 });
        if (user) {
          authLog("guard.session-confirmed", { userId: (user as any).id });
          return { user };
        }
        authLog("guard.no-user-from-resolve");
      } catch (error) {
        authLog("guard.session-check-failed", { 
          reason: error instanceof Error ? error.message : "unknown" 
        });
      }
    }

    authLog("guard.redirect-to-auth", { 
      reason: "no-session-found",
      path: typeof window !== "undefined" ? window.location.pathname : "ssr"
    });
    throw redirect({ to: "/auth" });
  },
  component: AuthedShell,
});

const nav = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", key: "dashboard" },
  { to: "/health", icon: Activity, label: "Health Hub", key: "health" },
  { to: "/pregnancy", icon: Baby, label: "Pregnancy", key: "pregnancy" },
  { to: "/community", icon: Users, label: "Safe Space", key: "community" },
  { to: "/experience", icon: Sparkles, label: "Experience Match", key: "experience" },
  { to: "/mentorship", icon: GraduationCap, label: "Mentorship", key: "mentorship" },
  { to: "/careers", icon: Briefcase, label: "Careers", key: "careers" },
  { to: "/safety", icon: ShieldCheck, label: "Safety Network", key: "safety" },
  { to: "/wellness", icon: HeartPulse, label: "Mental Wellness", key: "wellness" },
  { to: "/library", icon: BookOpen, label: "Library", key: "library" },
] as const;

function LiquidGlassIcon({
  icon: Icon,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  const [glint, setGlint] = useState({ x: 50, y: 25 });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.max(10, Math.min(90, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(10, Math.min(90, ((e.clientY - rect.top) / rect.height) * 100));
    setGlint({ x, y });
  };

  const handlePointerLeave = () => {
    setGlint({ x: 50, y: 25 });
  };

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`relative w-10 h-10 min-[380px]:w-11 min-[380px]:h-11 rounded-[14px] min-[380px]:rounded-[16px] flex items-center justify-center transition-all duration-300 select-none overflow-hidden group-active:scale-90 ${
        active ? "scale-105" : "hover:scale-105"
      }`}
      style={{
        backdropFilter: "blur(20px) saturate(190%)",
        WebkitBackdropFilter: "blur(20px) saturate(190%)",
      }}
    >
      {/* 1. Liquid Glass Refractive Base Body with physical thickness */}
      <div
        className={`absolute inset-0 rounded-[16px] transition-colors duration-300 ${
          active
            ? "bg-gradient-to-b from-primary/35 via-primary/20 to-primary/10 dark:from-primary/45 dark:via-primary/25 dark:to-primary/15 border border-primary/60 dark:border-primary/50 shadow-[0_8px_20px_-4px_rgba(var(--primary),0.4),inset_0_1.5px_2px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.12)]"
            : "bg-gradient-to-b from-white/55 via-white/28 to-white/12 dark:from-white/16 dark:via-white/8 dark:to-white/4 border border-white/70 dark:border-white/15 shadow-[0_6px_16px_-4px_rgba(0,0,0,0.08),inset_0_1.5px_2px_rgba(255,255,255,0.85),inset_0_-2px_4px_rgba(0,0,0,0.06)]"
        }`}
      />

      {/* 2. Curved Specular Dome Meniscus (Apple / Clay Harmon Liquid Glass Refraction) */}
      <div
        className="absolute inset-x-1 top-0.5 h-[46%] rounded-t-[14px] rounded-b-[45%] pointer-events-none transition-opacity duration-300"
        style={{
          background:
            "linear-gradient(180deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.25) 60%, rgba(255, 255, 255, 0) 100%)",
          boxShadow: "inset 0 1px 1px 0 rgba(255, 255, 255, 0.95)",
        }}
      />

      {/* 3. Dynamic Specular Bearing Glint (Pointer bearing / touch responsive reflection) */}
      <div
        className="absolute inset-0 pointer-events-none rounded-[16px] transition-transform duration-75 ease-out"
        style={{
          background: `radial-gradient(circle 32px at ${glint.x}% ${glint.y}%, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.25) 45%, transparent 75%)`,
          mixBlendMode: "overlay",
        }}
      />

      {/* 4. Bottom Caustic Bounce Glow (Internal crystal bounce) */}
      <div
        className="absolute inset-x-2 bottom-0.5 h-2.5 rounded-b-[12px] rounded-t-[50%] pointer-events-none opacity-70"
        style={{
          background: active
            ? "radial-gradient(ellipse at 50% 100%, rgba(255, 255, 255, 0.9) 0%, transparent 70%)"
            : "radial-gradient(ellipse at 50% 100%, rgba(255, 255, 255, 0.6) 0%, transparent 70%)",
        }}
      />

      {/* 5. Chromatic Dispersion Rim (Micro prism rainbow caustics) */}
      <div
        className="absolute inset-0 rounded-[16px] pointer-events-none opacity-40 dark:opacity-20"
        style={{
          boxShadow:
            "inset 1px 0 1px rgba(56, 189, 248, 0.45), inset -1px 0 1px rgba(244, 114, 182, 0.45)",
        }}
      />

      {/* 6. Refracted Icon Glyph with light refraction depth */}
      <div className="relative z-10 flex items-center justify-center">
        <Icon
          className={`h-5 w-5 transition-all duration-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.12)] ${
            active
              ? "text-primary stroke-[2.3] scale-110 drop-shadow-[0_2px_10px_rgba(var(--primary),0.6)]"
              : "text-foreground/80 stroke-[1.85] group-hover:text-foreground"
          }`}
        />
      </div>

      {/* 7. Active Liquid Dew Pearl Indicator */}
      {active && (
        <span className="absolute -bottom-0.5 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_currentColor] animate-pulse" />
      )}
    </div>
  );
}

function AuthedShell() {
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const currentSearch = useRouterState({ select: (s) => (s.location.search as Record<string, any>) || {} });
  const [name, setName] = useState<string>("Sister");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (hasSupabaseBrowserConfig()) {
        try {
          const { data: u } = await supabase.auth.getUser();
          if (u?.user) {
            const { data: p } = await supabase
              .from("profiles")
              .select("display_name, avatar_url")
              .eq("id", u.user.id)
              .maybeSingle();
            if (cancelled) return;
            const n = p?.display_name ?? u.user.user_metadata?.full_name ?? u.user.email?.split("@")[0] ?? "Sister";
            setName(String(n));
            setAvatarUrl(await getAvatarSignedUrl(p?.avatar_url));
            return;
          }
        } catch {}
      }
      const demoUserStr = typeof window !== "undefined" ? localStorage.getItem("herspace_demo_user") : null;
      if (demoUserStr) {
        try {
          const demoUser = JSON.parse(demoUserStr);
          if (!cancelled) setName(demoUser.name || "Sister");
        } catch {}
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function signOut() {
    await performSignOut(async () => {
      await queryClient.cancelQueries();
      queryClient.clear();
    });
  }

  const { preferences: lifeStages } = useLifeStagePreferences();
  const { profile: pregnancyProfile } = usePregnancyProfile();
  const isPregnant = pregnancyProfile?.stage === "pregnant" || lifeStages.pregnancy;
  const { accent } = useTheme();

  const visibleNav = useMemo(() => {
    return nav.filter((item) => {
      if (item.key === "pregnancy" && !lifeStages.pregnancy) return false;
      return true;
    });
  }, [lifeStages.pregnancy]);

  const mobileTabs = useMemo(() => [
    { to: "/dashboard", icon: LayoutDashboard, label: "Home" },
    { to: "/health", icon: Activity, label: "Health" },
    lifeStages.pregnancy
      ? { to: "/pregnancy", icon: Baby, label: "Pregnancy" }
      : { to: "/wellness", icon: HeartPulse, label: "Wellness" },
    { to: "/library", icon: BookOpen, label: "Library" },
  ], [lifeStages.pregnancy]);

  return (
    <SidebarProvider>
      <div className="min-h-dvh flex w-full text-foreground bg-[#12080c] relative overflow-x-hidden">
        {/* Full-screen ambient blooming floral/jellyfish background from top to bottom */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
          <video
            className="absolute inset-0 !w-full !h-full !max-w-none !max-h-none object-cover scale-105 opacity-[0.75] dark:opacity-[0.65] filter contrast-[1.15] brightness-[1.05] transition-opacity"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              maxWidth: "none",
              maxHeight: "none",
              objectFit: "cover",
            }}
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260813_115057_94c3699b-0fd1-4124-bcf3-3626bb8c1f77.mp4"
            autoPlay
            muted
            loop
            playsInline
          />
          {/* Color blend: infuses user's exact chosen accent color directly into all jellyfish petals */}
          <div
            className="absolute inset-0 mix-blend-color opacity-90 transition-colors duration-700 pointer-events-none"
            style={{ backgroundColor: accent }}
          />
          {/* Screen blend: glowing radiant highlights across the bloom */}
          <div
            className="absolute inset-0 mix-blend-screen opacity-80 transition-all duration-700 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 55% 45%, ${accent}cc 0%, ${accent}55 40%, transparent 75%)`,
            }}
          />
          {/* Warm deep botanical vignette to preserve contrast and warm background from top to bottom */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#14080e]/75 via-[#14080e]/35 to-[#12080c]/85 pointer-events-none transition-colors duration-500" />
          <div
            className="hidden sm:block absolute -top-32 -left-32 w-[30rem] h-[30rem] rounded-full blur-[130px] pointer-events-none transition-colors duration-700"
            style={{ backgroundColor: `${accent}25` }}
          />
          <div
            className="hidden sm:block absolute top-1/3 -right-32 w-[32rem] h-[32rem] rounded-full blur-[150px] pointer-events-none transition-colors duration-700"
            style={{ backgroundColor: `${accent}30` }}
          />
        </div>

        <Sidebar collapsible="icon" className="border-r border-border/70 bg-sidebar/95 backdrop-blur-md">
          <SidebarHeader className="px-5 py-6 group-data-[collapsible=icon]:px-2">
            <Link
              to="/dashboard"
              aria-label="HerSpace dashboard"
              className="relative flex items-center gap-2.5 h-9 overflow-hidden font-serif italic tracking-tight"
            >
              <HerSpaceLogo size={32} className="shadow-xs shadow-primary/20 shrink-0" />
              <span className="whitespace-nowrap text-2xl font-serif leading-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] opacity-100 translate-x-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:-translate-x-2 text-foreground">
                HerSpace
              </span>
            </Link>
          </SidebarHeader>
          <SidebarContent className="px-2">
            <SidebarGroup>
              <SidebarGroupLabel className="font-sans text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80 font-semibold px-3 mb-1">
                Sanctuary
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {visibleNav.map((item) => {
                    const isActive = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to + "/"));
                    return (
                      <SidebarMenuItem key={item.key}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.label}
                          className="!rounded-2xl transition-all duration-200 hover:!bg-primary/10 hover:!text-primary data-[active=true]:!bg-primary data-[active=true]:!text-primary-foreground data-[active=true]:shadow-sm data-[active=true]:shadow-primary/25 font-sans"
                        >
                          <Link
                            to={item.to}
                            search={"search" in item ? (item as any).search : undefined}
                            className="flex items-center gap-3 px-3 py-2"
                          >
                            <item.icon className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isActive ? "scale-105" : "text-muted-foreground"}`} />
                            <span className="text-[13px] font-medium tracking-wide">{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-border/60 mt-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="w-full justify-start gap-2.5 font-sans text-xs text-muted-foreground !rounded-full transition-all duration-200 hover:!bg-destructive/10 hover:!text-destructive group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
            >
              <LogOut className="h-4 w-4 shrink-0" /> <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center justify-between gap-2 border-b border-border/70 px-3 sm:px-6 sticky top-0 bg-background/85 backdrop-blur-md z-30 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink">
              <SidebarTrigger className="shrink-0 rounded-full hover:bg-secondary" />
              <Link to="/dashboard" className="flex items-center gap-1.5 font-serif italic text-lg sm:text-xl sm:hidden truncate min-w-0">
                <HerSpaceLogo size={24} className="shrink-0" />
                <span className="truncate hidden min-[360px]:inline">HerSpace</span>
              </Link>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3.5 shrink-0">
              <Link to="/settings/appearance" className="hidden sm:inline-flex text-xs text-muted-foreground hover:text-foreground transition-colors items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-secondary/60">
                <Palette className="h-3.5 w-3.5 text-primary" /> Appearance
              </Link>
              <Link to="/settings/appearance" className="flex items-center gap-2 group min-w-0 pl-1 pr-1.5 py-1 rounded-full hover:bg-secondary/40 transition-colors">
                <span className="text-xs text-muted-foreground hidden md:inline truncate max-w-[18ch]">
                  Welcome, <span className="font-semibold text-foreground">{name}</span>
                </span>
                <Avatar className="h-8 w-8 shrink-0 ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all shadow-xs">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">{initials(name)}</AvatarFallback>
                </Avatar>
              </Link>
              <ThemeSwitcher />
            </div>
          </header>

          {/* Main content viewport with bottom padding on mobile for floating bar */}
          <main
            className="flex-1 p-3 sm:p-6 md:p-10 pb-36 sm:pb-10 max-w-7xl w-full mx-auto relative z-10 min-w-0 overflow-x-hidden"
            style={{ paddingBottom: "max(9rem, calc(7rem + env(safe-area-inset-bottom, 0px)))" }}
          >
            <Outlet />
          </main>

          {/* Liquid Glass Mobile Island Navigation Bar (WebGL Liquid Glass Aesthetic) */}
          <nav
            aria-label="Mobile Navigation"
            className="sm:hidden fixed inset-x-3 z-40 bg-white/75 dark:bg-card/70 backdrop-blur-3xl border border-white/70 dark:border-white/15 rounded-full shadow-[0_16px_48px_rgba(0,0,0,0.16),inset_0_1.5px_2px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.06)] py-1.5 px-2 flex items-center justify-around max-w-sm mx-auto"
            style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom, 0.75rem))" }}
          >
            {mobileTabs.map((tab) => {
              const active = pathname === tab.to || pathname.startsWith(tab.to + "/");
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className="flex flex-col items-center justify-center py-0.5 px-1 group transition-all duration-200 active:scale-95"
                >
                  <LiquidGlassIcon icon={tab.icon} active={active} />
                  <span
                    className={`text-[9.5px] tracking-tight mt-1 transition-colors text-center whitespace-nowrap ${
                      active ? "text-primary font-bold" : "text-muted-foreground font-medium"
                    }`}
                  >
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </SidebarProvider>
  );
}