import { createFileRoute, Outlet, redirect, useNavigate, useRouterState, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  ShieldCheck, Plane, HeartPulse, BookOpen, LayoutDashboard, LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedShell,
});

const nav = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/health", icon: Activity, label: "Health Hub" },
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [name, setName] = useState<string>("Sister");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const n = data.user?.user_metadata?.full_name ?? data.user?.email?.split("@")[0] ?? "Sister";
      setName(String(n));
    });
  }, []);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <SidebarProvider>
      <div className="min-h-dvh flex w-full bg-background text-foreground">
        <Sidebar collapsible="icon">
          <SidebarHeader className="px-4 py-5">
            <Link to="/dashboard" className="font-serif italic text-2xl tracking-tight">HerSpace</Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Your space</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {nav.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={pathname === item.to || pathname.startsWith(item.to + "/")}>
                        <Link to={item.to} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-4">
            <Button variant="ghost" size="sm" onClick={signOut} className="justify-start gap-2 text-muted-foreground">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b border-border px-4 sticky top-0 bg-background/80 backdrop-blur z-30">
            <SidebarTrigger />
            <div className="flex-1" />
            <span className="text-xs text-muted-foreground">Welcome, <span className="font-medium text-foreground">{name}</span></span>
          </header>
          <main className="flex-1 p-6 md:p-10">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}