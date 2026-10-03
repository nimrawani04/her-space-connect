import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Menu, X, ShieldCheck, Sparkles, Heart, Activity, Users, ArrowRight } from "lucide-react";
import { HerSpaceLogo } from "@/components/brand/HerSpaceLogo";
import { hasSupabaseBrowserConfig } from "@/integrations/supabase/config";
import {
  authLog,
  clearAuthDestination,
  consumeOAuthFragmentSession,
  hasOAuthResponseInUrl,
  waitForAuthenticatedUser,
} from "@/lib/auth-redirect";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HerSpace · Sanctuary for Women's Health & Sisterhood" },
      {
        name: "description",
        content:
          "HerSpace is a private, women-only sanctuary — AI health intelligence, verified safety network, sisterhood, mentorship and growth in one trusted space.",
      },
      { property: "og:title", content: "HerSpace · A Sanctuary for Women" },
      {
        property: "og:description",
        content: "A quiet, sunlit room for your body, mind, and sisterhood.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://her-space-connect.vercel.app/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://her-space-connect.vercel.app/" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..700;1,400..700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  component: LandingPage,
});

const PILLARS = [
  {
    icon: Activity,
    tag: "Cycle & Body",
    title: "Hormonal & Cycle Intelligence",
    desc: "Private AI translating symptoms, cycle phases, and fertility changes into calm, compassionate clarity.",
  },
  {
    icon: ShieldCheck,
    tag: "Protection",
    title: "Verified Safety Sisterhood",
    desc: "A verified network of safe places, trusted emergency beacons, and discreet walking companions.",
  },
  {
    icon: Users,
    tag: "Safe Space",
    title: "Unconditional Sisterhood",
    desc: "Anonymous discussions, genuine questions, and heartfelt support from women who understand your journey.",
  },
  {
    icon: Sparkles,
    tag: "Growth",
    title: "Mentorship & Elevation",
    desc: "Verified women leaders opening doors in careers, creative work, wellness, and personal empowerment.",
  },
];

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    if (hasSupabaseBrowserConfig()) {
      (async () => {
        let user = null;
        if (hasOAuthResponseInUrl()) {
          try {
            user = await consumeOAuthFragmentSession();
            authLog("home-page.oauth-fragment-consumed", { hasUser: Boolean(user) });
          } catch (error) {
            authLog("home-page.oauth-error", {
              reason: error instanceof Error ? error.message : "unknown",
            });
          }
        }
        if (!user) {
          try {
            user = await waitForAuthenticatedUser(3_000);
            authLog("home-page.wait-completed", { hasUser: Boolean(user) });
          } catch {}
        }
        if (!cancelled && user) {
          authLog("home-page.forcing-dashboard");
          clearAuthDestination();
          window.location.replace("/dashboard");
        }
      })();
    } else {
      const demoUser = typeof window !== "undefined" ? localStorage.getItem("herspace_demo_user") : null;
      if (demoUser) {
        authLog("home-page.demo-user-redirect");
        navigate({ to: "/dashboard" });
      }
    }
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="relative min-h-screen w-full bg-[#181214] text-[#fbf6f5] font-sans overflow-x-hidden selection:bg-[#c86d74]/40 selection:text-white">
      {/* Background cinematic video with warm ethereal gradient veil */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <video
          className="w-full h-full object-cover opacity-35 scale-105 filter blur-[0.5px]"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260813_115057_94c3699b-0fd1-4124-bcf3-3626bb8c1f77.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        {/* Soft botanical warm glow overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#181214]/80 via-[#24151a]/60 to-[#181214] backdrop-blur-[1px]" />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#c86d74]/15 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 w-[30rem] h-[30rem] rounded-full bg-[#e8998d]/15 blur-[140px]" />
        <div className="absolute -bottom-32 left-1/4 w-[36rem] h-[36rem] rounded-full bg-[#7e9a86]/10 blur-[150px]" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navigation */}
        <header className="w-full px-5 sm:px-8 md:px-12 py-6 flex items-center justify-between border-b border-white/[0.07] backdrop-blur-md sticky top-0 z-40 bg-[#181214]/60">
          <div className="flex items-center gap-3">
            <HerSpaceLogo size={36} className="shadow-md shadow-rose-950/40" />
            <span className="font-serif italic text-2xl tracking-tight text-white font-normal">
              HerSpace
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 ml-2 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#c86d74]/20 border border-[#c86d74]/30 text-rose-200">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c86d74] animate-pulse" />
              Women Only
            </span>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm text-stone-300">
            <button
              onClick={() => navigate({ to: "/auth" })}
              className="hover:text-rose-200 transition-colors cursor-pointer"
            >
              Health Intelligence
            </button>
            <button
              onClick={() => navigate({ to: "/auth" })}
              className="hover:text-rose-200 transition-colors cursor-pointer"
            >
              Safety Network
            </button>
            <button
              onClick={() => navigate({ to: "/auth" })}
              className="hover:text-rose-200 transition-colors cursor-pointer"
            >
              Sisterhood Circle
            </button>
            <button
              onClick={() => navigate({ to: "/auth" })}
              className="hover:text-rose-200 transition-colors cursor-pointer"
            >
              Mentorship
            </button>
          </nav>

          {/* Right Action buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/auth" })}
              className="px-4 py-2 text-sm text-stone-200 hover:text-white transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate({ to: "/auth", search: { mode: "signup" } })}
              className="px-5 py-2.5 rounded-full text-sm font-medium bg-gradient-to-r from-[#d97762] via-[#c86d74] to-[#b85a6b] text-white shadow-md shadow-rose-950/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Join Sanctuary</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            aria-label="Toggle navigation"
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden p-2 rounded-full text-stone-200 hover:bg-white/10 transition-colors"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        {/* Mobile slide-over menu */}
        {menuOpen && (
          <div className="sm:hidden fixed inset-0 top-[73px] z-50 bg-[#181214]/95 backdrop-blur-xl p-6 flex flex-col justify-between border-t border-white/10">
            <div className="space-y-6 pt-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#e8998d]">Sanctuary Navigation</p>
              <div className="flex flex-col gap-4 text-xl font-serif italic">
                <button
                  onClick={() => { setMenuOpen(false); navigate({ to: "/auth" }); }}
                  className="text-left text-stone-200 hover:text-rose-200 py-2 border-b border-white/5"
                >
                  Health Hub & Cycle
                </button>
                <button
                  onClick={() => { setMenuOpen(false); navigate({ to: "/auth" }); }}
                  className="text-left text-stone-200 hover:text-rose-200 py-2 border-b border-white/5"
                >
                  Sisterhood Safety Network
                </button>
                <button
                  onClick={() => { setMenuOpen(false); navigate({ to: "/auth" }); }}
                  className="text-left text-stone-200 hover:text-rose-200 py-2 border-b border-white/5"
                >
                  Safe Space Community
                </button>
                <button
                  onClick={() => { setMenuOpen(false); navigate({ to: "/auth" }); }}
                  className="text-left text-stone-200 hover:text-rose-200 py-2 border-b border-white/5"
                >
                  Mentorship & Growth
                </button>
              </div>
            </div>

            <div className="space-y-3 pb-8">
              <button
                onClick={() => { setMenuOpen(false); navigate({ to: "/auth", search: { mode: "signup" } }); }}
                className="w-full py-3.5 rounded-full font-medium bg-gradient-to-r from-[#d97762] via-[#c86d74] to-[#b85a6b] text-white text-center shadow-lg"
              >
                Join HerSpace
              </button>
              <button
                onClick={() => { setMenuOpen(false); navigate({ to: "/auth" }); }}
                className="w-full py-3 rounded-full text-stone-300 hover:text-white text-center border border-white/10"
              >
                Sign In / Guest Access
              </button>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <main className="flex-1 flex flex-col items-center justify-center px-5 sm:px-8 md:px-12 pt-16 md:pt-24 pb-20 max-w-5xl mx-auto text-center">
          {/* Gentle Sanctuary Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-rose-300/20 backdrop-blur-md mb-8 anim-fade-up">
            <Heart className="w-3.5 h-3.5 text-[#e07a70] fill-[#e07a70]/40" />
            <span className="text-xs tracking-wide text-rose-100 font-medium">
              A private, sacred haven created specifically for women
            </span>
          </div>

          {/* Emotional Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif italic text-white leading-[1.08] tracking-tight max-w-4xl anim-fade-up">
            A quiet room for your health, safety, and sisterhood.
          </h1>

          <p className="mt-6 text-base sm:text-lg md:text-xl text-stone-300 max-w-2xl leading-relaxed anim-fade-up font-light">
            Sovereign hormonal health intelligence. A verified safety net wherever you walk.
            And a trusted circle of women who truly understand.
          </p>

          {/* Action CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto anim-fade-up">
            <button
              onClick={() => navigate({ to: "/auth", search: { mode: "signup" } })}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full text-base font-semibold bg-gradient-to-r from-[#d97762] via-[#c86d74] to-[#b85a6b] text-white shadow-xl shadow-rose-950/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2.5"
            >
              <span>Enter HerSpace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate({ to: "/auth" })}
              className="w-full sm:w-auto px-7 py-3.5 rounded-full text-base font-medium text-rose-100 bg-white/[0.05] border border-rose-200/20 hover:bg-white/[0.1] backdrop-blur-md transition-all cursor-pointer"
            >
              Instant Guest Tour
            </button>
          </div>

          {/* Trust Highlights */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-stone-400 border-t border-white/[0.08] pt-8 w-full max-w-2xl anim-fade-in">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Verified Women Only</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#c86d74]" />
              <span>Zero Advertising or Tracking</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#7e9a86]" />
              <span>End-to-End Encrypted Logs</span>
            </div>
          </div>

          {/* Sanctuary Pillars Grid */}
          <div className="mt-24 grid sm:grid-cols-2 lg:grid-cols-4 gap-5 text-left w-full">
            {PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                className="group relative p-6 rounded-3xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md hover:bg-white/[0.07] hover:border-rose-300/30 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#c86d74]/20 to-[#e8998d]/20 border border-[#c86d74]/30 flex items-center justify-center text-[#e8998d] mb-4 group-hover:scale-110 transition-transform">
                  <pillar.icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] uppercase tracking-widest text-[#e8998d] font-semibold">
                  {pillar.tag}
                </span>
                <h2 className="text-lg font-serif italic text-white mt-1 mb-2">
                  {pillar.title}
                </h2>
                <p className="text-xs text-stone-300 leading-relaxed font-light">
                  {pillar.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Testimonial Quote */}
          <div className="mt-20 w-full max-w-2xl p-8 rounded-3xl bg-gradient-to-br from-rose-950/20 via-white/[0.03] to-stone-900/30 border border-rose-200/15 backdrop-blur-md text-center">
            <p className="font-serif italic text-xl md:text-2xl text-rose-100 leading-relaxed">
              "For the first time, a digital space feels like resting in a quiet room with women who have your back."
            </p>
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-[#e8998d]">
              Sisterhood Member &middot; HerSpace
            </p>
          </div>
        </main>

        {/* Warm Minimal Footer */}
        <footer className="w-full px-5 sm:px-8 md:px-12 py-8 border-t border-white/[0.07] text-xs text-stone-400 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <HerSpaceLogo size={24} />
            <span className="font-serif italic text-base text-white">HerSpace</span>
            <span>&middot; Designed with warmth &amp; deep care for women.</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate({ to: "/privacy" })} className="hover:text-stone-200 transition-colors">
              Privacy Promise
            </button>
            <button onClick={() => navigate({ to: "/terms" })} className="hover:text-stone-200 transition-colors">
              Terms &amp; Safety
            </button>
            <button onClick={() => navigate({ to: "/auth" })} className="hover:text-rose-300 transition-colors">
              Enter Sanctuary &rarr;
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
