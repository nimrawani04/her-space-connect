import { createFileRoute, Outlet, redirect, useRouterState, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hasSupabaseBrowserConfig } from "@/integrations/supabase/config";
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
  Activity, Users, Sparkles, GraduationCap, Briefcase, ShoppingBag,
  ShieldCheck, Plane, HeartPulse, BookOpen, LayoutDashboard, LogOut, Palette, Baby,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarSignedUrl, initials } from "@/lib/avatar";
import { authLog, performSignOut, resolveGuardUser } from "@/lib/auth-redirect";

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
          authLog("guard.session-confirmed", { userId: user.id });
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
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/health", icon: Activity, label: "Health Hub" },
  { to: "/pregnancy", icon: Baby, label: "Pregnancy" },
  { to: "/community", icon: Users, label: "Safe Space" },
  { to: "/experience", icon: Sparkles, label: "Experience Match" },
  { to: "/mentorship", icon: GraduationCap, label: "Mentorship" },
  { to: "/careers", icon: Briefcase, label: "Careers" },
  { to: "/marketplace", icon: ShoppingBag, label: "Marketplace" },
  { to: "/safety", icon: ShieldCheck, label: "Safety Network" },
  { to: "/travel", icon: Plane, label: "Travel Sisterhood" },
  { to: "/wellness", icon: HeartPulse, label: "Mental Wellness" },
  { to: "/library", icon: BookOpen, label: "Library" },
] as const;

function AuthedShell() {
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
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

  const mobileTabs = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Home" },
    { to: "/health", icon: Activity, label: "Health" },
    { to: "/pregnancy", icon: Baby, label: "Care" },
    { to: "/community", icon: Users, label: "Circle" },
    { to: "/safety", icon: ShieldCheck, label: "Safety" },
  ] as const;

  return (
    <SidebarProvider>
      <div className="min-h-dvh flex w-full text-foreground bg-background relative overflow-x-hidden">
        {/* Ambient blooming floral background tinted dynamically with user's profile color */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
          <video
            className="w-full h-full object-cover scale-105 opacity-[0.45] dark:opacity-[0.38] filter contrast-110 saturate-125 transition-opacity"
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260813_115057_94c3699b-0fd1-4124-bcf3-3626bb8c1f77.mp4"
            autoPlay
            muted
            loop
            playsInline
          />
          {/* Color wash that dynamically takes the user's selected profile accent color */}
          <div
            className="absolute inset-0 mix-blend-color opacity-70 transition-colors duration-500"
            style={{ backgroundColor: "var(--primary)" }}
          />
          {/* Subtle soft scrim preserving flower visibility while framing content */}
          <div
            className="absolute inset-0 bg-gradient-to-b from-background/45 via-background/25 to-background/55 backdrop-blur-[1px] transition-colors duration-500"
          />
        </div>

        <Sidebar collapsible="icon" className="border-r border-border/70 bg-sidebar/95 backdrop-blur-md">
          <SidebarHeader className="px-5 py-6 group-data-[collapsible=icon]:px-2">
            <Link
              to="/dashboard"
              aria-label="HerSpace dashboard"
              className="relative flex items-center gap-2.5 h-9 overflow-hidden font-serif italic tracking-tight"
            >
              <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
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
                  {nav.map((item) => {
                    const isActive = pathname === item.to || pathname.startsWith(item.to + "/");
                    return (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.label}
                          className="!rounded-2xl transition-all duration-200 hover:!bg-primary/10 hover:!text-primary data-[active=true]:!bg-primary data-[active=true]:!text-primary-foreground data-[active=true]:shadow-sm data-[active=true]:shadow-primary/25 font-sans"
                        >
                          <Link to={item.to} className="flex items-center gap-3 px-3 py-2">
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
          <header className="h-16 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-4 border-b border-border/70 px-4 sm:px-6 sticky top-0 bg-background/85 backdrop-blur-md z-30">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="shrink-0 rounded-full hover:bg-secondary" />
              <Link to="/dashboard" className="flex items-center gap-2 font-serif italic text-xl sm:hidden truncate min-w-0">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                HerSpace
              </Link>
            </div>
            <div className="hidden sm:block min-w-0" />
            <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
              <Link to="/settings/appearance" className="hidden sm:inline-flex text-xs text-muted-foreground hover:text-foreground transition-colors items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-secondary/60">
                <Palette className="h-3.5 w-3.5 text-primary" /> Appearance
              </Link>
              <Link to="/settings/appearance" className="flex items-center gap-2.5 group min-w-0 max-w-[42vw] pl-1 pr-2 py-1 rounded-full hover:bg-secondary/40 transition-colors">
                <span className="text-xs text-muted-foreground hidden md:inline truncate max-w-[18ch]">
                  Welcome, <span className="font-semibold text-foreground">{name}</span>
                </span>
                <Avatar className="h-8.5 w-8.5 shrink-0 ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all shadow-xs">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">{initials(name)}</AvatarFallback>
                </Avatar>
              </Link>
              <ThemeSwitcher />
            </div>
          </header>

          {/* Main content viewport with bottom padding on mobile for floating bar */}
          <main className="flex-1 p-4 sm:p-6 md:p-10 pb-24 sm:pb-10 max-w-7xl w-full mx-auto relative z-10">
            <Outlet />
          </main>

          {/* Dedicated Mobile App Bottom Navigation Bar */}
          <nav
            aria-label="Mobile Navigation"
            className="sm:hidden fixed bottom-3 inset-x-3 z-40 bg-card/90 backdrop-blur-xl border border-primary/20 rounded-full shadow-lg shadow-primary/15 py-1.5 px-3 flex items-center justify-around"
          >
            {mobileTabs.map((tab) => {
              const active = pathname === tab.to || pathname.startsWith(tab.to + "/");
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={`flex flex-col items-center justify-center py-1 px-3 rounded-full transition-all duration-200 ${
                    active
                      ? "text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      active ? "bg-primary text-primary-foreground shadow-xs shadow-primary/30 scale-105" : ""
                    }`}
                  >
                    <tab.icon className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[10px] tracking-tight mt-0.5">{tab.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </SidebarProvider>
  );
}