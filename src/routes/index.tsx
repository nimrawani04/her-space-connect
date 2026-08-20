import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HerSpace — A quiet room for your health, shared with those you trust" },
      { name: "description", content: "The global women-only digital ecosystem. AI health insights, anonymous community, mentorship, careers, safety network, and mental wellness — built for privacy and trust." },
      { property: "og:title", content: "HerSpace" },
      { property: "og:description", content: "A quiet room for your health, shared with those you trust." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return <Landing />;
}

const modules = [
  { tag: "01", title: "Health Hub", blurb: "AI symptom assistant, hormone tracking, research simplifier." },
  { tag: "02", title: "Safe Space", blurb: "Anonymous community, moderated by women." },
  { tag: "03", title: "Experience Match", blurb: "Find women who've lived what you're living." },
  { tag: "04", title: "Mentorship", blurb: "1:1 sessions with verified women leaders." },
  { tag: "05", title: "Careers", blurb: "Internships, scholarships, grants, fellowships." },
  { tag: "06", title: "Marketplace", blurb: "Hire women — tutors, designers, devs, consultants." },
  { tag: "07", title: "Safety Network", blurb: "Safe-places map, female pros, real-time alerts." },
  { tag: "08", title: "Travel Sisterhood", blurb: "Verified locals for women on the move." },
  { tag: "09", title: "Mental Wellness", blurb: "AI journal, mood tracking, support circles." },
  { tag: "10", title: "Stories", blurb: "Blogs, journeys, and research, by us — for us." },
];

