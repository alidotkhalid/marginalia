"use client";

import { useState, useTransition } from "react";
import { setSave } from "@/app/actions";

// Bookmark toggle. The bookmark fills when saved. Guests can't save.
export function SaveButton({
  postId,
  initialSaved,
  canSave,
}: {
  postId: string;
  initialSaved: boolean;
  canSave: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [, startTransition] = useTransition();

  function toggle() {
    if (!canSave) return;
    const next = !saved;
    setSaved(next);
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
      className={`transition-colors ${
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
    </button>
  );
}
