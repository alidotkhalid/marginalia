import Link from "next/link";

// The "a room is live right now" bar that sits above the feed.
export function RoomLiveBar({
  room,
}: {
  room: { id: string; name: string; readers: number } | null;
}) {
  if (!room) {
    return (
      <Link
        href="/rooms"
        className="card flex items-center justify-between px-5 py-3.5 no-underline transition-colors hover:border-brass/40"
      >
        <span className="flex items-center gap-3 text-sm text-ink-soft">
          <span className="inline-block h-2 w-2 rounded-pill bg-ink-faint/50" />
          No rooms open. Start a quiet one.
        </span>
        <span className="btn-ghost !py-1.5 text-sm">Open a room</span>
      </Link>
    );
  }

  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
      <span className="flex items-center gap-3 text-sm">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-pill bg-brass opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-pill bg-brass" />
        </span>
        <span className="text-ink-soft">
          Room live: <span className="font-semibold text-ink">{room.name}</span>
        </span>
        <span className="text-ink-faint">
          {room.readers} reading quietly
        </span>
      </span>
      <Link href={`/rooms/${room.id}`} className="btn-ghost !py-1.5 text-sm">
        Join room
      </Link>
    </div>
  );
}
