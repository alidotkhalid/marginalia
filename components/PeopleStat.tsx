"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "./Avatar";
import { Modal } from "./Modal";

export type Person = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_icon: string | null;
};

/**
 * A profile stat that opens the list behind it. Clicking Followers or Following
 * shows those readers in a panel over the profile.
 */
export function PeopleStat({
  label,
  count,
  people,
  emptyLine,
}: {
  label: string;
  count: number;
  people: Person[];
  emptyLine: string;
}) {
  const [open, setOpen] = useState(false);

  // Nothing to show: keep it as plain text so it doesn't invite a click.
  if (people.length === 0) {
    return (
      <div>
        <span className="stat-num text-ink">{count}</span>
        <span className="stat-label">{label}</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group rounded-card px-2 py-1 transition-colors hover:bg-white/[0.04]"
        aria-label={`View ${label.toLowerCase()}`}
      >
        <span className="stat-num text-ink group-hover:text-brass">{count}</span>
        <span className="stat-label group-hover:text-ink">{label}</span>
      </button>

      {open && (
        <Modal label={label} onClose={() => setOpen(false)} maxWidth="max-w-sm">
          <div>
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="font-display text-xl italic text-brass">
                {label}
                <span className="ml-2 font-mono text-xs not-italic text-ink-faint">
                  {count}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-mono text-xs text-ink-faint hover:text-ink"
              >
                close
              </button>
            </div>

            {people.length === 0 ? (
              <p className="text-sm text-ink-faint">{emptyLine}</p>
            ) : (
              <ul className="space-y-1">
                {people.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/profile/${p.username}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-card px-2 py-2 text-left no-underline transition-colors hover:bg-white/[0.04]"
                    >
                      <Avatar
                        name={p.display_name ?? p.username}
                        icon={p.avatar_icon}
                        size={40}
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">
                          {p.display_name ?? p.username}
                        </span>
                        <span className="block truncate font-mono text-xs text-ink-faint">
                          @{p.username}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
