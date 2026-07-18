"use client";

// Five stars. Read-only by default; pass onChange to make it a picker.
export function StarRating({
  value,
  onChange,
  size = "sm",
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: "sm" | "md";
}) {
  const stars = [1, 2, 3, 4, 5];
  const cls = size === "md" ? "text-lg" : "text-sm";

  if (!onChange) {
    return (
      <span
        className={`${cls} tracking-tight text-brass`}
        aria-label={`${value} out of 5 stars`}
      >
        {stars.map((s) => (
          <span key={s} className={s <= value ? "" : "text-brass/35"}>
            {s <= value ? "★" : "☆"}
          </span>
        ))}
      </span>
    );
  }

  return (
    <span className={`${cls} inline-flex items-center gap-0.5`}>
      {stars.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s === value ? 0 : s)}
          aria-label={`${s} star${s > 1 ? "s" : ""}`}
          aria-pressed={s <= value}
          className={`leading-none transition-colors ${
            s <= value ? "text-brass" : "text-ink-faint hover:text-brass/70"
          }`}
        >
          {s <= value ? "★" : "☆"}
        </button>
      ))}
      {value > 0 && (
        <button
          type="button"
          onClick={() => onChange(0)}
          className="ml-1 font-mono text-[10px] uppercase tracking-wider text-ink-faint hover:text-oxblood"
        >
          clear
        </button>
      )}
    </span>
  );
}
