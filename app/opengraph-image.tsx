import { ImageResponse } from "next/og";
import { BRAND, BRAND_ACCENT, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

// Social share card (OpenGraph + Twitter both read this). The brand gradient,
// the graduation-cap mark and the wordmark — the same identity as the app,
// generated so it never drifts from the brand colours.
export const alt = "Colloquiz — test your knowledge with interactive quizzes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          background: `linear-gradient(135deg, ${BRAND}, ${BRAND_ACCENT})`,
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 160,
            height: 160,
            borderRadius: 36,
            background: "rgba(255,255,255,0.14)",
          }}
        >
          <svg
            width="96"
            height="96"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
            <path d="M22 10v6" />
            <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
          </svg>
        </div>
        <div style={{ display: "flex", fontSize: 84, fontWeight: 700, letterSpacing: -2 }}>
          {SITE_NAME}
        </div>
        <div style={{ display: "flex", fontSize: 34, opacity: 0.9 }}>
          {SITE_DESCRIPTION}
        </div>
      </div>
    ),
    { ...size },
  );
}
