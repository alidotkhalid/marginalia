// Reading streak. A day counts when the reader posts a read, logs progress,
// finishes a book, or sits in a reading room.

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

export function StreakCard({
  current,
  best,
}: {
  current: number;
  best: number;
}) {
  return (
    <section className="card streak-card flex items-center gap-4 p-5">
      <span
        className="font-display text-3xl font-semibold leading-none text-brass"
        title={`${current} day${current === 1 ? "" : "s"}`}
      >
        {current > 0 ? roman(current) : "—"}
      </span>
      <div className="min-w-0">
        <p className="text-sm text-ink">day streak</p>
        <p className="font-mono text-xs text-ink-faint">best: {best}</p>
      </div>
    </section>
  );
}
