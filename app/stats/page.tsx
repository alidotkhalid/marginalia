import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { genreLabel } from "@/lib/genres";

export const metadata = { title: "Your reading stats" };

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

const NUMERALS: [number, string][] = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
  [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
  [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

function roman(n: number): string {
  if (n < 1 || n > 3999) return String(n);
  let out = "";
  let left = n;
  for (const [v, g] of NUMERALS) {
    while (left >= v) {
      out += g;
      left -= v;
    }
  }
  return out;
}

// A reader's private ledger: streaks, active days, shelves, and what they
// write about. The year card is designed to be screenshotted and shared.
export default async function StatsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const year = new Date().getFullYear();
  const yearStart = `${year}-01-01`;

  const [
    { data: streakRows },
    { data: days },
    { data: shelfRows },
    { data: postRows },
  ] = await Promise.all([
    supabase.rpc("reading_streak", { uid: user.id }),
    supabase.from("activity_days").select("day").eq("user_id", user.id),
    supabase
      .from("read_books")
      .select("status, finished_at")
      .eq("user_id", user.id),
    supabase
      .from("posts")
      .select("kind, genre, created_at")
      .eq("author_id", user.id)
      .limit(2000),
  ]);

  const streak = (
    streakRows as unknown as { current_days: number; best_days: number }[] | null
  )?.[0] ?? { current_days: 0, best_days: 0 };

  const allDays = ((days ?? []) as { day: string }[]).map((d) =>
    String(d.day).slice(0, 10)
  );
  const daysThisYear = allDays.filter((d) => d >= yearStart);

  // Active days per month, this year.
  const byMonth = Array.from({ length: 12 }, () => 0);
  for (const d of daysThisYear) byMonth[Number(d.slice(5, 7)) - 1]++;
  const maxMonth = Math.max(1, ...byMonth);

  const shelf = (shelfRows ?? []) as { status: string; finished_at: string }[];
  const finished = shelf.filter((s) => s.status !== "to-read");
  const finishedThisYear = finished.filter(
    (s) => String(s.finished_at).slice(0, 10) >= yearStart
  ).length;
  const tbr = shelf.length - finished.length;

  const posts = (postRows ?? []) as {
    kind: string;
    genre: string | null;
    created_at: string;
  }[];
  const kindCount = (k: string) =>
    posts.filter((p) => (p.kind ?? "note") === k).length;

  const genreCounts = new Map<string, number>();
  for (const p of posts) {
    if (p.genre) genreCounts.set(p.genre, (genreCounts.get(p.genre) ?? 0) + 1);
  }
  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-5xl font-bold text-cream">
          Your reading, measured
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          A private ledger. Only you can see this page.
        </p>
      </div>

      {/* ---- The year card ---- */}
      <section className="card streak-card p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
          {year} in margins
        </p>
        <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div>
            <p className="font-display text-4xl font-semibold text-brass">
              {finishedThisYear}
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              books finished this year
            </p>
          </div>
          <div>
            <p className="font-display text-4xl font-semibold text-brass">
              {daysThisYear.length}
            </p>
            <p className="mt-1 text-xs text-ink-soft">days spent reading</p>
          </div>
          <div>
            <p
              className="font-display text-4xl font-semibold text-brass"
              title={`${streak.best_days} days`}
            >
              {streak.best_days > 0 ? roman(streak.best_days) : "—"}
            </p>
            <p className="mt-1 text-xs text-ink-soft">longest streak, days</p>
          </div>
          <div>
            <p className="truncate font-display text-4xl font-semibold text-brass">
              {topGenres[0] ? `#${topGenres[0][0]}` : "—"}
            </p>
            <p className="mt-1 text-xs text-ink-soft">most written-about</p>
          </div>
        </div>

        {/* Months */}
        <div className="mt-8 flex h-24 items-end gap-1.5">
          {byMonth.map((n, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <span
                className={`w-full rounded-t ${
                  n > 0 ? "bg-brass/70" : "bg-ink-faint/15"
                }`}
                style={{ height: `${Math.max(4, (n / maxMonth) * 100)}%` }}
                title={`${n} active day${n === 1 ? "" : "s"}`}
              />
              <span className="font-mono text-[10px] text-ink-faint">
                {MONTHS[i]}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-right font-mono text-[10px] text-ink-faint">
          marginaly · read deliberately
        </p>
      </section>

      {/* ---- All time ---- */}
      <div className="grid gap-5 sm:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-faint">
            Shelves, all time
          </h2>
          <ul className="space-y-2 text-sm text-ink-soft">
            <li className="flex justify-between">
              <span>Books finished</span>
              <span className="font-mono text-ink">{finished.length}</span>
            </li>
            <li className="flex justify-between">
              <span>On the to-read pile</span>
              <span className="font-mono text-ink">{tbr}</span>
            </li>
            <li className="flex justify-between">
              <span>Current streak</span>
              <span className="font-mono text-ink">
                {streak.current_days} days
              </span>
            </li>
            <li className="flex justify-between">
              <span>Days active, ever</span>
              <span className="font-mono text-ink">{allDays.length}</span>
            </li>
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-faint">
            Written, all time
          </h2>
          <ul className="space-y-2 text-sm text-ink-soft">
            <li className="flex justify-between">
              <span>Notes</span>
              <span className="font-mono text-ink">{kindCount("note")}</span>
            </li>
            <li className="flex justify-between">
              <span>Quotes kept</span>
              <span className="font-mono text-ink">{kindCount("quote")}</span>
            </li>
            <li className="flex justify-between">
              <span>Reviews</span>
              <span className="font-mono text-ink">{kindCount("review")}</span>
            </li>
          </ul>
        </section>
      </div>

      {topGenres.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-faint">
            What you write about
          </h2>
          <ul className="space-y-2">
            {topGenres.map(([slug, n]) => (
              <li key={slug} className="flex items-center gap-3">
                <span className="w-36 shrink-0 truncate font-mono text-xs text-brass">
                  #{slug}
                </span>
                <span className="progress flex-1">
                  <span
                    style={{ width: `${(n / topGenres[0][1]) * 100}%` }}
                  />
                </span>
                <span
                  className="w-8 text-right font-mono text-xs text-ink-faint"
                  title={genreLabel(slug) ?? slug}
                >
                  {n}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
