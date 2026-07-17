// The 30 Marginaly avatars (PNGs in /public/avatars). Each id matches its file
// name (without extension). `avatar_icon` on a profile stores the chosen id.

export const AVATARS: { id: string; label: string }[] = [
  { id: "01-deep-diver", label: "Deep Diver" },
  { id: "02-mood-reader", label: "Mood Reader" },
  { id: "03-close-reader", label: "Close Reader" },
  { id: "04-place-keeper", label: "Place Keeper" },
  { id: "05-midnight-oil", label: "Midnight Oil" },
  { id: "06-margin-scribbler", label: "Margin Scribbler" },
  { id: "07-slow-sipper", label: "Slow Sipper" },
  { id: "08-one-more-chapter", label: "One More Chapter" },
  { id: "09-drafting-type", label: "Drafting Type" },
  { id: "10-night-owl", label: "Night Owl" },
  { id: "11-binge-reader", label: "Binge Reader" },
  { id: "12-plot-detective", label: "Plot Detective" },
  { id: "13-annotator", label: "Annotator" },
  { id: "14-book-club-host", label: "Book Club Host" },
  { id: "15-comfort-reader", label: "Comfort Reader" },
  { id: "16-world-traveler", label: "World Traveler" },
  { id: "17-pen-pal", label: "Pen Pal" },
  { id: "18-classicist", label: "Classicist" },
  { id: "19-deadline-reader", label: "Deadline Reader" },
  { id: "20-audiobook-devotee", label: "Audiobook Devotee" },
  { id: "21-cozy-critic", label: "Cozy Critic" },
  { id: "22-collector", label: "Collector" },
  { id: "23-insomniac", label: "Insomniac" },
  { id: "24-daydreamer", label: "Daydreamer" },
  { id: "25-note-taker", label: "Note Taker" },
  { id: "26-mystery-buff", label: "Mystery Buff" },
  { id: "27-scifi-scout", label: "Sci-Fi Scout" },
  { id: "28-fantasy-fiend", label: "Fantasy Fiend" },
  { id: "29-lap-warmer", label: "Lap Warmer" },
  { id: "30-cottage-core", label: "Cottage Core" },
];

export const AVATAR_ICON_IDS = AVATARS.map((a) => a.id);

const IDS = new Set(AVATAR_ICON_IDS);

export function isAvatarIcon(id: string): boolean {
  return IDS.has(id);
}

export function avatarLabel(id: string): string {
  return AVATARS.find((a) => a.id === id)?.label ?? id;
}
