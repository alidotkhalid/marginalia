/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Book cover art is served by the Open Library covers CDN only.
    // No user uploads are ever permitted, by design.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "covers.openlibrary.org",
      },
    ],
  },

  // Security headers on every response.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // No one may frame the site: blocks clickjacking of one-click
          // actions (follow, block, delete, join room).
          { key: "X-Frame-Options", value: "DENY" },
          // Browsers must trust our Content-Type, not sniff their own.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Outbound links learn our origin, never full URLs.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // We use none of these; say so explicitly.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          // Always HTTPS, remembered for a year.
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
