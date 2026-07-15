"use client";

import { useState } from "react";

// Renders a post's text sections. If a post has more than one of note/quote/
// review, clickable tabs switch between them; a single section shows plainly.
export function PostBody({
  note,
  quote,
  review,
}: {
  note: string | null;
  quote: string | null;
  review: string | null;
}) {
  const sections = (
    [
      ["note", "Note", note],
      ["quote", "Quote", quote],
      ["review", "Review", review],
    ] as const
  )
    .filter(([, , text]) => text && text.trim().length > 0)
    .map(([key, label, text]) => ({ key, label, text: text as string }));

  const [active, setActive] = useState(0);

  if (sections.length === 0) return null;

  const idx = Math.min(active, sections.length - 1);
  const current = sections[idx];

  return (
    <div>
      {sections.length > 1 && (
        <div className="mb-2 flex gap-1.5 font-mono text-[11px] uppercase tracking-wider">
          {sections.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setActive(i)}
              className={`rounded-pill border px-2.5 py-0.5 transition-colors ${
                i === idx
                  ? "border-brass bg-brass/15 text-brass"
                  : "border-parchment-dark text-ink-faint hover:text-brass"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {current.key === "quote" ? (
        <blockquote className="border-l-2 border-brass pl-3 font-display text-lg italic leading-relaxed text-ink-soft">
          {current.text}
        </blockquote>
      ) : (
        <p className="whitespace-pre-wrap leading-relaxed text-ink">
          {current.text}
        </p>
      )}
    </div>
  );
}
