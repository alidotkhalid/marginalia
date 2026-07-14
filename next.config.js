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
};

module.exports = nextConfig;
