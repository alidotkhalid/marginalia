// Builds a CSS background for the profile banner from a user's accent color and
// chosen banner style. Pure CSS — no images are ever uploaded or stored.

export const BANNER_STYLES = [
  { id: "gradient", label: "Gradient" },
  { id: "shelf", label: "Forest" },
  { id: "marble", label: "Marble" },
  { id: "plain", label: "Solid" },
] as const;

export function bannerBackground(accent: string, style: string): string {
  // `${accent}xx` appends an alpha channel (8-digit hex) for translucency.
  switch (style) {
    case "plain":
      return accent;
    case "shelf":
      return "linear-gradient(135deg, #233829 0%, #3d5f4c 45%, #8f7539 100%)";
    case "marble":
      return `radial-gradient(circle at 25% 15%, rgba(255,255,255,0.35), transparent 45%), linear-gradient(135deg, ${accent} 0%, ${accent}99 100%)`;
    case "gradient":
    default:
      return `linear-gradient(135deg, ${accent} 0%, ${accent}bb 55%, #b1934f 100%)`;
  }
}
