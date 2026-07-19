import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL || "https://marginalia-ivory.vercel.app";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Personal, session-bound surfaces stay out of the index.
      disallow: [
        "/settings",
        "/notifications",
        "/welcome",
        "/reset",
        "/drafts",
        "/saved",
        "/asks",
        "/auth",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
