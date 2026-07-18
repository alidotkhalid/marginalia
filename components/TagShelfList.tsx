"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTagFollow } from "@/app/actions";

export type TagShelf = { slug: string; label: string; count: number };

/**
 * Every tag on the site, each with a star to follow it. Following a tag both
 * fills this page's feed and shapes what Discover suggests.
 */
export function TagShelfList({
  tags,
  followed,
}: {
  tags: TagShelf[];
  followed: string[];
}) {
  const router = useRouter();
  const [on, setOn] = useState<Set<string>>(() => new Set(followed));
  const [pending, startTransition] = useTransition();

  function toggle(slug: string) {
    const next = new Set(on);
    const following = !next.has(slug);
    if (following) next.add(slug);
    else next.delete(slug);
    setOn(next);
    startTransition(async () => {
      await setTagFollow(slug, following);
      router.refresh();
    });
  }

  return (
    <div>
      <h2 className="mb-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">
        All tags
      </h2>
      <p className="mb-4 text-xs text-ink-faint">
        Star a tag to follow it.
      </p>

      <ul className="space-y-1">
        {tags.map((t) => {
          const following = on.has(t.slug);
          return (
            <li key={t.slug}>
              <button
                type="button"
                onClick={() => toggle(t.slug)}
                disabled={pending}
                aria-pressed={following}
                title={
                  following
                    ? `Unfollow ${t.label}`
                    : `Follow ${t.label}`
                }
                className={`flex w-full items-center gap-2 rounded-card px-3 py-2 text-left transition-colors ${
                  following
                    ? "bg-brass/[0.12] text-brass"
                    : "text-ink-soft hover:bg-white/[0.04] hover:text-ink"
                }`}
              >
                <span
                  className={`w-3 shrink-0 text-sm ${
                    following ? "text-brass" : "text-ink-faint"
                  }`}
                >
                  {following ? "★" : "☆"}
                </span>
                <span className="truncate font-mono text-sm">#{t.slug}</span>
                <span className="ml-auto shrink-0 font-mono text-xs text-ink-faint">
                  {t.count}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
