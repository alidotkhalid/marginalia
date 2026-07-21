"use client";

import { useState, type ReactNode } from "react";

type TabKey = "shelf" | "toread" | "reviews" | "quotes" | "notes";

// The profile's top bar: the shelves, then one tab per kind of read. Panels are
// rendered on the server and passed in, so switching tabs costs no round trip.
export function ProfileTabs({
  shelf,
  toRead,
  reviews,
  quotes,
  notes,
  counts,
}: {
  shelf: ReactNode;
  toRead: ReactNode;
  reviews: ReactNode;
  quotes: ReactNode;
  notes: ReactNode;
  counts: {
    shelf: number;
    toread: number;
    reviews: number;
    quotes: number;
    notes: number;
  };
}) {
  const [tab, setTab] = useState<TabKey>("shelf");

  const tabs: { key: TabKey; label: string; panel: ReactNode }[] = [
    { key: "shelf", label: "Shelf", panel: shelf },
    { key: "toread", label: "To Read", panel: toRead },
    { key: "reviews", label: "Reviews", panel: reviews },
    { key: "quotes", label: "Quotes", panel: quotes },
    { key: "notes", label: "Notes", panel: notes },
  ];

  return (
    /* min-w-0 stops a wide child (the shelf) from stretching the grid column
       and giving the whole page a horizontal scrollbar. */
    <div className="min-w-0 space-y-5">
      <div role="tablist" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`profile-tab ${tab === t.key ? "profile-tab-active" : ""}`}
          >
            {t.label}
            <span className="ml-1.5 font-mono text-[11px] text-ink-faint">
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {tabs.map((t) => (
        <div key={t.key} role="tabpanel" hidden={tab !== t.key} className="min-w-0">
          {tab === t.key && t.panel}
        </div>
      ))}
    </div>
  );
}
