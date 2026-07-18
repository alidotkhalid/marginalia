"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRoom } from "@/app/actions";
import { ROOM_GENRES, ROOM_MODES, MIXED } from "@/lib/rooms";
import { Spinner } from "./Spinner";

// Naming a room opens a short panel: which genre is read here, and how the room
// runs. Genre is what lets other readers find the room.
export function CreateRoomForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [genre, setGenre] = useState(MIXED);
  const [mode, setMode] = useState("quiet");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const open = name.trim().length > 0;

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createRoom(name, genre, mode);
      if (res.error) setError(res.error);
      else if (res.id) router.push(`/rooms/${res.id}`);
    });
  }

  return (
    <div className="w-full sm:w-auto">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 60))}
          placeholder="Name a new room…"
          className="input w-full sm:w-64"
        />
        <button
          onClick={submit}
          disabled={pending || !open}
          className="btn-accent shrink-0"
        >
          {pending && <Spinner inline />}
          Open a room
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-3 rounded-card border border-parchment-dark bg-parchment-light p-3">
          <div>
            <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-ink-faint">
              What is read here
            </label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="input py-2"
            >
              {ROOM_GENRES.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {g.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-faint">
              Pick Mixed genres if the room reads a bit of everything.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-ink-faint">
              How it runs
            </label>
            <div className="flex flex-wrap gap-2">
              {ROOM_MODES.map((m) => (
                <button
                  key={m.slug}
                  type="button"
                  onClick={() => setMode(m.slug)}
                  title={m.blurb}
                  className={`rounded-pill border px-3 py-1.5 text-sm transition-colors ${
                    mode === m.slug
                      ? "border-brass/40 bg-brass/15 text-brass"
                      : "border-parchment-dark text-ink-soft hover:text-ink"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-oxblood">{error}</p>}
    </div>
  );
}
