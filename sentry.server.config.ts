// Sentry init for the Node.js server runtime. Loaded by instrumentation.ts's
// register() when NEXT_RUNTIME === "nodejs".
//
// Inert without NEXT_PUBLIC_SENTRY_DSN (Sentry.init with no dsn disables the
// client), and only enabled in production, so local dev and CI stay silent.
import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentryScrub";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",
  // Never attach cookies, headers or IPs by default; scrubEvent is the second
  // line for anything attached explicitly downstream.
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  beforeSend: (event) => scrubEvent(event),
});
