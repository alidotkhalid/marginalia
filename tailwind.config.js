/** @type {import('tailwindcss').Config} */
// -----------------------------------------------------------------------------
// "Academia" theme — a muted, scholarly palette meant to evoke aged paper,
// library leather, and printed type. No neon, no gradients, no glassmorphism.
// -----------------------------------------------------------------------------
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds — parchment / aged paper
        parchment: {
          DEFAULT: "#f4efe1", // primary page background
          light: "#faf6ec",   // cards, index-card surfaces
          dark: "#e7ddc7",     // subtle borders / hover fills
        },
        // Ink — charcoal for body text, near-black for headings
        ink: {
          DEFAULT: "#2b2723", // body copy
          soft: "#4d463d",     // secondary text
          faint: "#7a7062",    // captions, metadata
        },
        // Deep forest green — primary accent (links, active states)
        forest: {
          DEFAULT: "#2f4a3c",
          light: "#3d5f4c",
          dark: "#233829",
        },
        // Rich mahogany — secondary accent / borders
        mahogany: {
          DEFAULT: "#5a3825",
          light: "#7a4f38",
        },
        // Oxblood red — sparing highlight (errors, "reading now" tag)
        oxblood: {
          DEFAULT: "#6d2130",
          light: "#8a3040",
        },
        // Aged brass — subtle metallic detail for dividers / rules
        brass: "#9c8850",
      },
      fontFamily: {
        // Display serif for headings — high contrast, printed-book feel
        display: ['"Playfair Display"', "Georgia", "serif"],
        // Readable body serif for long-form text
        serif: ['"EB Garamond"', '"Merriweather"', "Georgia", "serif"],
        // Mono for metadata / character counters (typewriter nod)
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      maxWidth: {
        prose: "42rem", // constrain line length for readability
      },
      boxShadow: {
        // Soft, paper-like lift — never a hard modern drop shadow
        card: "0 1px 2px rgba(43, 39, 35, 0.06), 0 4px 12px rgba(43, 39, 35, 0.05)",
      },
      borderRadius: {
        card: "3px", // crisp, near-square edges like an index card
      },
    },
  },
  plugins: [],
};
