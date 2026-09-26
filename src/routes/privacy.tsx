import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · HerSpace" },
      {
        name: "description",
        content: "How HerSpace collects, uses, and protects your data.",
      },
      { property: "og:url", content: "https://her-space-connect.vercel.app/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://her-space-connect.vercel.app/privacy" }],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-5 py-12 md:py-16 space-y-8">
        <header>
          <Link to="/" className="font-graphik text-[18px] whitespace-nowrap">
            HerSpace
          </Link>
          <p className="text-xs uppercase tracking-[0.2em] text-earth mt-8 mb-2">Legal</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif italic">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mt-2">Last updated: September 2026</p>
        </header>

        <section className="space-y-3">
          <h2 className="font-serif italic text-2xl">What we collect</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Account data (name, email, profile photo) provided directly or via Google sign-in
            (basic profile: name, email address, profile picture). Health and wellness data you
            choose to log (cycle, symptoms, journal entries, community posts). Technical data
            needed to operate the service (authentication tokens, stored securely by our
            infrastructure provider Supabase).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif italic text-2xl">How we use it</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            To provide your account, personalize health insights, operate community and safety
            features, and keep the women-only space verified. We never sell your personal data
            and never use health journal content for advertising.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif italic text-2xl">Sharing</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Data is processed by our infrastructure providers (hosting, database, authentication)
            solely to operate HerSpace. Community posts you mark public are visible to other
            verified members. We disclose data only when required by law.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif italic text-2xl">Google sign-in data</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            When you choose Google sign-in, we receive your name, email address, and profile
            picture from Google (openid, email, and profile scopes) and use them only to create
            and secure your HerSpace account. HerSpace's use of Google user data adheres to the
            Google API Services User Data Policy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif italic text-2xl">Your rights</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You may request access, correction, export, or deletion of your data at any time via
            Settings or by contacting support. Deleting your account removes your profile and
            personal content.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-serif italic text-2xl">Contact</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Questions about this policy: contact us through the app or at the support email
            listed on our Google OAuth consent screen.
          </p>
        </section>
      </div>
    </div>
  );
}
