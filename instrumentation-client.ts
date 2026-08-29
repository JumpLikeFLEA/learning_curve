// Client-side instrumentation — runs before the app becomes interactive.
// Initialises the browser Sentry client (inert without a DSN, production-only)
// and exports onRouterTransitionStart so Sentry can trace App Router
// navigations.
import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentryScrub";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  beforeSend: (event) => scrubEvent(event),
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