function Landing() {
  return (
    <div className="min-h-screen text-foreground font-sans selection:bg-earth/10 selection:text-earth">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="font-serif text-2xl italic tracking-tight text-foreground">HerSpace</Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#pillars" className="text-sm font-medium text-muted-foreground hover:text-earth transition-colors">Ecosystem</a>
            <a href="#dashboard" className="text-sm font-medium text-muted-foreground hover:text-earth transition-colors">Dashboard</a>
            <a href="#stories" className="text-sm font-medium text-muted-foreground hover:text-earth transition-colors">Stories</a>
            <Link to="/auth" className="text-sm font-medium text-foreground border-l border-border pl-8">Sign in</Link>
            <Link to="/auth" search={{ mode: "signup" }} className="text-sm font-medium bg-foreground text-background px-4 py-2 rounded-full hover:opacity-90 transition-opacity">
              Join HerSpace
            </Link>
          </div>
          <div className="md:hidden flex items-center gap-3">
            <Link to="/auth" className="text-sm font-medium text-foreground">Sign in</Link>
            <Link to="/auth" search={{ mode: "signup" }} className="text-sm font-medium bg-foreground text-background px-4 py-2 rounded-full">Join</Link>
          </div>
        </div>
      </nav>

      <section className="pt-16 sm:pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-serif italic leading-[1.05] text-foreground text-balance mb-6 sm:mb-8">
              A quiet room for your health, shared with those you trust.
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-[56ch] text-pretty leading-relaxed">
              The global digital ecosystem for women. From AI-led hormone insights to a verified safety network, HerSpace is built for privacy, clarity, and sisterhood.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/auth" search={{ mode: "signup" }} className="bg-earth text-earth-foreground px-6 py-3 rounded-full text-base font-medium hover:brightness-110 transition-all">
                Join HerSpace
              </Link>
              <a href="#pillars" className="px-6 py-3 rounded-full text-base font-medium border border-border hover:bg-muted transition-colors">
                Explore the ecosystem
              </a>
            </div>
          </div>

          <div className="mt-16 flex flex-wrap items-center gap-x-12 gap-y-6 py-8 border-y border-border">
            <TrustDot color="bg-[oklch(0.55_0.13_140)]" label="Verified women-only" />
            <TrustDot color="bg-earth" label="Zero-knowledge privacy" />
            <TrustDot color="bg-muted-foreground" label="Safety-first protocols" />
          </div>
        </div>
      </section>

      <section id="pillars" className="py-16 sm:py-24 bg-sand/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-10 sm:mb-16 gap-4">
            <h2 className="text-3xl md:text-4xl font-serif italic text-foreground">Ten pillars of support.</h2>
            <span className="hidden md:block text-xs uppercase tracking-[0.2em] text-muted-foreground">One ecosystem</span>
          </div>

          <div className="grid grid-cols-12 gap-4 sm:gap-6">
            <PillarCard tag="01" eyebrow="Intelligence" title="Clinical clarity, privately yours" body="A sovereign AI symptom assistant and research simplifier — never sold, never trained on you." className="col-span-12 md:col-span-7 bg-card min-h-[260px]" big />
            <PillarCard tag="02" eyebrow="Cycle" title="Rhythms & hormones" body="Predictive tracking that respects your autonomy." className="col-span-12 md:col-span-5 bg-foreground text-background" dark />
            <PillarCard tag="03" eyebrow="Safety" title="Safety Network" body="Verified safe-places map, female pros, real-time alerts." className="col-span-6 md:col-span-4 bg-card border-t-4 border-sage/60" />
            <PillarCard tag="04" eyebrow="Growth" title="Mentorship & Careers" body="Direct access to women leaders who share your lived experience." className="col-span-12 md:col-span-8 bg-muted" />
            <SmallCard title="Travel Sisterhood" body="Global connections for solo voyagers." />
            <SmallCard title="Research Library" body="Peer-reviewed knowledge for women." />
            <SmallCard title="Women's Marketplace" body="Hire women — every craft." />
            <SmallCard title="Mental Wellness" body="AI journal & mood tracking." />
          </div>
        </div>
      </section>

      <section id="dashboard" className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-serif italic mb-6">Your morning at a glance.</h2>
            <p className="text-muted-foreground mb-8 max-w-[48ch] text-pretty">
              The HerSpace dashboard isn't another feed to scroll. It's a mirror for your health, a prompt for your mind, and a doorway to your community.
            </p>
            <ul className="space-y-6">
              <DashItem n={1} title="Cycle insight" body="Energy levels peaking. Ideal time for collaborative work." />
              <DashItem n={2} title="Journal prompt" body="What boundary served you best yesterday?" />
              <DashItem n={3} title="Sister nearby" body="3 verified members responded to your travel question." />
            </ul>
          </div>

          <div className="relative">
            <div className="bg-card rounded-3xl ring-1 ring-border shadow-2xl p-6 md:p-8 md:rotate-2">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-semibold">Good morning, Elena</h3>
                  <p className="text-xs text-muted-foreground">Friday, October 24</p>
                </div>
                <div className="size-10 rounded-full bg-sand ring-1 ring-border" />
              </div>
              <div className="grid gap-4">
                <div className="p-4 rounded-2xl bg-muted">
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Today's cycle</span>
                    <span className="text-[10px] font-semibold text-earth uppercase tracking-widest">Follicular</span>
                  </div>
                  <div className="h-2 bg-background rounded-full"><div className="w-3/4 h-full bg-earth rounded-full" /></div>
                </div>
                <div className="p-4 rounded-2xl ring-1 ring-sage/30 bg-sage/5">
                  <span className="text-[10px] font-semibold text-sage uppercase tracking-widest">Community feed</span>
                  <p className="text-sm text-foreground italic mt-2 font-serif">"Looking for a female-led pediatric practice in Lisbon — just moved here."</p>
                  <p className="text-[10px] text-sage mt-3">3 sisters nearby responded</p>
                </div>
                <div className="p-4 rounded-2xl border border-dashed border-border">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Mentorship suggestion</span>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs font-medium">Sarah M. · Product Design</span>
                    <button className="text-[10px] bg-foreground text-background px-3 py-1 rounded-full">Connect</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute inset-0 bg-earth/10 -z-10 rounded-3xl -rotate-2" />
          </div>
        </div>
      </section>

      <section id="stories" className="py-16 sm:py-24 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-serif italic mb-10 sm:mb-16">Stories from the ecosystem.</h2>
          <div className="grid md:grid-cols-2 gap-8 md:gap-12">
            <Story quote="I finally feel like my health data is mine again. No ads, no selling my cycle trends — just clinical support in a room that feels like home." attr="Lara, New York" />
            <Story quote="The Safety Network helped me when I was stranded in Bogotá. A map of verified safe spots run by other women is a game changer." attr="Maya, London" />
          </div>
        </div>
      </section>

      <footer className="pt-16 sm:pt-24 pb-12 bg-foreground text-background/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between gap-10 md:gap-12 mb-12 sm:mb-16">
            <div className="max-w-xs">
              <span className="font-serif text-3xl italic text-background block mb-6">HerSpace</span>
              <p className="text-sm leading-relaxed">A global collective and digital harbor for every woman's journey.</p>
            </div>
            <div className="flex flex-wrap gap-10 sm:gap-20">
              <FooterCol title="Ecosystem" links={["Health Hub", "Safe Space", "Safety Network", "Mentorship"]} />
              <FooterCol title="Trust" links={["Privacy manifesto", "Verification", "Community rules", "Contact"]} />
            </div>
          </div>
          <div className="pt-8 border-t border-background/10 flex flex-col md:flex-row justify-between gap-6">
            <p className="text-[10px] uppercase tracking-wider leading-loose max-w-[60ch]">
              HerSpace is not a medical provider. The AI assistant is an educational tool and does not replace professional medical advice, diagnosis, treatment, or emergency services.
            </p>
            <p className="text-[10px]">© {new Date().getFullYear()} HerSpace</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TrustDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`size-2 rounded-full ${color}`} />
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-[0.18em]">{label}</span>
    </div>
  );
}

