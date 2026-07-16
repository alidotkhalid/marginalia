import { AVATAR_ICONS } from "@/lib/avatarIcons";

// Avatar: renders a chosen pixel-art preset icon if the user picked one,
// otherwise a unique pixel identicon generated from their name. No uploads.

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

// Cells for a symmetric 5×5 identicon derived from the name.
function identiconCells(seed: number): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      if ((seed >> (y * 3 + x)) & 1) {
        cells.push({ x, y });
        if (x < 2) cells.push({ x: 5 - 1 - x, y });
      }
    }
  }
  return cells;
}

// Cells for a chosen 7×7 preset icon.
function iconCells(grid: string[]): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === "#") cells.push({ x, y });
    }
  });
  return cells;
}

export function Avatar({
  name,
  icon,
  size = 48,
  className = "",
}: {
  name: string;
  icon?: string | null;
  size?: number;
  className?: string;
}) {
  const preset = icon ? AVATAR_ICONS[icon] : undefined;
  const grid = preset ? 7 : 5;
  const cells = preset
    ? iconCells(preset.grid)
    : identiconCells(hashString(name || "?"));
  const fg = preset ? preset.color : PALETTE[hashString(name || "?") % PALETTE.length];
  const bg = "#191309";

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
