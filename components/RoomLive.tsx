"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  joinRoom,
  touchPresence,
  leaveRoom,
  updateRoomPage,
  startTimer,
  stopTimer,
  deleteRoom,
} from "@/app/actions";
import { roomGenreLabel, roomModeLabel } from "@/lib/rooms";
import { Avatar } from "./Avatar";
import { BookCover } from "./BookCover";
import { InviteReader } from "./InviteReader";

export type RoomParticipant = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_icon: string | null;
  book_title: string | null;
  book_cover_id: number | null;
  current_page: number;
  /** Percent through their current book, from their profile. */
  progress: number;
  joined_at: string;
  last_seen: string;
};

const PRESENCE_MS = 90_000;
const PAUSED_MS = 2 * 60_000;

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

const WORDS = [
  "No",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
];

function countWord(n: number): string {
  return WORDS[n] ?? String(n);
}

export function RoomLive({
  roomId,
  roomName,
  genre,
  mode,
  bookTitle = null,
  timerEndsAt,
  participants,
  meId,
  amCreator,
}: {
  roomId: string;
  roomName: string;
  genre: string;
  mode: string;
  /** For buddy reads: the book this room is reading together. */
  bookTitle?: string | null;
  timerEndsAt: string | null;
  participants: RoomParticipant[];
  meId: string;
  amCreator: boolean;
}) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const me = participants.find((p) => p.user_id === meId);
  const [page, setPage] = useState(me?.current_page ?? 0);
  const [preset, setPreset] = useState(45);
  const [, startAction] = useTransition();

  // Gentle chime, synthesized (no audio file). The AudioContext is created on a
  // user gesture (starting the timer) so it's allowed to play when time is up.
  const audioRef = useRef<AudioContext | null>(null);
  const wasActiveRef = useRef(false);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("marginalia:muted") === "1") {
        setMuted(true);
        mutedRef.current = true;
      }
    } catch {
      /* ignore */
    }
  }, []);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    mutedRef.current = next;
    try {
      localStorage.setItem("marginalia:muted", next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  function ensureAudio() {
    if (typeof window === "undefined") return;
    if (!audioRef.current) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (Ctx) {
        try {
          audioRef.current = new Ctx();
        } catch {
          /* ignore */
        }
      }
    }
    audioRef.current?.resume?.();
  }

  function playChime() {
    if (mutedRef.current) return;
    const ctx = audioRef.current;
    if (!ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99]; // C5 · E5 · G5
      notes.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = f;
        const start = ctx.currentTime + i * 0.18;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.14, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 1.7);
      });
    } catch {
      /* ignore */
    }
  }

  // Join on mount; heartbeat + poll while here; leave on unmount.
  useEffect(() => {
    joinRoom(roomId);
    const beat = setInterval(() => touchPresence(roomId), 25_000);
    const poll = setInterval(() => router.refresh(), 8_000);
    const clock = setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      clearInterval(beat);
      clearInterval(poll);
      clearInterval(clock);
      leaveRoom(roomId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const remaining = timerEndsAt ? new Date(timerEndsAt).getTime() - now : null;
  const timerActive = remaining !== null && remaining > 0;

  // Chime once when a timer we were watching reaches zero.
  useEffect(() => {
    if (timerActive) wasActiveRef.current = true;
    else if (remaining !== null && remaining <= 0 && wasActiveRef.current) {
      wasActiveRef.current = false;
      playChime();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerActive, remaining]);

  function setMyPage(next: number) {
    const val = Math.max(0, next);
    setPage(val);
    startAction(async () => {
      await updateRoomPage(roomId, val);
      router.refresh();
    });
  }

  const active = participants.filter(
    (p) => now - new Date(p.last_seen).getTime() < PRESENCE_MS
  );

  // Average time people have been sitting here, this session.
  const avgMinutes = active.length
    ? Math.round(
        active.reduce(
          (sum, p) => sum + (now - new Date(p.joined_at).getTime()) / 60_000,
          0
        ) / active.length
      )
    : 0;

  return (
    <div className="space-y-8">
      {/* ---- Header: identity on the left, timer on the right ---- */}
      <header className="sticky top-[57px] z-10 -mx-4 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-white/[0.06] bg-forest-dark/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Link
          href="/rooms"
          className="font-mono text-sm text-ink-faint no-underline hover:text-brass"
        >
          ← All rooms
        </Link>
        <h1 className="font-display text-2xl font-semibold text-cream">
          {roomName}
        </h1>
        <p className="font-mono text-xs text-brass/80">
          {roomModeLabel(mode)} · {roomGenreLabel(genre)}
          {bookTitle && (
            <span className="ml-2 text-ink-soft">reading {bookTitle}</span>
          )}
        </p>

        <div className="ml-auto flex items-center gap-3">
          <span
            className={`font-mono text-2xl tracking-widest ${
              timerActive ? "text-cream" : "text-ink-faint"
            }`}
          >
            {timerActive
              ? fmt(remaining as number)
              : `${String(preset)}:00`}
          </span>

          {!timerActive &&
            [25, 45, 60].map((m) => (
              <button
                key={m}
                onClick={() => setPreset(m)}
                className={`rounded-pill border px-3 py-1 text-sm transition-colors ${
                  preset === m
                    ? "border-brass bg-brass text-forest-dark"
                    : "border-parchment-dark text-ink-soft hover:text-ink"
                }`}
              >
                {m}
              </button>
            ))}

          {timerActive ? (
            <button
              onClick={() =>
                startAction(async () => {
                  await stopTimer(roomId);
                  router.refresh();
                })
              }
              className="btn-ghost !py-1.5 text-sm"
            >
              End
            </button>
          ) : (
            <button
              onClick={() => {
                ensureAudio();
                startAction(async () => {
                  await startTimer(roomId, preset);
                  router.refresh();
                });
              }}
              className="btn-accent !py-1.5"
            >
              Start
            </button>
          )}

          <button
            type="button"
            onClick={toggleMute}
            title={muted ? "Chime muted. Tap to unmute" : "Mute the chime"}
            aria-label={muted ? "Unmute chime" : "Mute chime"}
            className={muted ? "text-ink-faint" : "text-brass"}
          >
            {muted ? "🔕" : "🔔"}
          </button>
        </div>
      </header>

      {/* ---- The table ---- */}
      <div className="text-center">
        <h2 className="font-display text-2xl italic text-brass">
          {countWord(active.length)}{" "}
          {active.length === 1 ? "reader" : "readers"} at the table
        </h2>
        <p className="mt-1 font-mono text-xs text-ink-faint">
          {avgMinutes > 0 ? `avg session ${avgMinutes} min` : "just settling in"}
        </p>
      </div>

      <ul className="grid gap-5 md:grid-cols-2">
        {active.map((p) => {
          const isMe = p.user_id === meId;
          const minutes = Math.max(
            0,
            Math.round((now - new Date(p.joined_at).getTime()) / 60_000)
          );
          const idleFor = now - new Date(p.last_seen).getTime();
          const paused = idleFor > PAUSED_MS;

          return (
            <li
              key={p.user_id}
              className={`card flex gap-4 p-5 ${
                isMe ? "!border-brass/50" : ""
              }`}
            >
              {p.book_title ? (
                <BookCover
                  coverId={p.book_cover_id}
                  title={p.book_title}
                  size="M"
                  className="shrink-0"
                />
              ) : (
                <span className="h-[108px] w-[72px] shrink-0 rounded-[3px] border border-dashed border-parchment-dark" />
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Avatar
                    name={p.display_name ?? p.username}
                    icon={p.avatar_icon}
                    size={28}
                  />
                  <Link
                    href={`/profile/${p.username}`}
                    className="font-display text-lg font-semibold text-ink no-underline hover:text-brass"
                  >
                    {p.display_name ?? p.username}
                    {isMe && " (you)"}
                  </Link>
                  <span className="ml-auto font-mono text-sm text-brass">
                    p. {p.current_page}
                  </span>
                </div>

                <p className="mt-2 truncate text-sm text-ink-soft">
                  {p.book_title ?? "Reading"}
                  {" · "}
                  {paused
                    ? `Paused · ${Math.round(idleFor / 60_000)} min ago`
                    : `Reading · ${minutes} min`}
                </p>

                <div className="progress mt-3">
                  <span style={{ width: `${Math.min(100, p.progress)}%` }} />
                </div>

                {isMe && (
                  <div className="mt-4 flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={page}
                      onChange={(e) =>
                        setPage(Math.max(0, Number(e.target.value)))
                      }
                      onBlur={() => setMyPage(page)}
                      aria-label="Your page"
                      className="input w-20 py-1.5 text-center"
                    />
                    <button
                      onClick={() => setMyPage(page + 1)}
                      className="btn-ghost !px-3 !py-1.5 text-sm"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => setMyPage(page + 10)}
                      className="btn-ghost !px-3 !py-1.5 text-sm"
                    >
                      +10
                    </button>
                    <span className="ml-auto text-right font-mono text-[11px] leading-tight text-ink-faint">
                      your
                      <br />
                      seat
                    </span>
                  </div>
                )}
              </div>
            </li>
          );
        })}

        {active.length === 0 && (
          <li className="card p-6 text-center text-sm text-ink-faint md:col-span-2">
            The table is empty. Settle in and someone may join you.
          </li>
        )}
      </ul>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <InviteReader roomId={roomId} />
        {amCreator && (
          <button
            onClick={() =>
              startAction(async () => {
                await deleteRoom(roomId);
              })
            }
            className="font-mono text-sm text-ink-faint hover:text-oxblood"
          >
            delete room
          </button>
        )}
      </div>
    </div>
  );
}
