"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BookResult } from "@/lib/openlibrary";
import { completeOnboarding } from "@/app/actions";
import { avatarLabel } from "@/lib/avatarIcons";
import { Avatar } from "./Avatar";
import { AvatarGrid } from "./AvatarGrid";
import { BookSearch } from "./BookSearch";
import { BookCover } from "./BookCover";
import { Spinner } from "./Spinner";

// The welcome flow: name, avatar, bio, and what you are reading right now.
// Everything here is optional; the point is to make the profile feel lived in.
export function OnboardingForm({
  username,
  initialName,
}: {
  username: string;
  initialName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [icon, setIcon] = useState("");
  const [bio, setBio] = useState("");
  const [book, setBook] = useState<BookResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function finish() {
    setError(null);
    startTransition(async () => {
      const res = await completeOnboarding({
        displayName: name,
        bio,
        avatarIcon: icon,
        book,
        progress,
      });
      if (res?.error) setError(res.error);
      else router.push(`/profile/${username}`);
    });
  }

  const shownName = name.trim() || username;

  return (
    <div className="space-y-5">
      {/* Name */}
      <section className="card p-5">
        <h2 className="mb-1 font-display text-xl text-ink">
          What should we call you?
        </h2>
        <p className="mb-3 text-sm text-ink-faint">
          Your display name. Your handle stays @{username}.
        </p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 60))}
          placeholder="Your name"
          className="input"
        />
      </section>

      {/* Avatar */}
      <section className="card p-5">
        <h2 className="mb-1 font-display text-xl text-ink">Pick an avatar</h2>
        <p className="mb-4 text-sm text-ink-faint">
          {icon
            ? avatarLabel(icon)
            : "Leave it on Auto and we will choose one from your name."}
        </p>
        <div className="mb-4 flex items-center gap-3">
          <Avatar name={shownName} icon={icon || null} size={56} />
          <span className="text-sm text-ink-soft">
            This is how you will appear on your reads.
          </span>
        </div>
        <AvatarGrid name={shownName} selected={icon} onSelect={setIcon} />
      </section>

      {/* Bio */}
      <section className="card p-5">
        <h2 className="mb-1 font-display text-xl text-ink">
          A line about your reading
        </h2>
        <p className="mb-3 text-sm text-ink-faint">
          Optional. What you read, how you read, whatever fits.
        </p>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 280))}
          rows={3}
          maxLength={280}
          placeholder="e.g. Reads slowly, annotates everything."
          className="input resize-none"
        />
        <p className="mt-1 text-right font-mono text-xs text-ink-faint">
          {280 - bio.length} left
        </p>
      </section>

      {/* Currently reading */}
      <section className="card p-5">
        <h2 className="mb-1 font-display text-xl text-ink">
          What are you reading now?
        </h2>
        <p className="mb-3 text-sm text-ink-faint">
          Search for it, then tell us how far in you are. This fills your
          Currently Reading tile.
        </p>

        {book ? (
          <>
            <div className="flex items-center gap-3 rounded-card border border-parchment-dark bg-parchment-light p-3">
              <BookCover coverId={book.coverId} title={book.title} size="M" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display font-semibold text-ink">
                  {book.title}
                </p>
                <p className="truncate text-sm text-ink-faint">
                  {book.author ?? "Unknown author"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBook(null);
                  setProgress(0);
                }}
                className="font-mono text-xs text-ink-faint hover:text-oxblood"
              >
                change
              </button>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="progress"
                  className="font-mono text-[11px] uppercase tracking-wider text-ink-faint"
                >
                  How far in
                </label>
                <span className="font-mono text-sm text-brass">{progress}%</span>
              </div>
              <input
                id="progress"
                type="range"
                min={0}
                max={100}
                step={1}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full accent-brass"
              />
              <div className="progress mt-3">
                <span style={{ width: `${progress}%` }} />
              </div>
            </div>
          </>
        ) : (
          <BookSearch onSelect={setBook} />
        )}
      </section>

      {error && <p className="text-sm text-oxblood">{error}</p>}

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={finish}
          disabled={pending}
          className="btn-accent"
        >
          {pending && <Spinner inline />}
          {pending ? "Setting up…" : "Finish setup"}
        </button>
        <button
          type="button"
          onClick={finish}
          disabled={pending}
          className="font-mono text-sm text-ink-faint hover:text-ink"
        >
          skip for now
        </button>
      </div>
    </div>
  );
}
