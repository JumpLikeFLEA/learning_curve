// Canonical site identity, shared by the root metadata and the generated
// OpenGraph / icon images. Pure and dependency-free.

/**
 * The production origin. Overridable for preview deployments via
 * NEXT_PUBLIC_SITE_URL; falls back to the known production domain so a build
 * without the env var still emits absolute, correct OG/canonical URLs.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://colloquiz.app";

export const SITE_NAME = "Colloquiz";
export const SITE_DESCRIPTION = "Test your knowledge with interactive quizzes";

// The brand gradient stops (globals.css --brand → --brand-accent). Repeated as
// literals here because the OG/icon images render in an isolated Satori context
// with no access to CSS custom properties.
export const BRAND = "#4f46e5";
export const BRAND_ACCENT = "#7c3aed";
