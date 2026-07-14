/** @type {import('tailwindcss').Config} */
// -----------------------------------------------------------------------------
// "Deep Green Academia" theme — a rich forest-green canvas with cream/parchment
// cards floating on top, brass and oxblood accents, and a modern touch:
// clean Inter sans for UI/body, elegant Playfair Display serif for names/titles.
// No user image uploads; book covers come only from Open Library.
// -----------------------------------------------------------------------------
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // The page canvas — deep forest green
        forest: {
          DEFAULT: "#2f4a3c",
          light: "#3d5f4c",
          dark: "#233829", // primary page background
          deep: "#1c2c22",
        },
        // Cards / surfaces — warm parchment cream
        parchment: {
          DEFAULT: "#f6f1e7",
          light: "#fbf8f0",
          dark: "#e9e0cd", // borders / subtle fills
        },
        // Ink — text on cream cards
        ink: {
          DEFAULT: "#2b2723",
          soft: "#4d463d",
          faint: "#8a8073",
        },
        // Cream — text on the green canvas
        cream: {
          DEFAULT: "#f4efe1",
          soft: "#d6cdb8",
        },
        // Aged brass — primary metallic accent (links, progress, highlights)
        brass: {
          DEFAULT: "#b1934f",
          light: "#c7ab6e",
          dark: "#8f7539",
        },
        // Oxblood — sparing warm accent (reading tag, hearts)
        oxblood: {
          DEFAULT: "#7c2d3a",
          light: "#9a3c4b",
        },
      },
      fontFamily: {
        // Instagram-style clean sans for body & UI
        sans: ['"Inter"', "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        // Elegant serif for names & section titles
        display: ['"Playfair Display"', "Georgia", "serif"],
        // Small meta / counters
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      maxWidth: {
        prose: "44rem",
        shell: "72rem", // wide dashboard shell for the two-column profile
      },
      boxShadow: {
        card: "0 1px 2px rgba(20, 30, 24, 0.10), 0 8px 24px rgba(20, 30, 24, 0.12)",
        soft: "0 1px 3px rgba(20, 30, 24, 0.08)",
      },
      borderRadius: {
        card: "14px",
        pill: "9999px",
      },
      backgroundImage: {
        // A subtle brass→forest banner used behind profile headers (no photos)
        "shelf": "linear-gradient(135deg, #233829 0%, #3d5f4c 45%, #8f7539 100%)",
      },
    },
  },
  plugins: [],
};
