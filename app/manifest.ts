import type { MetadataRoute } from "next";

// Installable web app: Add to Home Screen gives Marginaly its own icon and a
// standalone window, no browser chrome.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Marginaly",
    short_name: "Marginaly",
    description:
      "A distraction-free, text-first social network for book lovers.",
    start_url: "/",
    display: "standalone",
    background_color: "#0F1310",
    theme_color: "#0F1310",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
