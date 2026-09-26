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
    
    if (hasSupabaseBrowserConfig()) {
      try {
        authLog("guard.checking-session");
        const user = await resolveGuardUser({ handoffTimeoutMs: 15_000, graceMs: 3_000 });
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

  return (
    <SidebarProvider>
      <div className="min-h-dvh flex w-full text-foreground">
        <Sidebar collapsible="icon">
          <SidebarHeader className="px-4 py-5 group-data-[collapsible=icon]:px-2">
            <Link
              to="/dashboard"
              aria-label="HerSpace dashboard"
              className="relative block h-8 overflow-hidden font-serif italic tracking-tight"
            >
              <span className="absolute inset-0 flex items-center whitespace-nowrap text-2xl leading-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] opacity-100 translate-x-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:-translate-x-2">
                HerSpace
              </span>
              <span className="absolute inset-0 flex items-center justify-center whitespace-nowrap text-lg leading-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] opacity-0 translate-x-2 scale-95 group-data-[collapsible=icon]:opacity-100 group-data-[collapsible=icon]:translate-x-0 group-data-[collapsible=icon]:scale-100 group-data-[collapsible=icon]:delay-100">
                HS
              </span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="font-manrope text-[11px] uppercase tracking-[0.2em]">
                Your space
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {nav.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.to || pathname.startsWith(item.to + "/")}
                        tooltip={item.label}
                        className="!rounded-full transition-all duration-300 hover:!bg-[#AFDDFF]/10 data-[active=true]:!bg-[#AFDDFF] data-[active=true]:!text-black data-[active=true]:font-medium"
                      >
                        <Link to={item.to} className="flex items-center gap-2.5">
                          <item.icon className="h-4 w-4 shrink-0 transition-transform duration-300" />
                          <span className="font-manrope text-[13px] tracking-wide">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="justify-start gap-2 font-manrope text-xs text-muted-foreground !rounded-full transition-all duration-300 hover:!bg-[#AFDDFF]/10 hover:!text-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
            >
              <LogOut className="h-4 w-4" /> <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
            </Button>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-3 border-b border-border px-3 sm:px-4 sticky top-0 bg-background/80 backdrop-blur z-30">
            <SidebarTrigger className="shrink-0" />
            <Link to="/dashboard" className="font-serif italic text-lg sm:hidden truncate min-w-0">
              HerSpace
            </Link>
            <div className="hidden sm:block min-w-0" />
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <Link to="/settings/appearance" className="hidden sm:inline-flex text-xs text-muted-foreground hover:text-foreground transition-colors items-center gap-1.5">
                <Palette className="h-3.5 w-3.5" /> Appearance
              </Link>
              <Link to="/settings/appearance" className="flex items-center gap-2 group min-w-0 max-w-[40vw]">
                <span className="text-xs text-muted-foreground hidden md:inline truncate max-w-[18ch]">
                  Welcome, <span className="font-medium text-foreground">{name}</span>
                </span>
                <Avatar className="h-8 w-8 shrink-0 ring-1 ring-border group-hover:ring-primary transition-all">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
                  <AvatarFallback className="bg-sand text-earth text-xs">{initials(name)}</AvatarFallback>
                </Avatar>
              </Link>
              <ThemeSwitcher />
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 md:p-10">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}