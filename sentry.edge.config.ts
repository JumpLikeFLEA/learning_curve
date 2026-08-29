// Sentry init for the Edge runtime (proxy.ts and any edge route handlers).
// Loaded by instrumentation.ts's register() when NEXT_RUNTIME === "edge".
// Same inert-without-DSN, production-only posture as the server config.
import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentryScrub";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  beforeSend: (event) => scrubEvent(event),
});
