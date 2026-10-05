import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Menu, X, ArrowRight } from "lucide-react";
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
      { title: "HerSpace // SANCTUARY" },
      {
        name: "description",
        content:
          "HerSpace is a private sacred haven created specifically for women — hormonal health intelligence, safety sisterhood, anonymous circle, and mentorship in one trusted space.",
      },
      { property: "og:title", content: "HerSpace // SANCTUARY" },
      {
        property: "og:description",
        content:
          "A quiet room for your health, safety and sisterhood. A private sacred haven created specifically for women.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://her-space-connect.vercel.app/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: "https://her-space-connect.vercel.app/" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap",
      },
    ],
  }),
  component: LandingPage,
});

interface PillarNode {
  id: string;
  number: string;
  navLabel: string;
  tag: string;
  title: string;
  desc: string;
  squareTop: string;
  squareLeft: string;
  squareDelay: string;
  labelTop: string;
  labelLeft: string;
  labelAnim: string;
  labelDelay: string;
  maxW: string;
  connectors: Array<{ x1: string; y1: string; x2: string; y2: string; delay: number }>;
}

const PILLARS: PillarNode[] = [
  {
    id: "cycle",
    number: "01",
    navLabel: "CYCLE_INTELLIGENCE",
    tag: "[ CYCLE_INTELLIGENCE ]",
    title: "Hormonal & Cycle Intelligence",
    desc: "Private AI translating symptoms, cycle phases, and fertility changes into calm, compassionate clarity.",
    squareTop: "24%",
    squareLeft: "58%",
    squareDelay: "1200ms",
    labelTop: "11%",
    labelLeft: "34%",
    labelAnim: "anim-slide-left",
    labelDelay: "900ms",
    maxW: "max-w-[170px]",
    connectors: [
      { x1: "44%", y1: "15%", x2: "52%", y2: "15%", delay: 1000 },
      { x1: "52%", y1: "15%", x2: "58%", y2: "24%", delay: 1100 },
    ],
  },
  {
    id: "safety",
    number: "02",
    navLabel: "SISTERHOOD_SAFETY",
    tag: "[ SISTERHOOD_SAFETY ]",
    title: "Safety & Sisterhood Network",
    desc: "A supportive network of safe havens, emergency beacons, and discreet walking companions.",
    squareTop: "56%",
    squareLeft: "32%",
    squareDelay: "1400ms",
    labelTop: "74%",
    labelLeft: "4%",
    labelAnim: "anim-slide-left",
    labelDelay: "1100ms",
    maxW: "max-w-[170px]",
    connectors: [
      { x1: "32%", y1: "56%", x2: "20%", y2: "72%", delay: 1200 },
      { x1: "20%", y1: "72%", x2: "7%", y2: "72%", delay: 1300 },
    ],
  },
  {
    id: "sisterhood",
    number: "03",
    navLabel: "UNCONDITIONAL_SPACE",
    tag: "[ UNCONDITIONAL_CIRCLE ]",
    title: "Unconditional Sisterhood",
    desc: "Anonymous discussions, genuine questions, and heartfelt support from women who understand your journey.",
    squareTop: "62%",
    squareLeft: "52%",
    squareDelay: "1600ms",
    labelTop: "50%",
    labelLeft: "76%",
    labelAnim: "anim-slide-right",
    labelDelay: "1300ms",
    maxW: "max-w-[180px]",
    connectors: [
      { x1: "76%", y1: "52%", x2: "63%", y2: "52%", delay: 1400 },
      { x1: "63%", y1: "52%", x2: "52%", y2: "62%", delay: 1500 },
    ],
  },
  {
    id: "mentorship",
    number: "04",
    navLabel: "MENTORSHIP_GROWTH",
    tag: "[ MENTORSHIP_ELEVATION ]",
    title: "Mentorship & Elevation",
    desc: "Women leaders opening doors in careers, creative work, wellness, and personal empowerment.",
    squareTop: "32%",
    squareLeft: "78%",
    squareDelay: "1800ms",
    labelTop: "19%",
    labelLeft: "67%",
    labelAnim: "anim-slide-right",
    labelDelay: "1500ms",
    maxW: "max-w-[175px]",
    connectors: [
      { x1: "78%", y1: "32%", x2: "70%", y2: "23%", delay: 1600 },
      { x1: "70%", y1: "23%", x2: "65%", y2: "23%", delay: 1700 },
    ],
  },
];

