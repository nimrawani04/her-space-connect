import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { hasSupabaseBrowserConfig } from "@/integrations/supabase/config";
import { ThemeProvider } from "@/components/theme-provider";
import { registerServiceWorker } from "@/lib/register-sw";
import { AppStartupLoader } from "@/components/AppStartupLoader";
import {
  authLog,
  clearAuthDestination,
  completeAuthRedirect,
  consumeOAuthFragmentSession,
  hasOAuthResponseInUrl,
  hasPendingAuthDestination,
  rememberAuthDestination,
  waitForAuthenticatedUser,
} from "@/lib/auth-redirect";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        name: "google-site-verification",
        content: "oGOJ0z1wlskakHu98YcZhqSidKaPJ_ccEi6oRgJ9G2M",
      },
      { title: "HerSpace — A trusted space for women's health, safety & sisterhood" },
      {
        name: "description",
        content:
          "HerSpace is a dedicated digital ecosystem for AI health insights, anonymous community, mentorship, careers, safety network, and mental wellness.",
      },
      { name: "author", content: "HerSpace" },
      { name: "theme-color", content: "#e9b4c4" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "HerSpace" },
      { name: "mobile-web-app-capable", content: "yes" },
      { property: "og:title", content: "HerSpace — A trusted space for women" },
      { property: "og:site_name", content: "HerSpace" },
      { property: "og:locale", content: "en_US" },
      {
        property: "og:description",
        content: "Health, safety, mentorship and sisterhood — built for privacy and trust.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://her-space-connect.vercel.app/" },
      {
        property: "og:image",
        content: "https://her-space-connect.vercel.app/icon-512.png",
      },
      { property: "og:image:width", content: "512" },
      { property: "og:image:height", content: "512" },
      { property: "og:image:alt", content: "HerSpace" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:image",
        content: "https://her-space-connect.vercel.app/icon-512.png",
      },
      { name: "twitter:site", content: "@HerSpace" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon.png" },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "apple-touch-icon", href: "/app-icon.png" },
      { rel: "apple-touch-icon-precomposed", sizes: "180x180", href: "/apple-touch-icon-precomposed.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..700;1,400..700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    if (!hasSupabaseBrowserConfig() || !hasOAuthResponseInUrl()) return;
    if (window.location.pathname === "/auth/callback") return;

    let cancelled = false;
    const targetDest = "/dashboard";
    rememberAuthDestination(targetDest);
    authLog("root.oauth-fragment-detected", { 
      path: window.location.pathname, 
      savedDestination: targetDest 
    });
    
    void consumeOAuthFragmentSession()
      .then((user) => {
        if (!cancelled && user) {
          authLog("root.oauth-success-redirecting", { destination: targetDest });
          completeAuthRedirect();
        }
      })
      .catch(() => {
        /* Route-level auth handling can still recover if this fallback misses. */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasSupabaseBrowserConfig()) return;

    let redirecting = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") {
        authLog("root.initial-session-handled", { hasSession: Boolean(session) });
        return;
      }
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      
      authLog("root.auth-state-change", { 
        event, 
        path: window.location.pathname, 
        hasSession: Boolean(session) 
      });
      
      router.invalidate();
      
      if (event === "SIGNED_OUT") {
        queryClient.clear();
        clearAuthDestination();
        // Verify before bouncing: a spurious SIGNED_OUT (stale tab, failed
        // background refresh) must not log out a session that still restores.
        void supabase.auth
          .getSession()
          .then(({ data }) => {
            const demoUser =
              typeof window !== "undefined" ? localStorage.getItem("herspace_demo_user") : null;
            if (
              !data.session &&
              !demoUser &&
              !window.location.pathname.startsWith("/auth")
            ) {
              window.location.replace("/auth");
            }
          })
          .catch(() => {
            if (!window.location.pathname.startsWith("/auth")) {
              window.location.replace("/auth");
            }
          });
        return;
      }
      
      queryClient.invalidateQueries();
      
      const isUnauthedPage =
        window.location.pathname === "/" ||
        window.location.pathname === "/auth" ||
        window.location.pathname === "/auth/" ||
        window.location.pathname === "/auth/callback";
      
      authLog("root.checking-redirect", {
        event,
        isUnauthedPage,
        currentPath: window.location.pathname,
        redirecting,
      });
      
      // If signed in and on an unauthed page, redirect to destination
      if (
        (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "USER_UPDATED") &&
        session?.user &&
        isUnauthedPage &&
        !redirecting
      ) {
        redirecting = true;
        authLog("root.forcing-dashboard-redirect", { event, path: window.location.pathname });
        window.setTimeout(() => {
          completeAuthRedirect();
        }, 100);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppStartupLoader />
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <Toaster />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "HerSpace",
              url: "https://her-space-connect.vercel.app/",
              logo: "https://her-space-connect.vercel.app/icon-512.png",
              description:
                "A private, dedicated digital ecosystem for AI health insights, safety network, mentorship, careers, and sisterhood.",
              sameAs: [],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "HerSpace",
              url: "https://her-space-connect.vercel.app/",
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "Who is HerSpace designed for?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "HerSpace is designed as a private sanctuary and supportive network dedicated to women's well-being, safety, and empowerment.",
                  },
                },
                {
                  "@type": "Question",
                  name: "What data does HerSpace collect?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Account data (name, email, profile photo), health data you choose to log, and technical data to operate the service. Personal data is never sold and health content is never used for advertising.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Does HerSpace replace a doctor?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "No. HerSpace content, including AI-generated insights, is educational only and does not replace professional medical advice, diagnosis, or emergency services.",
                  },
                },
                {
                  "@type": "Question",
                  name: "How do I join HerSpace?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Create an account with email or Google sign-in, or explore instantly with guest demo access.",
                  },
                },
              ],
            }),
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
