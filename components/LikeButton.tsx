"use client";

import { useState, useTransition } from "react";
import { setLike } from "@/app/actions";

// Heart toggle with an optimistic count. Guests see the count but can't like.
export function LikeButton({
  postId,
  initialLiked,
  initialCount,
  canLike,
}: {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
  canLike: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [, startTransition] = useTransition();

  function toggle() {
    if (!canLike) return;
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    startTransition(async () => {
      await setLike(postId, next);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!canLike}
      aria-pressed={liked}
      className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
        liked ? "text-oxblood" : "text-ink-faint hover:text-oxblood"
      } ${canLike ? "" : "cursor-default"}`}
    >
      <span aria-hidden="true">{liked ? "♥" : "♡"}</span>
      {count}
    </button>
  );
}
