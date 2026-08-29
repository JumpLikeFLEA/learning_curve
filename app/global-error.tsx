"use client";

/**
 * Last-resort boundary. This replaces the ROOT layout when an error is thrown
 * in the root layout itself (or before any nested boundary can catch it), so it
 * must render its own <html> and <body> — none of the app shell, ThemeProvider,
 * or globals.css is available here. Styling is therefore inline and
 * theme-neutral: a boundary that depends on the thing that just failed to boot
 * is no boundary at all.
 *
 * Every nested route already has a closer boundary ((main)/error.tsx,
 * (auth)/error.tsx); this only fires for the truly catastrophic case.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 8px" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#475569", margin: "0 0 20px", lineHeight: 1.5 }}>
            An unexpected error stopped the page from loading. Try again — if it
            keeps happening, please let us know.
          </p>
          {error?.digest && (
            <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "0 0 20px", fontFamily: "ui-monospace, monospace" }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              borderRadius: "12px",
              border: "none",
              background: "#4f46e5",
              color: "#ffffff",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