const VERTICAL_GRID_POSITIONS = ["12.6%", "37.5%", "61.9%", "86.2%"];
const HORIZONTAL_GRID_POSITIONS = ["32.7%", "71.4%"];

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePillar, setActivePillar] = useState(0);
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

  const activePillarData = PILLARS[activePillar] || PILLARS[0];

  return (
    <section className="relative w-full h-screen overflow-hidden bg-[#12080c] text-white select-none">
      {/* ── Background Video Layer: Blooming Flower ── */}
      <video
        className="absolute inset-0 w-full h-full object-cover anim-fade-in filter contrast-[1.15] brightness-[1.05]"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260813_115057_94c3699b-0fd1-4124-bcf3-3626bb8c1f77.mp4"
        autoPlay
        muted
        loop
        playsInline
      />

      {/* ── Pink Flower Tint Blending Layers (Tints the flower petals radiant rose/pink) ── */}
      {/* Color blend: infuses vibrant magenta/rose pink directly into the flower petals */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-color z-[1]"
        style={{
          background:
            "radial-gradient(ellipse 80% 80% at 55% 45%, #ff4d88 0%, #f43f5e 35%, #ec4899 65%, #9d174d 100%)",
          opacity: 0.95,
        }}
      />

      {/* Screen blend: soft luminous rose-pink glow over the flower bloom highlights */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-screen z-[2]"
        style={{
          background:
            "radial-gradient(circle at 55% 45%, rgba(255, 130, 175, 0.45) 0%, rgba(244, 114, 182, 0.3) 40%, rgba(219, 39, 119, 0.15) 70%, transparent 100%)",
          opacity: 0.85,
        }}
      />

      {/* Warm deep botanical vignette to preserve contrast and warm black background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#14080e]/75 via-[#14080e]/35 to-[#12080c]/85 pointer-events-none z-[3]" />
      <div className="absolute -top-32 -left-32 w-[30rem] h-[30rem] rounded-full bg-[#f472b6]/15 blur-[130px] pointer-events-none z-[3]" />
      <div className="absolute top-1/3 -right-32 w-[32rem] h-[32rem] rounded-full bg-[#fb7185]/20 blur-[150px] pointer-events-none z-[3]" />

      {/* ── Grid Lines & Plus Intersections ── */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {VERTICAL_GRID_POSITIONS.map((left, i) => (
          <div
            key={`v-grid-${i}`}
            className="absolute top-0 h-full w-px bg-white/[0.04] anim-grid-v"
            style={{ left, animationDelay: `${600 + i * 100}ms` }}
          />
        ))}

        {HORIZONTAL_GRID_POSITIONS.map((top, i) => (
          <div
            key={`h-grid-${i}`}
            className="absolute left-0 w-full h-px bg-white/[0.04] anim-grid-h"
            style={{ top, animationDelay: `${800 + i * 150}ms` }}
          />
        ))}

        {/* 8 Plus Marks at Grid Intersections */}
        {HORIZONTAL_GRID_POSITIONS.map((top, hi) =>
          VERTICAL_GRID_POSITIONS.map((left, vi) => {
            const delay = 1000 + (hi * 4 + vi) * 80;
            return (
              <div
                key={`plus-${hi}-${vi}`}
                className="absolute anim-scale-in pointer-events-none"
                style={{ top, left, animationDelay: `${delay}ms` }}
              >
                <div className="absolute w-[10px] h-px bg-pink-100/70 -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute w-px h-[10px] bg-pink-100/70 -translate-x-1/2 -translate-y-1/2" />
              </div>
            );
          }),
        )}
      </div>

      {/* ── Central Interactive Flower Nodes & Connectors (desktop & tablets) ── */}
      <div className="absolute inset-0 pointer-events-none hidden md:block z-10">
        {/* Connector Lines */}
        {PILLARS.map((pillar, pi) =>
          pillar.connectors.map((c, ci) => {
            const isActive = activePillar === pi;
            return (
              <svg
                key={`connector-${pi}-${ci}`}
                className="absolute inset-0 pointer-events-none anim-fade-in"
                style={{ width: "100%", height: "100%", animationDelay: `${c.delay}ms` }}
              >
                <line
                  x1={c.x1}
                  y1={c.y1}
                  x2={c.x2}
                  y2={c.y2}
                  stroke={isActive ? "#f472b6" : "rgba(255,255,255,0.22)"}
                  strokeWidth={isActive ? "1.5" : "1"}
                  vectorEffect="non-scaling-stroke"
                  className="transition-colors duration-500"
                />
              </svg>
            );
          }),
        )}

        {/* Squares positioned over flower blooms */}
        {PILLARS.map((pillar, i) => {
          const isActive = activePillar === i;
          return (
            <div
              key={`square-${pillar.id}`}
              onClick={() => setActivePillar(i)}
              className={`absolute w-[80px] h-[80px] lg:w-[100px] lg:h-[100px] border anim-scale-in pointer-events-auto cursor-pointer transition-all duration-500 group ${
                isActive
                  ? "border-[#f472b6] bg-[#f472b6]/15 shadow-[0_0_35px_rgba(244,114,182,0.45)] scale-105"
                  : "border-white/70 hover:border-[#f472b6]/80 hover:bg-white/[0.04]"
              }`}
              style={{
                top: pillar.squareTop,
                left: pillar.squareLeft,
                animationDelay: pillar.squareDelay,
              }}
              role="button"
              tabIndex={0}
              aria-label={`Select ${pillar.title}`}
            >
              {/* Corner reticle accents */}
              <div
                className={`absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 transition-colors ${
                  isActive ? "border-[#f472b6]" : "border-white/70"
                }`}
              />
              <div
                className={`absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 transition-colors ${
                  isActive ? "border-[#f472b6]" : "border-white/70"
                }`}
              />
              <div
                className={`absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 transition-colors ${
                  isActive ? "border-[#f472b6]" : "border-white/70"
                }`}
              />
              <div
                className={`absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 transition-colors ${
                  isActive ? "border-[#f472b6]" : "border-white/70"
                }`}
              />

              {/* Luminous center pulse indicator */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    isActive
                      ? "bg-[#f472b6] ring-4 ring-[#f472b6]/35 scale-125 shadow-[0_0_12px_#f472b6]"
                      : "bg-white/60 group-hover:bg-[#f472b6]"
                  }`}
                />
              </div>

              {/* Node index */}
              <span className="absolute bottom-1.5 right-2 font-sans text-[10px] text-white/50 tracking-wider">
                {pillar.number}
              </span>
            </div>
          );
        })}

        {/* Labels for Nodes */}
        {PILLARS.map((pillar, i) => {
          const isActive = activePillar === i;
          return (
            <div
              key={`label-${pillar.id}`}
              onClick={() => setActivePillar(i)}
              className={`absolute ${pillar.labelAnim} pointer-events-auto cursor-pointer group`}
              style={{
                top: pillar.labelTop,
                left: pillar.labelLeft,
                animationDelay: pillar.labelDelay,
              }}
            >
              <span
                className={`font-sans text-[12px] md:text-[13px] leading-[15.6px] tracking-wide whitespace-nowrap block transition-colors duration-300 ${
                  isActive
                    ? "text-[#f472b6] font-semibold drop-shadow-[0_0_10px_rgba(244,114,182,0.5)]"
                    : "text-white group-hover:text-[#f472b6]"
                }`}
              >
                {pillar.tag}
              </span>
              <p
                className={`font-sans text-white/55 text-[11px] leading-[14px] mt-[4px] ${pillar.maxW} transition-opacity duration-300 ${
                  isActive ? "text-white/85" : "group-hover:text-white/75"
                }`}
              >
                {pillar.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── Main Content Layer ── */}
      <div className="relative z-20 w-full h-full pointer-events-none">
        {/* Top Navigation */}
        <nav className="absolute top-0 left-0 w-full flex items-center justify-between px-5 md:px-[35px] py-5 md:py-[27px] pointer-events-auto z-30">
          {/* Left Group */}
          <div className="flex items-center gap-5 xl:gap-[32px] mr-6 xl:mr-10">
            {/* Wordmark */}
            <div
              onClick={() => navigate({ to: "/" })}
              className="flex items-center gap-3 anim-fade-up cursor-pointer group"
              style={{ animationDelay: "200ms" }}
            >
              <HerSpaceLogo size={28} className="transition-transform group-hover:scale-105" />
              <span className="font-serif italic text-white text-[21px] md:text-[24px] tracking-tight whitespace-nowrap select-none font-normal">
                HerSpace
              </span>
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden lg:flex items-center gap-3.5 xl:gap-[20px]">
              {PILLARS.map((pillar, i) => {
                const isActive = activePillar === i;
                return (
                  <button
                    key={pillar.id}
                    onClick={() => setActivePillar(i)}
                    className="flex items-center gap-[4px] anim-fade-up group cursor-pointer bg-transparent border-0 p-0"
                    style={{ animationDelay: `${350 + i * 100}ms` }}
                  >
                    <span className="font-sans text-[#f472b6]/90 text-[12px] leading-[15.6px] font-medium">
                      {pillar.number}.
                    </span>
                    <span
                      className={`font-sans text-[11px] xl:text-[12.5px] leading-[15.6px] tracking-wider transition-colors uppercase ${
                        isActive
                          ? "text-[#f472b6] font-semibold"
                          : "text-white/90 hover:text-[#f472b6]"
                      }`}
                    >
                      {pillar.navLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Group */}
          <div
            className="hidden lg:flex items-center gap-3 xl:gap-[12px] ml-auto anim-slide-right"
            style={{ animationDelay: "600ms" }}
          >
            <button
              onClick={() => navigate({ to: "/auth" })}
              className="font-sans text-white/90 text-[13px] leading-[15.6px] hover:text-[#f472b6] transition-colors cursor-pointer whitespace-nowrap"
            >
              Sign In
            </button>
            <span className="font-sans text-white/70 text-[13px] leading-[15.6px] ml-2 xl:ml-[16px] whitespace-nowrap">
              STATUS:
            </span>
            <div className="bg-[#f472b6] rounded-[3px] px-[6px] py-[2px] text-[#14060c] font-sans text-[11px] xl:text-[12px] leading-[15.6px] font-bold tracking-wide whitespace-nowrap">
              SANCTUARY_ACTIVE
            </div>
            <button
              onClick={() => navigate({ to: "/auth", search: { mode: "signup" } })}
              className="bg-white/10 hover:bg-[#f472b6]/20 hover:border-[#f472b6]/40 border border-white/20 text-white hover:text-pink-100 px-3.5 py-1.5 font-sans text-[12px] uppercase tracking-wider transition-all duration-200 cursor-pointer ml-1 whitespace-nowrap"
            >
              Join Sanctuary
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            aria-label="Toggle menu"
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden ml-auto relative w-[40px] h-[40px] flex items-center justify-center anim-fade-in cursor-pointer"
            style={{ animationDelay: "400ms" }}
          >
            {/* Menu icon */}
            <span
              className={`absolute transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] ${
                menuOpen ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"
              }`}
            >
              <Menu className="w-[22px] h-[22px] text-white" strokeWidth={1.5} />
            </span>
            {/* X icon */}
            <span
              className={`absolute transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] ${
                menuOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"
              }`}
            >
              <X className="w-[22px] h-[22px] text-white" strokeWidth={1.5} />
            </span>
          </button>
        </nav>

        {/* Mobile Slide-Over Menu Overlay */}
        <div
          className={`fixed inset-0 z-50 lg:hidden transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] pointer-events-auto ${
            menuOpen ? "visible" : "invisible"
          }`}
        >
          {/* Backdrop */}
          <div
            onClick={() => setMenuOpen(false)}
            className={`absolute inset-0 bg-[#0e0508]/92 backdrop-blur-md transition-opacity duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
              menuOpen ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Panel */}
          <div
            className={`relative h-full flex flex-col px-5 pt-24 pb-10 transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
              menuOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
            }`}
          >
            {/* Close button */}
            <button
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="absolute top-5 right-5 w-[40px] h-[40px] flex items-center justify-center cursor-pointer text-white"
            >
              <X className="w-[22px] h-[22px]" strokeWidth={1.5} />
            </button>

            {/* Nav list */}
            <div className="flex flex-col gap-7">
              {PILLARS.map((pillar, i) => (
                <div
                  key={`m-nav-${pillar.id}`}
                  onClick={() => {
                    setActivePillar(i);
                    setMenuOpen(false);
                  }}
                  className="transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] cursor-pointer"
                  style={{
                    transitionDelay: menuOpen ? `${150 + i * 75}ms` : "0ms",
                    transform: menuOpen ? "translateX(0)" : "translateX(-24px)",
                    opacity: menuOpen ? 1 : 0,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-sans text-[#f472b6] text-[13px] font-semibold">
                      {pillar.number}.
                    </span>
                    <span className="font-serif italic text-white text-[24px] sm:text-[28px] leading-[1.2] tracking-tight hover:text-[#f472b6] transition-colors">
                      {pillar.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Pinned Bottom Sanctuary Action Block */}
            <div
              className="mt-auto pt-8 border-t border-white/10 transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]"
              style={{
                transitionDelay: menuOpen ? "450ms" : "0ms",
                transform: menuOpen ? "translateY(0)" : "translateY(16px)",
                opacity: menuOpen ? 1 : 0,
              }}
            >
              <div className="flex items-center gap-[10px] mb-3">
                <span className="font-sans text-white/70 text-[13px] leading-[15.6px]">STATUS:</span>
                <span className="bg-[#f472b6] rounded-[3px] px-[6px] py-[2px] text-[#14060c] font-sans text-[12px] leading-[15.6px] font-bold">
                  SANCTUARY_ACTIVE
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate({ to: "/auth", search: { mode: "signup" } });
                  }}
                  className="w-full bg-gradient-to-r from-[#ff7597] to-[#f472b6] text-[#14060c] font-sans font-bold text-sm py-3.5 uppercase tracking-wider text-center shadow-lg shadow-pink-950/40"
                >
                  Join HerSpace Sanctuary
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate({ to: "/auth" });
                  }}
                  className="w-full border border-white/20 text-white font-sans text-sm py-3 uppercase tracking-wider text-center hover:bg-white/10"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Heading & Side Text ── */}
        <div
          className="absolute left-5 md:left-[35px] top-[110px] sm:top-[130px] md:top-[145px] max-w-[340px] sm:max-w-[460px] md:max-w-[620px] pointer-events-auto anim-fade-up z-20"
          style={{ animationDelay: "400ms" }}
        >
          {/* Private Sacred Haven Badge */}
          <div className="inline-block bg-[#f472b6] text-[#14060c] font-sans text-[11px] md:text-[12px] leading-[14px] px-[7px] py-[3px] mb-[14px] font-bold uppercase tracking-wider shadow-sm">
            A private sacred haven created specifically for women
          </div>

          {/* Main Title in Editorial Serif */}
          <h1 className="font-serif italic text-white font-normal leading-[1.06] tracking-tight text-[36px] sm:text-[52px] md:text-[68px] drop-shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
            A quiet room for your health, safety and sisterhood.
          </h1>
        </div>

        {/* ── Bottom Row ── */}
        <div className="absolute bottom-5 md:bottom-[35px] left-5 md:left-[35px] right-5 md:right-[35px] flex flex-col md:flex-row items-start md:items-end justify-between gap-5 md:gap-0 pointer-events-auto z-20">
          {/* Left CTA Button */}
          <button
            onClick={() => navigate({ to: "/auth", search: { mode: "signup" } })}
            className="bg-gradient-to-r from-[#ff7597] to-[#f472b6] hover:from-[#ff9ebb] hover:to-[#fbcfe8] text-[#14060c] px-[18px] md:px-[22px] py-[11px] md:py-[13px] flex items-center gap-[10px] transition-all duration-300 anim-fade-up cursor-pointer group shadow-[0_0_30px_rgba(244,114,182,0.35)] shrink-0"
            style={{ animationDelay: "900ms" }}
          >
            <span className="text-[#14060c] text-[16px] leading-none group-hover:rotate-45 transition-transform duration-300">
              &#10022;
            </span>
            <span className="font-sans text-[#14060c] font-bold text-[12px] md:text-[13px] leading-[15.6px] uppercase tracking-wider">
              Explore Private Sanctuary
            </span>
          </button>

          {/* Right Info Card (Chamfered Corner SVG) */}
          <div
            className="relative w-full sm:w-[290px] max-w-[290px] hidden sm:block anim-slide-right shrink-0"
            style={{ animationDelay: "1100ms" }}
          >
            {/* Badge above card */}
            <div className="font-sans text-[#14060c] text-[11px] leading-[15.6px] bg-[#f472b6] px-[7px] py-[2px] inline-block mb-[10px] font-bold uppercase tracking-wider">
              SANCTUARY PILLARS // 0{activePillar + 1}
            </div>

            {/* Card Body */}
            <div className="relative p-[20px] backdrop-blur-md">
              {/* Chamfered Border SVG Polygon */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 290 170"
                preserveAspectRatio="none"
              >
                <polygon
                  points="0.5,0.5 289.5,0.5 289.5,169.5 30,169.5 0.5,139.5"
                  fill="rgba(20, 8, 14, 0.85)"
                  stroke="#f472b6"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              {/* Dynamic pillar content updating on flower clicks */}
              <div className="relative z-10">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-sans text-[#f472b6] text-[12px] font-bold uppercase tracking-wider">
                    {activePillarData.tag}
                  </span>
                  {/* Indicator switchers */}
                  <div className="flex items-center gap-1.5">
                    {PILLARS.map((_, i) => (
                      <button
                        key={`dot-${i}`}
                        onClick={() => setActivePillar(i)}
                        className={`w-1.5 h-1.5 transition-all cursor-pointer ${
                          activePillar === i
                            ? "bg-[#f472b6] scale-125 shadow-[0_0_8px_#f472b6]"
                            : "bg-white/30 hover:bg-white/60"
                        }`}
                        aria-label={`Select pillar ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>

                <p className="font-sans text-white/80 text-[12.5px] leading-[18px] mb-[18px] min-h-[54px]">
                  {activePillarData.desc}
                </p>

                <button
                  onClick={() => navigate({ to: "/auth" })}
                  className="font-sans text-[#f472b6] text-[12.5px] leading-[15.6px] font-semibold cursor-pointer hover:underline uppercase tracking-wider text-left flex items-center gap-1.5 group"
                >
                  <span>EXPLORE_PILLAR_DETAILS</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
