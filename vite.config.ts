// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_HOST = SUPABASE_URL ? new URL(SUPABASE_URL).host : "";
const CACHEABLE_TABLES = [
  "library_articles",
  "community_posts",
  "health_resources",
  "health_articles",
  "cycle_phases",
];

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        devOptions: { enabled: false },
        manifest: false,
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,ico,webp,woff2}"],
          // Heavy, rarely used export libraries (PDF/canvas) stay out of the
          // install-time precache — they are fetched and runtime-cached on first use.
          globIgnores: [
            "**/jspdf*.js",
            "**/html2canvas*.js",
            "**/canvg*.js",
            "**/purify.es-*.js",
            "**/index.es-*.js",
          ],
          navigateFallback: "/",
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//, /^\/auth\/callback/],
          additionalManifestEntries: [
            { url: "/", revision: null },
            { url: "/dashboard", revision: Date.now().toString() },
            { url: "/health", revision: Date.now().toString() },
            { url: "/community", revision: Date.now().toString() },
            { url: "/wellness", revision: Date.now().toString() },
            { url: "/safety", revision: Date.now().toString() },
            { url: "/mentorship", revision: Date.now().toString() },
            { url: "/careers", revision: Date.now().toString() },
            { url: "/library", revision: Date.now().toString() },
            { url: "/marketplace", revision: Date.now().toString() },
          ],
          runtimeCaching: [
            {
              urlPattern: ({ request, sameOrigin }) =>
                sameOrigin && request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "herspace-pages",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
            {
              urlPattern: ({ url, sameOrigin }) =>
                sameOrigin && /\.(?:js|css|woff2|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname),
              handler: "CacheFirst",
              options: {
                cacheName: "herspace-assets",
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: ({ url }) => url.origin === "https://fonts.gstatic.com",
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts",
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              // Supabase REST reads for public list endpoints (Health / Community / Library).
              urlPattern: ({ url, request }) =>
                !!SUPABASE_HOST &&
                url.host === SUPABASE_HOST &&
                url.pathname.startsWith("/rest/v1/") &&
                request.method === "GET" &&
                CACHEABLE_TABLES.some((t) => url.pathname.startsWith(`/rest/v1/${t}`)),
              handler: "StaleWhileRevalidate",
              method: "GET",
              options: {
                cacheName: "herspace-api",
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
                cacheableResponse: { statuses: [0, 200] },
                matchOptions: { ignoreSearch: false },
              },
            },
            {
              // Supabase Storage: images & file attachments referenced by
              // Community posts and Library articles (public + signed URLs).
              urlPattern: ({ url, request }) =>
                !!SUPABASE_HOST &&
                url.host === SUPABASE_HOST &&
                request.method === "GET" &&
                (url.pathname.startsWith("/storage/v1/object/public/") ||
                  url.pathname.startsWith("/storage/v1/object/sign/") ||
                  url.pathname.startsWith("/storage/v1/render/image/public/") ||
                  url.pathname.startsWith("/storage/v1/render/image/sign/")),
              handler: "CacheFirst",
              method: "GET",
              options: {
                cacheName: "herspace-media",
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
                rangeRequests: true,
              },
            },
            {
              // Cross-origin images/media embedded in posts and articles
              // (e.g. uploaded to a CDN or linked from external sources).
              urlPattern: ({ url, request, sameOrigin }) =>
                !sameOrigin &&
                url.host !== SUPABASE_HOST &&
                url.origin !== "https://fonts.gstatic.com" &&
                (request.destination === "image" ||
                  request.destination === "video" ||
                  request.destination === "audio"),
              handler: "StaleWhileRevalidate",
              method: "GET",
              options: {
                cacheName: "herspace-remote-media",
                expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
  },
});
