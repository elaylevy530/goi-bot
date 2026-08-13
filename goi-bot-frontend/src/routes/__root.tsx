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
import { AdminPreviewBanner } from "@/components/AdminPreviewBanner";
import { registerServiceWorker } from "@/lib/pwa";
import { InstallBanner, UpdateBanner } from "@/components/InstallApp";
import { consumeTokenHandoffFromUrl } from "@/lib/token-handoff";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">הדף לא נמצא</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          הדף שחיפשת לא קיים או הועבר.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            חזרה לדף הבית
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
          העמוד לא נטען
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          משהו השתבש. נסה לרענן או חזור לדאשבורד.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            נסה שוב
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            דאשבורד
          </a>
        </div>
      </div>
    </div>
  );
}

const SITE_URL = "https://goi-bot.lovable.app";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#35AD29" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Goi" },
      { title: "Goi — משלוחים והובלות בוואטסאפ בישראל" },
      {
        name: "description",
        content:
          "Goi — הפלטפורמה שמחברת בין לקוחות פרטיים ועסקים לרשת של מאות שליחים ומובילים בישראל. הזמנה, מחיר ותשלום בשיחת וואטסאפ אחת.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
      { name: "googlebot", content: "index, follow" },
      { property: "og:site_name", content: "Goi" },
      { property: "og:locale", content: "he_IL" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Goi — משלוחים והובלות בוואטסאפ" },
      { property: "og:description", content: "רשת של מאות שליחים ומובילים פרטיים בישראל — הכל בשיחת וואטסאפ אחת." },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Goi — משלוחים והובלות בוואטסאפ" },
      { name: "twitter:description", content: "רשת של מאות שליחים ומובילים פרטיים בישראל — הכל בשיחת וואטסאפ אחת." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&family=Rubik:wght@400;500;600;700;800&family=Montserrat:wght@700;800;900&family=Instrument+Serif:ital@0;1&display=swap",
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/pwa-192.png" },
      // Speed up Google Maps load on map screens
      { rel: "preconnect", href: "https://maps.googleapis.com", crossOrigin: "" },
      { rel: "preconnect", href: "https://maps.gstatic.com", crossOrigin: "" },
      { rel: "dns-prefetch", href: "https://maps.googleapis.com" },
      { rel: "dns-prefetch", href: "https://maps.gstatic.com" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Goi",
          url: SITE_URL,
          logo: `${SITE_URL}/pwa-512.png`,
          sameAs: [] as string[],
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            areaServed: "IL",
            availableLanguage: ["he", "en"],
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Goi",
          url: SITE_URL,
          inLanguage: "he-IL",
          potentialAction: {
            "@type": "SearchAction",
            target: `${SITE_URL}/blog?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }),
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
    <html lang="he" dir="rtl">
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

  useEffect(() => {
    consumeTokenHandoffFromUrl();
    registerServiceWorker();
    const onError = (e: ErrorEvent) => {
      // eslint-disable-next-line no-console
      console.error("[window.onerror]", e.error || e.message);
      reportLovableError(e.error ?? new Error(String(e.message)), { boundary: "window_onerror" });
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      // eslint-disable-next-line no-console
      console.error("[unhandledrejection]", e.reason);
      const err = e.reason instanceof Error ? e.reason : new Error(String(e.reason));
      reportLovableError(err, { boundary: "unhandled_rejection" });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AdminPreviewBanner />
      <Outlet />
      <Toaster position="top-center" richColors />
      <UpdateBanner />
      <InstallBanner />
    </QueryClientProvider>
  );
}