function PillarCard({ tag, eyebrow, title, body, className, big, dark }: { tag: string; eyebrow: string; title: string; body: string; className?: string; big?: boolean; dark?: boolean }) {
  const eyebrowColor = dark ? "text-background/60" : "text-earth";
  const bodyColor = dark ? "text-background/70" : "text-muted-foreground";
  return (
    <div className={`p-8 rounded-3xl ring-1 ring-border flex flex-col justify-between ${className ?? ""}`}>
      <div>
        <span className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${eyebrowColor} mb-3 block`}>{tag}. {eyebrow}</span>
        <h3 className={`${big ? "text-3xl" : "text-2xl"} font-serif italic mb-3`}>{title}</h3>
        <p className={`${bodyColor} max-w-[42ch] text-sm leading-relaxed`}>{body}</p>
      </div>
    </div>
  );
}

function SmallCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="col-span-6 md:col-span-3 p-6 rounded-2xl ring-1 ring-border bg-card/60">
      <h4 className="text-sm font-semibold mb-2">{title}</h4>
      <p className="text-xs text-muted-foreground">{body}</p>
    </div>
  );
}

function DashItem({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="flex gap-4">
      <div className="size-6 rounded-full bg-sand grid place-items-center flex-shrink-0">
        <span className="text-[10px] font-bold text-earth">{n}</span>
      </div>
      <div>
        <h4 className="font-medium text-sm">{title}</h4>
        <p className="text-xs text-muted-foreground">{body}</p>
      </div>
    </li>
  );
}

function Story({ quote, attr }: { quote: string; attr: string }) {
  return (
    <div className="space-y-4">
      <p className="text-xl font-serif italic text-foreground leading-snug">"{quote}"</p>
      <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">{attr}</p>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div className="space-y-4">
      <h5 className="text-xs font-semibold text-background uppercase tracking-widest">{title}</h5>
      <ul className="space-y-2 text-sm">
        {links.map((l) => (
          <li key={l}><a href="#" className="hover:text-background transition-colors">{l}</a></li>
        ))}
      </ul>
    </div>
  );
}
