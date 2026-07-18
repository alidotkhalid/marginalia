/** @type {import('tailwindcss').Config} */
// -----------------------------------------------------------------------------
// "Dark Academia" theme — a warm near-black canvas, dark walnut cards, cream
// text, and aged-gold (brass) accents with a modern touch: clean Inter sans for
// body/UI, elegant Playfair Display serif for names/titles. No image uploads;
// avatars are generated pixel-art identicons.
// -----------------------------------------------------------------------------
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Canvas + deep surfaces / primary buttons (deep forest black)
        forest: {
          deep: "#0b0f0c",
          dark: "#0F1310", // page background
          DEFAULT: "#232d25", // primary buttons, placeholders
          light: "#2e3a30", // hover
        },
        // Card / tab surfaces, one step above the canvas
        parchment: {
          DEFAULT: "#161C17",
          light: "#1c231d", // inputs / raised surfaces
          dark: "#27302a", // borders
        },
        // Text on cards (warm cream)
        ink: {
          DEFAULT: "#e8dcbd",
          soft: "#c1b291",
          faint: "#8c7e62",
        },
        // Text on the canvas
        cream: {
          DEFAULT: "#ecdfc0",
          soft: "#b2a483",
        },
        // Aged gold — headings, links, progress, highlights
        brass: {
          DEFAULT: "#c9a44f",
          light: "#ddba6c",
          dark: "#a8842f",
        },
        // Warm terracotta red — sparing accent (errors, block, hearts)
        oxblood: {
          DEFAULT: "#a24a3d",
          light: "#bd5e4f",
        },
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ['"Playfair Display"', "Georgia", "serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      maxWidth: {
        prose: "44rem",
        shell: "72rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.35), 0 10px 28px rgba(0,0,0,0.35)",
        soft: "0 1px 3px rgba(0,0,0,0.3)",
      },
      borderRadius: {
        card: "14px",
        pill: "9999px",
      },
      backgroundImage: {
        "shelf": "linear-gradient(135deg, #1a1610 0%, #4a3826 50%, #c9a44f 100%)",
      },
      keyframes: {
        spin: { to: { transform: "rotate(360deg)" } },
      },
    },
  },
  plugins: [],
};
