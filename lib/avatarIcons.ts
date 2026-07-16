// Original 7×7 pixel-art emblems users can pick as their avatar (instead of the
// auto-generated identicon). Each is a hand-drawn bitmap ('#' = filled cell)
// plus a color. Designs are original to this app.

export type AvatarIcon = { color: string; grid: string[] };

export const AVATAR_ICONS: Record<string, AvatarIcon> = {
  heart: {
    color: "#a24a3d",
    grid: [".##.##.", "#######", "#######", "#######", ".#####.", "..###..", "...#..."],
  },
  gem: {
    color: "#6f86a8",
    grid: ["...#...", "..###..", ".#####.", "#######", ".#####.", "..###..", "...#..."],
  },
  moon: {
    color: "#c9a44f",
    grid: ["..###..", ".##....", "##.....", "##.....", "##.....", ".##....", "..###.."],
  },
  book: {
    color: "#b5643c",
    grid: [".......", "##.#.##", "#..#..#", "#..#..#", "#..#..#", "##.#.##", "......."],
  },
  leaf: {
    color: "#7d9471",
    grid: ["......#", "....###", "..#####", ".#####.", "#####..", ".###...", ".#....."],
  },
  cat: {
    color: "#9c6f8f",
    grid: ["#.....#", "##...##", "#######", "#.#.#.#", "#######", ".#####.", ".#...#."],
  },
  sun: {
    color: "#c98a3c",
    grid: ["#..#..#", ".#.#.#.", "..###..", ".#####.", "..###..", ".#.#.#.", "#..#..#"],
  },
  flower: {
    color: "#4f8a86",
    grid: ["..#.#..", ".#####.", ".#####.", "..###..", "...#...", "...#...", ".#####."],
  },
};

export const AVATAR_ICON_IDS = Object.keys(AVATAR_ICONS);

export function isAvatarIcon(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(AVATAR_ICONS, id);
}
