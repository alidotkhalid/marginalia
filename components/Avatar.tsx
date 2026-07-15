// Pixel-art identicon avatar. Every reader gets a unique, symmetric blocky
// emblem generated deterministically from their name — no uploads, no storage.
// Original algorithmic art (a hash → 5×5 mirrored grid), in an academia palette.

// A small curated palette of warm academia foreground colors.
const PALETTE = [
  "#c9a44f", // aged gold
  "#b5643c", // rust
  "#7d9471", // sage
  "#4f8a86", // verdigris
  "#9c6f8f", // plum
  "#c98a3c", // ochre
  "#a24a3d", // terracotta
  "#6f86a8", // dusk blue
];

// FNV-1a hash → unsigned 32-bit.
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function Avatar({
  name,
  size = 48,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const seed = hashString(name || "?");
  const grid = 5;
  const fg = PALETTE[seed % PALETTE.length];
  const bg = "#191309";

  // Build a symmetric pattern: decide the left 3 columns, mirror to the right.
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < 3; x++) {
      const on = (seed >> (y * 3 + x)) & 1;
      if (on) {
        cells.push({ x, y });
        if (x < 2) cells.push({ x: grid - 1 - x, y });
      }
    }
  }

  return (
    <span
      className={`avatar ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${name}'s avatar`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${grid} ${grid}`}
        shapeRendering="crispEdges"
      >
        <rect width={grid} height={grid} fill={bg} />
        {cells.map((c, i) => (
          <rect key={i} x={c.x} y={c.y} width={1} height={1} fill={fg} />
        ))}
      </svg>
    </span>
  );
}
