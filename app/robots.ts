import type { MetadataRoute } from "next";

/**
 * 1.0 launches "public but unlisted" — signups are open, but the app must not
 * be indexed (locked decision, DoR). A blanket disallow keeps every route out
 * of search results; there is deliberately no sitemap for the same reason.
 *
 * NOTE: `/robots.txt` must be allow-listed in proxy.ts `publicRoutes`, or the
 * unauthenticated proxy bounces it to /login and crawlers never see the rule.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
