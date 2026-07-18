// The home page's reading streak card: the run in roman numerals, what you are
// reading now, and a bar for each of the last seven days.

const NUMERALS: [number, string][] = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
  [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
  [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

function roman(n: number): string {
  if (n < 1 || n > 3999) return String(n);
  let out = "";
  let left = n;
  for (const [value, glyph] of NUMERALS) {
    while (left >= value) {
      out += glyph;
      left -= value;
    }
  }
  return out;
}

export function StreakPanel({
  current,
  week,
  currentBook,
  progress,
}: {
  current: number;
  /** Seven booleans, oldest first, one per day up to today. */
  week: boolean[];
  currentBook: string | null;
  progress: number;
}) {
  const activeToday = week[week.length - 1] === true;

  return (
    <section className="card streak-card flex flex-col justify-between p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">
          Reading streak
        </h2>
        <span className="flex items-center gap-1.5 text-xs text-ink-faint">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-pill ${
              activeToday ? "bg-brass" : "bg-ink-faint/50"
            }`}
          />
          {activeToday ? "active" : "resting"}
        </span>
      </div>

      <div className="mt-4 flex items-baseline gap-3">
        <span
          className="font-display text-3xl font-semibold leading-none text-brass"
          title={`${current} day${current === 1 ? "" : "s"}`}
        >
          {current > 0 ? roman(current) : "—"}
        </span>
        <p className="text-sm text-ink-soft">
          days
          {currentBook && (
            <>
              {" · "}
              {progress}% of {currentBook}
            </>
          )}
        </p>
      </div>

      {/* One bar per day, oldest on the left */}
      <div className="mt-4 flex gap-1.5">
        {week.map((on, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-pill ${
              on ? "bg-brass/70" : "bg-ink-faint/20"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
