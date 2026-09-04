import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Menu, X, ShieldCheck } from "lucide-react";
import { hasSupabaseBrowserConfig } from "@/integrations/supabase/config";
import {
  authLog,
  completeAuthRedirect,
  consumeOAuthFragmentSession,
  hasOAuthResponseInUrl,
  waitForAuthenticatedUser,
} from "@/lib/auth-redirect";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HerSpace" },
      {
        name: "description",
        content:
          "HerSpace is a private, women-only digital ecosystem — AI health intelligence, a verified safety network, sisterhood, mentorship and growth in one trusted space.",
      },
      { property: "og:title", content: "HerSpace" },
      {
        property: "og:description",
        content: "A quiet room for your health, shared with those you trust.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500&display=swap",
      },
    ],
  }),
  component: App,
});

const NAV = [
  { n: "01.", label: "HEALTH", delay: 350 },
  { n: "02.", label: "SAFETY", delay: 450 },
  { n: "03.", label: "COMMUNITY", delay: 550 },
  { n: "04.", label: "GROWTH", delay: 650 },
];

function NavItem({ n, label, delay }: { n: string; label: string; delay: number }) {
  return (
    <div className="flex items-center gap-[3px] anim-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <span className="font-manrope text-[#AFDDFF]/80 text-[13px] leading-[15.6px]">{n}</span>
      <span className="font-manrope text-white text-[13px] leading-[15.6px] cursor-pointer hover:text-[#AFDDFF] transition-colors">
        {label}
      </span>
    </div>
  );
}

function TrustRows() {
  return (
    <>
      <div className="flex items-center gap-[10px] mb-3">
        <ShieldCheck className="w-[15px] h-[15px] text-white" strokeWidth={1.5} />
        <span className="font-manrope text-white text-[13px] leading-[15.6px]">PRIVATE BY DESIGN</span>
        <span className="font-manrope text-[#AFDDFF] text-[13px] leading-[15.6px]">[ VERIFIED ]</span>
      </div>
      <div className="flex items-center gap-[8px]">
        <span className="font-manrope text-white text-[13px] leading-[15.6px]">STATUS:</span>
        <span className="font-manrope text-black text-[13px] leading-[15.6px] bg-[#AFDDFF] rounded-[3px] px-[5px] py-[2px]">
          WOMEN_ONLY
        </span>
      </div>
    </>
  );
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div
      className={`fixed inset-0 z-50 lg:hidden transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
        open ? "visible" : "invisible"
      }`}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/90 backdrop-blur-md transition-opacity duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`relative h-full flex flex-col px-5 pt-24 pb-10 transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
          open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        }`}
      >
        <button
          aria-label="Close menu"
          onClick={onClose}
          className="absolute top-5 right-5 w-[40px] h-[40px] flex items-center justify-center"
        >
          <X className="w-[22px] h-[22px] text-white" strokeWidth={1.5} />
        </button>

        <div className="flex flex-col gap-8">
          {NAV.map((item, i) => (
            <div
              key={item.label}
              className={`flex items-center gap-3 transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
                open ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-6"
              }`}
              style={{ transitionDelay: open ? `${150 + i * 75}ms` : "0ms" }}
            >
              <span className="font-manrope text-[#AFDDFF]/80 text-[14px] leading-[1]">{item.n}</span>
              <span className="font-manrope text-white text-[28px] leading-[1.2] tracking-tight">{item.label}</span>
            </div>
          ))}
        </div>

        <div
          className={`mt-auto pt-10 border-t border-white/10 transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
            open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{ transitionDelay: open ? "450ms" : "0ms" }}
        >
          <TrustRows />
        </div>
      </div>
    </div>
  );
}

const verticalPositions = ["12.6%", "37.5%", "61.9%", "86.2%"];
const horizontalPositions = ["32.7%", "71.4%"];
const vDelays = [600, 700, 800, 900];
const hDelays = [800, 950];
const plusDelays = [1000, 1080, 1160, 1240, 1320, 1400, 1480, 1560];

function GridLines() {
  const marks: { left: string; top: string }[] = [];
  horizontalPositions.forEach((top) => verticalPositions.forEach((left) => marks.push({ left, top })));

  return (
    <div className="absolute inset-0 pointer-events-none">
      {verticalPositions.map((left, i) => (
        <div
          key={`v${left}`}
          className="absolute top-0 h-full w-px bg-white/[0.04] anim-grid-v"
          style={{ left, animationDelay: `${vDelays[i]}ms` }}
        />
      ))}
      {horizontalPositions.map((top, i) => (
        <div
          key={`h${top}`}
          className="absolute left-0 w-full h-px bg-white/[0.04] anim-grid-h"
          style={{ top, animationDelay: `${hDelays[i]}ms` }}
        />
      ))}
      {marks.map((m, i) => (
        <div
          key={`p${i}`}
          className="absolute anim-fade-in"
          style={{ left: m.left, top: m.top, animationDelay: `${plusDelays[i]}ms` }}
        >
          <div className="absolute w-[10px] h-px bg-white/70 -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute w-px h-[10px] bg-white/70 -translate-x-1/2 -translate-y-1/2" />
        </div>
      ))}
    </div>
  );
}

function ConnectorLine({
  x1,
  y1,
  x2,
  y2,
  delay,
}: {
  x1: string;
  y1: string;
  x2: string;
  y2: string;
  delay: number;
}) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none anim-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function NodeLabel({
  top,
  left,
  anim,
  delay,
  title,
  body,
  maxW,
}: {
  top: string;
  left: string;
  anim: string;
  delay: number;
  title: string;
  body: string;
  maxW: string;
}) {
  return (
    <div className={`absolute ${anim}`} style={{ top, left, animationDelay: `${delay}ms` }}>
      <p className="font-manrope text-white text-[13px] leading-[15.6px] whitespace-nowrap">{title}</p>
      <p className={`font-manrope text-white/50 text-[11px] leading-[14px] mt-[4px] ${maxW}`}>{body}</p>
    </div>
  );
}

function CentralNodes() {
  return (
    <div className="absolute inset-0 pointer-events-none hidden md:block">
      <ConnectorLine x1="38%" y1="14%" x2="52%" y2="14%" delay={1200} />
      <ConnectorLine x1="52%" y1="14%" x2="60%" y2="27%" delay={1400} />
      <ConnectorLine x1="32%" y1="58%" x2="20%" y2="74%" delay={1500} />
      <ConnectorLine x1="20%" y1="74%" x2="6%" y2="74%" delay={1700} />
      <ConnectorLine x1="78%" y1="53%" x2="63%" y2="53%" delay={1800} />
      <ConnectorLine x1="63%" y1="53%" x2="50%" y2="63%" delay={2000} />

      <div
        className="absolute w-[80px] h-[80px] lg:w-[100px] lg:h-[100px] border border-white/80 anim-scale-in"
        style={{ top: "27%", left: "60%", animationDelay: "1500ms" }}
      />
      <div
        className="absolute w-[80px] h-[80px] lg:w-[100px] lg:h-[100px] border border-white/80 anim-scale-in"
        style={{ top: "58%", left: "32%", animationDelay: "1800ms" }}
      />
      <div
        className="absolute w-[80px] h-[80px] lg:w-[100px] lg:h-[100px] border border-white/80 anim-scale-in"
        style={{ top: "63%", left: "50%", animationDelay: "2100ms" }}
      />

      <NodeLabel
        top="11%"
        left="26%"
        anim="anim-slide-left"
        delay={1100}
        title="[ INTELLIGENCE ]"
        body="Sovereign AI health intelligence translating symptoms and research into private, understandable insights."
        maxW="max-w-[160px]"
      />
      <NodeLabel
        top="76%"
        left="3%"
        anim="anim-slide-left"
        delay={1400}
        title="[ SAFETY_NETWORK ]"
        body="Verified safe places, trusted women professionals, and real-time safety connections wherever you go."
        maxW="max-w-[160px]"
      />
      <NodeLabel
        top="50%"
        left="78%"
        anim="anim-slide-right"
        delay={1700}
        title="[ SISTERHOOD ]"
        body="A trusted network for mentorship, travel, careers, knowledge, and meaningful connection."
        maxW="max-w-[180px]"
      />
    </div>
  );
}

function BottomRow({ onJoin, onExplore }: { onJoin: () => void; onExplore: () => void }) {
  return (
    <div className="absolute bottom-5 md:bottom-[35px] left-5 md:left-[35px] right-5 md:right-[35px] flex flex-col md:flex-row items-start md:items-end justify-between gap-5 md:gap-0 z-10">
      <button
        onClick={onJoin}
        className="bg-[#AFDDFF] px-[16px] md:px-[20px] py-[10px] md:py-[12px] flex items-center gap-[10px] hover:bg-[#c8e8ff] transition-colors anim-fade-up relative z-10 cursor-pointer"
        style={{ animationDelay: "900ms" }}
      >
        <span className="text-black text-[16px] leading-none">&#10022;</span>
        <span className="font-manrope text-black text-[12px] md:text-[13px] leading-[15.6px] uppercase tracking-wide">
          JOIN HERSPACE
        </span>
      </button>

      <div
        className="relative max-w-[280px] hidden sm:block anim-slide-right z-10"
        style={{ animationDelay: "1100ms" }}
      >
        <span className="font-manrope text-black text-[13px] leading-[15.6px] bg-[#AFDDFF] px-[6px] py-[2px] inline-block mb-[10px]">
          WOMEN-ONLY — BUILT FOR TRUST
        </span>
        <div className="relative p-[20px] z-10">
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 280 168"
            preserveAspectRatio="none"
          >
            <polygon
              points="0.5,0.5 279.5,0.5 279.5,167.5 30,167.5 0.5,137.5"
              fill="none"
              stroke="#AFDDFF"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <p className="relative font-manrope text-white text-[13px] leading-[18px] mb-[18px]">
            A private digital ecosystem for women — connecting health intelligence, safety, community, and growth in
            one trusted space.
          </p>
          <span
            onClick={onExplore}
            className="relative font-manrope text-[#AFDDFF] text-[13px] leading-[15.6px] cursor-pointer hover:underline z-10"
          >
            EXPLORE HERSPACE
          </span>
        </div>
      </div>
    </div>
  );
}

function App() {
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
            user = await waitForAuthenticatedUser(1_000);
            authLog("home-page.wait-completed", { hasUser: Boolean(user) });
          } catch {}
        }
        if (!cancelled && user) {
          authLog("home-page.redirecting-to-dashboard");
          completeAuthRedirect();
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
    <section className="relative w-full h-screen overflow-hidden bg-black">
      <video
        className="absolute inset-0 w-full h-full object-cover anim-fade-in"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260813_115057_94c3699b-0fd1-4124-bcf3-3626bb8c1f77.mp4"
        autoPlay
        muted
        loop
        playsInline
      />

      <div className="relative z-10 w-full h-full">
        <nav className="absolute top-0 left-0 w-full flex items-center px-5 md:px-[35px] py-5 md:py-[27px] z-20">
          <div className="flex items-center gap-[40px]">
            <span
              className="font-graphik text-white text-[18px] md:text-[21px] leading-[21px] whitespace-nowrap anim-fade-up"
              style={{ animationDelay: "200ms" }}
            >
              HerSpace
            </span>
            <div className="hidden lg:flex items-center gap-[40px]">
              {NAV.map((item) => (
                <NavItem key={item.label} n={item.n} label={item.label} delay={item.delay} />
              ))}
            </div>
          </div>

          <div
            className="hidden lg:flex items-center gap-[12px] ml-auto anim-slide-right"
            style={{ animationDelay: "600ms" }}
          >
            <ShieldCheck className="w-[15px] h-[15px] text-white" strokeWidth={1.5} />
            <span className="font-manrope text-white text-[13px] leading-[15.6px]">PRIVATE BY DESIGN</span>
            <span className="font-manrope text-[#AFDDFF] text-[13px] leading-[15.6px]">[ VERIFIED ]</span>
            <span className="font-manrope text-white text-[13px] leading-[15.6px] ml-[20px]">STATUS:</span>
            <span className="font-manrope text-black text-[13px] leading-[15.6px] bg-[#AFDDFF] rounded-[3px] px-[5px] py-[2px]">
              WOMEN_ONLY
            </span>
          </div>

          <button
            aria-label="Toggle menu"
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden ml-auto relative w-[40px] h-[40px] flex items-center justify-center anim-fade-in"
            style={{ animationDelay: "400ms" }}
          >
            <Menu
              className={`absolute w-[22px] h-[22px] text-white transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] ${
                menuOpen ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"
              }`}
              strokeWidth={1.5}
            />
            <X
              className={`absolute w-[22px] h-[22px] text-white transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] ${
                menuOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"
              }`}
              strokeWidth={1.5}
            />
          </button>
        </nav>

        <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

        <h1
          className="font-graphik text-white font-normal leading-[1em] absolute anim-fade-up text-[32px] sm:text-[48px] md:text-[68px] top-[140px] sm:top-[160px] md:top-[178px] left-5 md:left-[35px] max-w-[300px] sm:max-w-[420px] md:max-w-[554px]"
          style={{ animationDelay: "400ms" }}
        >
          A quiet room for your health.
        </h1>

        <GridLines />
        <CentralNodes />
        <BottomRow
          onJoin={() => navigate({ to: "/auth", search: { mode: "signup" } })}
          onExplore={() => navigate({ to: "/auth" })}
        />
      </div>
    </section>
  );
}
