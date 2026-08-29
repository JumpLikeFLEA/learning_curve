// Server-side instrumentation entry point. register() runs once per runtime at
// startup; it loads the matching Sentry init so the Node and Edge runtimes each
// get their own client. onRequestError forwards uncaught request errors (from
// Server Components, route handlers, etc.) to Sentry.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
