"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Avatar } from "./Avatar";
import { coverUrl } from "@/lib/openlibrary";
import {
  roomGenreLabel,
  roomModeLabel,
  isFictionGenre,
  isNonfictionGenre,
  ROOM_GENRES,
} from "@/lib/rooms";

export type RoomCard = {
  id: string;
  name: string;
  genre: string;
  mode: string;
  readers: number;
  live: boolean;
  avgMinutes: number;
  /** Covers of the books being read here, for the little stack. */
  covers: { id: number | null; title: string }[];
  /** Everyone seen here recently, for the avatar row. */
  people: { name: string; icon: string | null }[];
  /** Book + reader names, so search can reach them. */
  haystack: string;
};

type Filter = "all" | "quiet" | "sprints" | "open-now" | "fiction" | "nonfiction";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All rooms" },
  { key: "quiet", label: "Quiet" },
  { key: "sprints", label: "Sprints" },
  { key: "open-now", label: "Open now" },
  { key: "fiction", label: "Fiction" },
  { key: "nonfiction", label: "Nonfiction" },
];

export function RoomsBrowser({ rooms }: { rooms: RoomCard[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [genre, setGenre] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rooms.filter((r) => {
      if (q && !r.haystack.includes(q)) return false;
      if (genre && r.genre !== genre) return false;
      switch (filter) {
        case "quiet":
          return r.mode === "quiet";
        case "sprints":
          return r.mode === "sprints";
        case "open-now":
          return r.live;
        case "fiction":
          return isFictionGenre(r.genre);
        case "nonfiction":
          return isNonfictionGenre(r.genre);
        default:
          return true;
      }
    });
  }, [rooms, query, filter, genre]);

  const readingNow = rooms.reduce((n, r) => n + r.readers, 0);

  return (
    <div className="space-y-6">
      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search rooms, books, readers…"
          className="input w-full sm:w-72"
        />

        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`profile-tab ${filter === f.key ? "profile-tab-active" : ""}`}
          >
            {f.label}
          </button>
        ))}

        <span className="relative inline-flex items-center">
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            aria-label="Genre"
            className="appearance-none rounded-pill border border-parchment-dark bg-transparent py-2 pl-4 pr-8 text-sm text-ink-soft focus:border-brass focus:outline-none"
          >
            <option value="">Any genre</option>
            {ROOM_GENRES.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 text-[9px] text-ink-faint">
            ▼
          </span>
        </span>

        <span className="ml-auto font-mono text-xs text-ink-faint">
          {rooms.length} {rooms.length === 1 ? "room" : "rooms"} · {readingNow}{" "}
          reading now
        </span>
      </div>

      {shown.length === 0 ? (
        <div className="card p-8 text-center text-ink-faint">
          No rooms match. Try another filter, or open one of your own.
        </div>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {shown.map((r) => (
            <li key={r.id}>
              <Link
                href={`/rooms/${r.id}`}
                className="card block p-5 no-underline transition-colors hover:border-brass/40"
              >
                {/* The stack of books being read here */}
                <div className="flex h-[72px] items-end">
                  {r.covers.slice(0, 4).map((c, i) => (
                    <span
                      key={i}
                      className="h-[72px] w-12 shrink-0 overflow-hidden rounded-[3px] shadow-card ring-1 ring-black/40"
                      style={{ marginLeft: i === 0 ? 0 : -14, zIndex: 10 - i }}
                    >
                      {c.id ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={coverUrl(c.id, "M") ?? ""}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-forest px-1 text-center font-display text-[9px] leading-tight text-cream">
                          {c.title}
                        </span>
                      )}
                    </span>
                  ))}
                  {r.covers.length === 0 && (
                    <span className="h-[72px] w-12 rounded-[3px] border border-dashed border-parchment-dark" />
                  )}
                </div>

                <h2 className="mt-4 flex items-center gap-2 font-display text-2xl font-semibold text-ink">
                  {r.name}
                  {r.live && (
                    <span
                      className="inline-block h-2 w-2 rounded-pill bg-brass"
                      title="Someone is reading here now"
                    />
                  )}
                </h2>
                <p className="mt-1 font-mono text-xs text-brass/80">
                  {roomModeLabel(r.mode)} · {roomGenreLabel(r.genre)}
                </p>

                <hr className="my-4 border-0 border-t border-white/[0.06]" />

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex">
                      {r.people.slice(0, 3).map((p, i) => (
                        <span
                          key={i}
                          style={{ marginLeft: i === 0 ? 0 : -8 }}
                          className="ring-2 ring-[#161C17] rounded-[15%]"
                        >
                          <Avatar name={p.name} icon={p.icon} size={24} />
                        </span>
                      ))}
                      {r.people.length > 3 && (
                        <span className="ml-1 self-center font-mono text-[11px] text-ink-faint">
                          +{r.people.length - 3}
                        </span>
                      )}
                    </span>
                    <span className="text-sm text-ink-soft">
                      {r.readers > 0
                        ? `${r.readers} reading now`
                        : "quiet right now"}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-ink-faint">
                    {r.avgMinutes > 0 ? `${r.avgMinutes} min avg` : "new room"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
