import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service · HerSpace" },
      {
        name: "description",
        content: "The terms governing your use of HerSpace.",
      },
      { property: "og:url", content: "https://her-space-connect.vercel.app/terms" },
    ],
    links: [{ rel: "canonical", href: "https://her-space-connect.vercel.app/terms" }],
  }),
  component: Terms,
});

function Terms() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-5 py-12 md:py-16 space-y-8">
        <header>
          <Link to="/" className="font-graphik text-[18px] whitespace-nowrap">
            HerSpace
          </Link>
          <p className="text-xs uppercase tracking-[0.2em] text-earth mt-8 mb-2">Legal</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif italic">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mt-2">Last updated: September 2026</p>
        </header>

        <section className="space-y-3">
          <h2 className="font-serif italic text-2xl">The service</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            HerSpace is a women-only digital ecosystem for health insights, community,
            mentorship, careers, safety networking, and mental wellness. Accounts are verified
            to keep the space women-only; misrepresentation may lead to removal.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif italic text-2xl">Not professional advice</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            HerSpace content, including AI-generated insights, is educational only and does not
            replace professional medical advice, diagnosis, legal counsel, or emergency
            services. Always seek qualified professionals for health concerns.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif italic text-2xl">Acceptable use</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Be respectful. No harassment, hate, explicit content involving minors, spam,
            scraping, or attempts to breach other members' privacy or the platform's security.
            Community content must be your own or shared with permission.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif italic text-2xl">Accounts</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You are responsible for activity under your account. You may delete your account at
            any time from Settings; we may suspend accounts that violate these terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif italic text-2xl">Changes</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We may update these terms as HerSpace evolves; material changes will be announced in
            the app. Continued use after changes take effect constitutes acceptance.
          </p>
        </section>
      </div>
    </div>
  );
}
