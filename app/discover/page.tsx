import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { BookCover } from "@/components/BookCover";
import { FollowButton } from "@/components/FollowButton";
import { PostCard, type FeedPost } from "@/components/PostCard";
import { TagFollowButton } from "@/components/TagFollowButton";
import type { FollowStatus } from "@/app/actions";
import { isGenre, genreLabel } from "@/lib/genres";

type ReaderRow = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_icon: string | null;
  books: { title: string; author: string | null; cover_id: number | null } | null;
};

const SIDEBAR_LIMIT = 8;

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: { tag?: string; q?: string; tab?: string; all?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sanitize the query so it can't break the PostgREST filter string.
  const rawQ = (searchParams.q ?? "").trim();
  const q = rawQ
    .replace(/[,()%*\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);

  const tab = searchParams.tab === "reads" ? "reads" : "readers";
  const showAllTags = searchParams.all === "1";

  // Follow status + blocks + followed tags, fetched once.
  const statusByUser = new Map<string, FollowStatus>();
  let blockedIds = new Set<string>();
  let followedTags = new Set<string>();
  if (user) {
    const [{ data: follows }, { data: myBlocks }, { data: tags }] =
      await Promise.all([
        supabase
          .from("follows")
          .select("following_id, status")
          .eq("follower_id", user.id),
        supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id),
        supabase.from("tag_follows").select("tag").eq("user_id", user.id),
      ]);
    for (const f of follows ?? []) {
      statusByUser.set(f.following_id, (f.status as FollowStatus) ?? "accepted");
    }
    blockedIds = new Set((myBlocks ?? []).map((b) => b.blocked_id));
    followedTags = new Set((tags ?? []).map((t) => t.tag));
  }

  // ---- The shelves: every tagged read, reduced to counts and who writes them ----
  const { data: tagRows } = await supabase
    .from("feed_posts")
    .select("author_id, genre")
    .not("genre", "is", null)
    .limit(4000);

  const counts = new Map<string, number>();
  const authorsByTag = new Map<string, Set<string>>();
  const tagsByAuthor = new Map<string, Set<string>>();

  for (const row of (tagRows ?? []) as { author_id: string; genre: string }[]) {
    const g = row.genre;
    if (!g) continue;
    counts.set(g, (counts.get(g) ?? 0) + 1);

    let authors = authorsByTag.get(g);
    if (!authors) authorsByTag.set(g, (authors = new Set()));
    authors.add(row.author_id);

    let mine = tagsByAuthor.get(row.author_id);
    if (!mine) tagsByAuthor.set(row.author_id, (mine = new Set()));
    mine.add(g);
  }

  const shelves = [...counts.entries()]
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));

  // The selected shelf: the one asked for, else the busiest.
  const activeTag =
    searchParams.tag && isGenre(searchParams.tag)
      ? searchParams.tag
      : shelves[0]?.slug ?? null;

  const myTags = user ? tagsByAuthor.get(user.id) ?? new Set<string>() : new Set<string>();

  // ---- Readers and reads for this shelf (or for the search) ----
  let readers: ReaderRow[] = [];
  let reads: FeedPost[] = [];

  if (q) {
    const [{ data: profs }, { data: postRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, username, display_name, bio, avatar_icon, books!currently_reading (title, author, cover_id)"
        )
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%,bio.ilike.%${q}%`)
        .limit(30),
      supabase
        .from("feed_posts")
        .select("*")
        .or(
          `text_note.ilike.%${q}%,text_quote.ilike.%${q}%,text_review.ilike.%${q}%`
        )
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    readers = (profs ?? []) as unknown as ReaderRow[];
    reads = (postRows ?? []) as FeedPost[];
  } else if (activeTag) {
    const ids = [...(authorsByTag.get(activeTag) ?? new Set<string>())]
      .filter((id) => id !== user?.id && !blockedIds.has(id))
      .slice(0, 40);

    const [{ data: profs }, { data: postRows }] = await Promise.all([
      ids.length
        ? supabase
            .from("profiles")
            .select(
              "id, username, display_name, bio, avatar_icon, books!currently_reading (title, author, cover_id)"
            )
            .in("id", ids)
        : Promise.resolve({ data: [] }),
      supabase
        .from("feed_posts")
        .select("*")
        .eq("genre", activeTag)
        .order("created_at", { ascending: false })
        .limit(40),
    ]);
    readers = (profs ?? []) as unknown as ReaderRow[];
    reads = (postRows ?? []) as FeedPost[];
  }

  readers = readers.filter((r) => r.id !== user?.id && !blockedIds.has(r.id));

  // Shelves in common with the viewer, most overlap first.
  const mutualOf = (id: string) => {
    const theirs = tagsByAuthor.get(id);
    if (!theirs) return 0;
    let n = 0;
    for (const t of myTags) if (theirs.has(t)) n++;
    return n;
  };
  readers.sort((a, b) => mutualOf(b.id) - mutualOf(a.id));

  const visibleShelves = showAllTags ? shelves : shelves.slice(0, SIDEBAR_LIMIT);
  const tabHref = (t: string) =>
    `/discover?${new URLSearchParams({
      ...(activeTag ? { tag: activeTag } : {}),
      ...(rawQ ? { q: rawQ } : {}),
      ...(showAllTags ? { all: "1" } : {}),
      tab: t,
    }).toString()}`;

  return (
    <div className="grid gap-10 lg:grid-cols-[16rem_1fr]">
      {/* ---- Shelves ---- */}
      <aside className="lg:border-r lg:border-white/[0.06] lg:pr-6">
        <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">
          Shelves
        </h2>

        {shelves.length === 0 ? (
          <p className="text-sm text-ink-faint">
            No tagged reads yet. Tag a read with a genre and it will shelve here.
          </p>
        ) : (
          <ul className="space-y-1">
            {visibleShelves.map((s) => {
              const on = s.slug === activeTag;
              return (
                <li key={s.slug}>
                  <Link
                    href={`/discover?tag=${s.slug}&tab=${tab}${
                      showAllTags ? "&all=1" : ""
                    }`}
                    className={`flex items-center justify-between gap-2 rounded-card px-4 py-2.5 no-underline transition-colors ${
                      on
                        ? "bg-brass/[0.12] text-brass"
                        : "text-ink-soft hover:bg-white/[0.04] hover:text-ink"
                    }`}
                  >
                    <span className="truncate">#{s.slug}</span>
                    <span className="shrink-0 font-mono text-xs text-ink-faint">
                      {s.count}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {shelves.length > SIDEBAR_LIMIT && (
          <Link
            href={`/discover?${new URLSearchParams({
              ...(activeTag ? { tag: activeTag } : {}),
              tab,
              ...(showAllTags ? {} : { all: "1" }),
            }).toString()}`}
            className="mt-4 inline-block font-mono text-xs text-brass no-underline hover:text-brass-light"
          >
            {showAllTags ? "← fewer tags" : `all ${shelves.length} tags →`}
          </Link>
        )}
      </aside>

      {/* ---- Discover ---- */}
      <div>
        <h1 className="font-display text-5xl font-bold text-cream">Discover</h1>

        <form action="/discover" method="get" className="mt-6">
          {activeTag && <input type="hidden" name="tag" value={activeTag} />}
          <input type="hidden" name="tab" value={tab} />
          <input
            type="search"
            name="q"
            defaultValue={rawQ}
            placeholder="Search reads, readers, keywords…"
            className="input py-4 text-base"
            aria-label="Search"
          />
        </form>

        {/* Tabs */}
        <div className="mt-6 flex items-center gap-7 border-b border-white/[0.06]">
          {(["readers", "reads"] as const).map((t) => (
            <Link
              key={t}
              href={tabHref(t)}
              className={`-mb-px border-b-2 px-1 pb-3 text-sm capitalize no-underline transition-colors ${
                tab === t
                  ? "border-brass text-brass"
                  : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {t}
            </Link>
          ))}

          {activeTag && user && !q && (
            <span className="ml-auto pb-2">
              <TagFollowButton
                key={activeTag}
                tag={activeTag}
                initialFollowing={followedTags.has(activeTag)}
              />
            </span>
          )}
        </div>

        {/* Context line */}
        <p className="mt-4 text-sm text-ink-faint">
          {q ? (
            <>
              Results for &ldquo;{rawQ}&rdquo;.{" "}
              <Link href={`/discover?tag=${activeTag ?? ""}`} className="link">
                clear search
              </Link>
            </>
          ) : activeTag ? (
            tab === "readers" ? (
              <>Readers who write about {genreLabel(activeTag)}.</>
            ) : (
              <>Reads shelved under {genreLabel(activeTag)}.</>
            )
          ) : null}
        </p>

        {/* ---- Panel ---- */}
        <div className="mt-2">
          {tab === "readers" ? (
            readers.length === 0 ? (
              <div className="card mt-4 p-8 text-center text-ink-faint">
                No readers on this shelf yet.
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.06]">
                {readers.map((r) => {
                  const mutual = mutualOf(r.id);
                  return (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center gap-4 py-5"
                    >
                      <Link href={`/profile/${r.username}`}>
                        <Avatar
                          name={r.display_name ?? r.username}
                          icon={r.avatar_icon}
                          size={44}
                        />
                      </Link>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/profile/${r.username}`}
                          className="font-semibold text-ink no-underline hover:text-brass"
                        >
                          {r.display_name ?? `@${r.username}`}
                        </Link>
                        <p className="truncate text-sm text-ink-soft">
                          {r.bio ?? `@${r.username}`}
                        </p>
                      </div>

                      {r.books && (
                        <span className="flex items-center gap-3">
                          <BookCover
                            coverId={r.books.cover_id}
                            title={r.books.title}
                            size="S"
                          />
                          <span className="font-mono text-sm text-ink-soft">
                            reading {r.books.title}
                          </span>
                        </span>
                      )}

                      {mutual > 0 && (
                        <span className="font-mono text-xs text-ink-faint">
                          {mutual} mutual {mutual === 1 ? "shelf" : "shelves"}
                        </span>
                      )}

                      {user && (
                        <FollowButton
                          targetId={r.id}
                          initialStatus={statusByUser.get(r.id) ?? "none"}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )
          ) : reads.length === 0 ? (
            <div className="card mt-4 p-8 text-center text-ink-faint">
              No reads on this shelf yet.
            </div>
          ) : (
            <div className="mt-4 gap-5 space-y-5 xl:columns-2">
              {reads.map((post) => (
                <div key={post.id} className="break-inside-avoid">
                  <PostCard
                    post={post}
                    currentUserId={user?.id}
                    followStatus={statusByUser.get(post.author_id) ?? "none"}
                    variant="feed"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
