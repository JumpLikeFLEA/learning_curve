// PII scrubber applied to every Sentry event before it leaves the process
// (client, server and edge init all wire this into `beforeSend`).
//
// Two things must never reach Sentry: the Supabase auth cookies (an `sb-*`
// cookie is a live session — a leaked one is account takeover) and the user's
// email. `sendDefaultPii` is already false in the init, so cookies/headers are
// not attached by default; this is the belt-and-braces second line that also
// covers anything a future integration attaches explicitly.
//
// Kept pure and Sentry-type-free so it can be unit-tested without the SDK — the
// lib/accountExport.ts / lib/feedback.ts split, again.

type ScrubbableEvent = {
  request?: {
    cookies?: unknown;
    headers?: Record<string, unknown>;
    [k: string]: unknown;
  };
  user?: { email?: unknown; ip_address?: unknown; [k: string]: unknown };
  [k: string]: unknown;
};

/**
 * Strips the whole cookie jar (which carries the `sb-*` session), the Cookie /
 * Authorization request headers, and the user's email + IP. Mutates and returns
 * the same object — Sentry's `beforeSend` contract is "return the event or
 * null", and the id/username left on `user` are still useful for grouping.
 *
 * Typed over an unconstrained `T` (with one internal cast) so it accepts
 * Sentry's `ErrorEvent` at the call sites without importing its type here — that
 * keeps this module SDK-free and unit-testable with plain objects.
 */
export function scrubEvent<T extends object>(event: T): T {
  const e = event as ScrubbableEvent;
  if (e.request) {
    delete e.request.cookies;
    const headers = e.request.headers;
    if (headers) {
      for (const key of Object.keys(headers)) {
        const lower = key.toLowerCase();
        if (lower === "cookie" || lower === "authorization" || lower.startsWith("sb-")) {
          delete headers[key];
        }
      }
    }
  }
  if (e.user) {
    delete e.user.email;
    delete e.user.ip_address;
  }
  return event;
}
