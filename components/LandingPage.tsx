import Link from "next/link";

// What a signed-out visitor sees at the front door: what Marginaly is, what
// they get, and two ways in. Pure server markup, no client JS needed.

const FEATURES: { title: string; body: string; icon: string }[] = [
  {
    icon: "✎",
    title: "Notes, quotes, reviews",
    body: "Every read is one thing: a thought while reading, a passage worth keeping, or an honest review with a star rating. Always tied to a real book.",
  },
  {
    icon: "▤",
    title: "A shelf that fills itself",
    body: "Finish a book and it lands on your shelf, cover and all. Your profile becomes a record of your reading life, not a highlight reel.",
  },
  {
    icon: "Ⅻ",
    title: "Streaks in roman numerals",
    body: "Post a read, log your progress, or sit in a room and the day counts. Watch your streak grow from I to XII and beyond.",
  },
  {
    icon: "◉",
    title: "Reading rooms",
    body: "Sit and read alongside others in real time. A shared timer, page ticking, a soft chime when the session ends. No camera, no chat, just company.",
  },
  {
    icon: "#",
    title: "Genres, not algorithms",
    body: "Follow the tags you care about and browse shelves of readers and reads by genre. The feed is chronological, from people you chose. Nothing is ranked at you.",
  },
  {
    icon: "🔒",
    title: "Reading is personal",
    body: "Go private and approve every follower, Instagram-style. Block anyone, ask readers questions they answer on their own terms, and leave whenever. Your data is yours.",
  },
];

export function LandingPage() {
  return (
    <div className="space-y-20 pb-10">
      {/* ---- Hero ---- */}
      <section className="mx-auto max-w-2xl pt-10 text-center sm:pt-16">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.25em] text-brass">
          A social network for book lovers
        </p>
        <h1 className="font-display text-5xl font-bold leading-tight text-cream sm:text-6xl">
          Read deliberately.
          <br />
          Share it quietly.
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-ink-soft">
          Marginaly is a distraction-free, text-first corner of the internet for
          people who read. No video, no infinite scroll, no algorithm deciding
          what you see. Just books, and the people reading them.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/signup" className="btn-accent !px-8 !py-3 text-base no-underline">
            Join Marginaly
          </Link>
          <Link href="/login" className="btn-ghost !px-8 !py-3 text-base no-underline">
            Log in
          </Link>
        </div>
        <p className="mt-3 font-mono text-xs text-ink-faint">
          Free. No ads. No tracking pixels reading over your shoulder.
        </p>
      </section>

      {/* ---- A read, as it appears in the app ---- */}
      <section className="mx-auto max-w-xl">
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[15%] bg-forest font-display text-lg text-cream">
                M
              </span>
              <div>
                <p className="font-semibold text-ink">Mira</p>
                <p className="font-mono text-xs text-ink-faint">@mirareads · 2h ago</p>
              </div>
            </div>
            <span className="rounded-[4px] border border-brass/30 bg-brass/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-brass">
              quote
            </span>
          </div>
          <blockquote className="font-display text-xl italic leading-relaxed text-ink">
            &ldquo;One of the secrets of a happy life is continuous small
            treats.&rdquo;
          </blockquote>
          <p className="mt-3 text-sm text-ink-faint">
            Iris Murdoch · The Sea, The Sea
          </p>
          <p className="mt-4 border-t border-white/[0.06] pt-3 font-mono text-xs text-ink-faint">
            #literary-fiction · 🔖 4 · 💬 2
          </p>
        </div>
        <p className="mt-3 text-center font-mono text-xs text-ink-faint">
          A read, as it appears on Marginaly
        </p>
      </section>

      {/* ---- Features ---- */}
      <section className="mx-auto max-w-4xl">
        <h2 className="mb-2 text-center font-display text-3xl font-bold text-cream">
          What you get
        </h2>
        <p className="mb-8 text-center text-sm text-ink-soft">
          Everything here exists to serve the reading, not the metrics.
        </p>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-card bg-brass/10 text-lg text-brass">
                {f.icon}
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold text-ink">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- How it works ---- */}
      <section className="mx-auto max-w-2xl">
        <h2 className="mb-8 text-center font-display text-3xl font-bold text-cream">
          Three minutes to your first read
        </h2>
        <ol className="space-y-4">
          {[
            ["I", "Make an account", "A username, an email, and a pixel-art avatar with a name like Night Owl or Margin Scribbler."],
            ["II", "Say what you are reading", "Search any book, set how far in you are, and your profile is alive."],
            ["III", "Share a read", "A note, a quote, or a review. Five hundred characters of note, or two thousand of review. That is the whole game."],
          ].map(([numeral, title, body]) => (
            <li key={numeral as string} className="card flex items-start gap-4 p-5">
              <span className="font-display text-2xl font-semibold text-brass">
                {numeral}
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  {title}
                </h3>
                <p className="mt-1 text-sm text-ink-soft">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- Closing CTA ---- */}
      <section className="mx-auto max-w-xl text-center">
        <div className="card streak-card p-10">
          <h2 className="font-display text-3xl font-bold text-cream">
            The margins are waiting.
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-sm text-ink-soft">
            Bring the book you are reading right now. That is all you need.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link href="/signup" className="btn-accent !px-8 !py-3 text-base no-underline">
              Join Marginaly
            </Link>
            <Link href="/login" className="font-mono text-sm text-ink-faint hover:text-brass">
              I have an account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
