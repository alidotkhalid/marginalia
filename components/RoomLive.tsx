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
import { Avatar } from "./Avatar";
import { BookCover } from "./BookCover";

export type RoomParticipant = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_icon: string | null;
  book_title: string | null;
  book_cover_id: number | null;
  current_page: number;
  last_seen: string;
};

const PRESENCE_MS = 90_000;

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function RoomLive({
  roomId,
  timerEndsAt,
  participants,
  meId,
  amCreator,
}: {
  roomId: string;
  timerEndsAt: string | null;
  participants: RoomParticipant[];
  meId: string;
  amCreator: boolean;
}) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const me = participants.find((p) => p.user_id === meId);
  const [page, setPage] = useState(me?.current_page ?? 0);
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
  const timerDone = remaining !== null && remaining <= 0;

  // Chime once when a timer we were watching reaches zero.
  useEffect(() => {
    if (timerActive) wasActiveRef.current = true;
    else if (timerDone && wasActiveRef.current) {
      wasActiveRef.current = false;
      playChime();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerActive, timerDone]);

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

  return (
    <div className="space-y-6">
      {/* Timer */}
      <section className="relative card p-6 text-center">
        <button
          type="button"
          onClick={toggleMute}
          title={muted ? "Chime muted — tap to unmute" : "Mute the chime"}
          aria-label={muted ? "Unmute chime" : "Mute chime"}
          className="absolute right-3 top-3 text-ink-faint hover:text-brass"
        >
          {muted ? "🔕" : "🔔"}
        </button>
        {timerActive ? (
          <>
            <p className="font-mono text-5xl font-semibold text-brass">
              {fmt(remaining as number)}
            </p>
            <p className="mt-1 text-sm text-ink-faint">reading together</p>
            <button
              onClick={() => startAction(async () => { await stopTimer(roomId); router.refresh(); })}
              className="btn-ghost mt-3 !py-1.5 text-sm"
            >
              End timer
            </button>
          </>
        ) : timerDone ? (
          <>
            <p className="font-display text-2xl text-ink">Session complete 🕯️</p>
            <p className="mt-1 text-sm text-ink-faint">Start another when you&rsquo;re ready.</p>
            <div className="mt-3 flex justify-center gap-2">
              {[25, 45, 60].map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    ensureAudio();
                    startAction(async () => {
                      await startTimer(roomId, m);
                      router.refresh();
                    });
                  }}
                  className="btn-accent !py-1.5 text-sm"
                >
                  {m} min
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="font-display text-xl text-ink">Start a focus timer</p>
            <p className="mt-1 text-sm text-ink-faint">
              A shared countdown everyone in the room can see.
            </p>
            <div className="mt-3 flex justify-center gap-2">
              {[25, 45, 60].map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    ensureAudio();
                    startAction(async () => {
                      await startTimer(roomId, m);
                      router.refresh();
                    });
                  }}
                  className="btn-accent !py-1.5 text-sm"
                >
                  {m} min
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Your page */}
      <section className="card p-5">
        <h3 className="section-title mb-3 text-lg">Your progress</h3>
        {me?.book_title ? (
          <p className="mb-2 text-sm text-ink-soft">
            Reading <span className="font-display font-semibold">{me.book_title}</span>
          </p>
        ) : (
          <p className="mb-2 text-sm text-ink-faint">
            Set a Currently Reading book on your profile to show it here.
          </p>
        )}
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-faint">Page</span>
          <input
            type="number"
            min={0}
            value={page}
            onChange={(e) => setPage(Math.max(0, Number(e.target.value)))}
            onBlur={() => setMyPage(page)}
            className="input w-24 text-center"
          />
          <button onClick={() => setMyPage(page + 1)} className="btn-ghost !py-1.5 text-sm">
            +1
          </button>
          <button onClick={() => setMyPage(page + 10)} className="btn-ghost !py-1.5 text-sm">
            +10
          </button>
        </div>
      </section>

      {/* Who's reading */}
      <section className="card p-5">
        <h3 className="section-title mb-3 text-lg">
          Reading now{" "}
          <span className="font-mono text-xs text-ink-faint">({active.length})</span>
        </h3>
        <ul className="space-y-3">
          {active.map((p) => (
            <li key={p.user_id} className="flex items-center gap-3">
              <span className="relative">
                <Avatar
                  name={p.display_name ?? p.username}
                  icon={p.avatar_icon}
                  size={40}
                />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-pill border-2 border-parchment bg-forest-light" />
              </span>
              {p.book_title && (
                <BookCover
                  coverId={p.book_cover_id}
                  title={p.book_title}
                  size="S"
                />
              )}
              <div className="min-w-0 flex-1">
                <Link
                  href={`/profile/${p.username}`}
                  className="font-display font-semibold text-ink no-underline hover:text-brass"
                >
                  {p.display_name ?? p.username}
                  {p.user_id === meId && " (you)"}
                </Link>
                <p className="truncate text-sm text-ink-faint">
                  {p.book_title ?? "Reading"}
                </p>
              </div>
              <span className="font-mono text-sm text-brass">p. {p.current_page}</span>
            </li>
          ))}
          {active.length === 0 && (
            <li className="text-sm text-ink-faint">Just you so far. Invite a friend.</li>
          )}
        </ul>
      </section>

      <div className="flex items-center justify-between">
        <Link href="/rooms" className="link text-sm">
          ← All rooms
        </Link>
        {amCreator && (
          <button
            onClick={() => startAction(async () => { await deleteRoom(roomId); })}
            className="font-mono text-xs text-ink-faint hover:text-oxblood"
          >
            delete room
          </button>
        )}
      </div>
    </div>
  );
}
