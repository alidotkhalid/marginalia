"use client";

import { useState, useTransition } from "react";
import { setSave } from "@/app/actions";

// Bookmark toggle with a public count. The bookmark fills when saved. Guests
// see the count but can't save.
export function SaveButton({
  postId,
  initialSaved,
  initialCount,
  canSave,
}: {
  postId: string;
  initialSaved: boolean;
  initialCount: number;
  canSave: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [count, setCount] = useState(initialCount);
  const [, startTransition] = useTransition();

  function toggle() {
    if (!canSave) return;
    const next = !saved;
    setSaved(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    startTransition(async () => {
      await setSave(postId, next);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!canSave}
      aria-pressed={saved}
      title={saved ? "Saved" : "Save read"}
      className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
        saved ? "text-brass" : "text-ink-faint"
      } ${canSave ? "hover:text-brass" : "cursor-default"}`}
    >
      <svg
        width="15"
        height="17"
        viewBox="0 0 14 16"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path d="M2.5 1.5h9v13l-4.5-3.2-4.5 3.2z" strokeLinejoin="round" />
      </svg>
      {count}
    </button>
  );
}
