import type { MetadataRoute } from "next";

// The public, indexable pages. Signed-in surfaces are deliberately absent.
export default function sitemap(): MetadataRoute.Sitemap {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL || "https://marginalia-ivory.vercel.app";

  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/discover`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/books`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/rooms`, changeFrequency: "daily", priority: 0.6 },
    { url: `${base}/signup`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/login`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
