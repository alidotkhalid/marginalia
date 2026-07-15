import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { BookCover } from "@/components/BookCover";
import { FollowButton } from "@/components/FollowButton";
import { PostCard, type FeedPost } from "@/components/PostCard";
import type { FollowStatus } from "@/app/actions";
import { GENRES, isGenre, genreLabel } from "@/lib/genres";

type ReaderRow = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  books: { title: string; author: string | null; cover_id: number | null } | null;
};

// A row of genre hashtags for browsing. Highlights the active one.
function GenreChips({ active }: { active: string | null }) {
  return (
    <div className="flex flex-wrap gap-2">
      {active && (
        <Link
          href="/discover"
          className="rounded-pill border border-parchment-dark px-3 py-1 font-mono text-xs text-cream-soft hover:border-brass"
        >
          ✕ clear
        </Link>
      )}
      {GENRES.map((g) => (
        <Link
          key={g.slug}
          href={`/discover?genre=${g.slug}`}
          className={`rounded-pill border px-3 py-1 font-mono text-xs transition-colors ${
            active === g.slug
              ? "border-brass bg-brass/15 text-brass"
              : "border-parchment-dark text-cream-soft hover:border-brass hover:text-brass"
          }`}
        >
          #{g.slug}
        </Link>
      ))}
    </div>
  );
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: { genre?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const activeGenre =
    searchParams.genre && isGenre(searchParams.genre) ? searchParams.genre : null;

  // ---- Genre view: posts tagged with the chosen genre ----
  if (activeGenre) {
    const { data: posts } = await supabase
      .from("feed_posts")
      .select("*")
      .eq("genre", activeGenre)
      .order("created_at", { ascending: false })
      .limit(50);
    const feed = (posts ?? []) as FeedPost[];

    return (
      <div className="mx-auto max-w-prose space-y-6">
        <section>
          <h1 className="mb-1 font-display text-3xl font-bold text-brass">
            #{activeGenre}
          </h1>
          <p className="text-sm text-cream-soft">
            Posts about {genreLabel(activeGenre)}.
          </p>
        </section>

        <GenreChips active={activeGenre} />

        {feed.length === 0 ? (
          <div className="card p-6 text-center text-ink-faint">
            No posts in this genre yet.
          </div>
        ) : (
          <div className="space-y-4">
            {feed.map((post) => (
              <PostCard key={post.id} post={post} currentUserId={user?.id} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---- Default view: readers directory ----
  let query = supabase
    .from("profiles")
    .select(
      "id, username, display_name, bio, books!currently_reading (title, author, cover_id)"
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (user) query = query.neq("id", user.id);

  const { data: readers } = await query;

  const statusByUser = new Map<string, FollowStatus>();
  let blockedIds = new Set<string>();
  if (user) {
    const [{ data: follows }, { data: myBlocks }] = await Promise.all([
      supabase.from("follows").select("following_id, status").eq("follower_id", user.id),
      supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id),
    ]);
    for (const f of follows ?? []) {
      statusByUser.set(f.following_id, (f.status as FollowStatus) ?? "accepted");
    }
    blockedIds = new Set((myBlocks ?? []).map((b) => b.blocked_id));
  }

  const list = ((readers ?? []) as unknown as ReaderRow[]).filter(
    (r) => !blockedIds.has(r.id)
  );

  return (
    <div className="mx-auto max-w-prose space-y-6">
      <section>
        <h1 className="mb-1 font-display text-3xl font-bold text-cream">
          Discover
        </h1>
        <p className="text-sm text-cream-soft">
          Browse posts by genre, or find readers to follow.
        </p>
      </section>

      <GenreChips active={null} />

      <hr className="rule" />

      {list.length === 0 ? (
        <div className="card p-6 text-center text-ink-faint">
          No other readers yet. Invite a friend.
        </div>
      ) : (
        <ul className="space-y-4">
          {list.map((r) => (
            <li key={r.id} className="card p-5">
              <div className="flex items-start gap-4">
                <Link href={`/profile/${r.username}`}>
                  <Avatar name={r.display_name ?? r.username} size={52} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/profile/${r.username}`}
                    className="font-display text-lg font-semibold text-ink no-underline hover:text-brass"
                  >
                    {r.display_name ?? `@${r.username}`}
                  </Link>
                  <p className="font-mono text-xs text-ink-faint">@{r.username}</p>
                  {r.bio && (
                    <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{r.bio}</p>
                  )}
                </div>
                {user && (
                  <FollowButton
                    targetId={r.id}
                    initialStatus={statusByUser.get(r.id) ?? "none"}
                  />
                )}
              </div>

              {r.books && (
                <div className="mt-4 flex items-center gap-3 border-t border-parchment-dark pt-3">
                  <BookCover
                    coverId={r.books.cover_id}
                    title={r.books.title}
                    size="S"
                  />
                  <div className="min-w-0 text-sm">
                    <span className="tag-reading">Reading</span>
                    <p className="mt-1 truncate font-display font-semibold text-ink-soft">
                      {r.books.title}
                    </p>
                    <p className="truncate text-ink-faint">
                      {r.books.author ?? "Unknown author"}
                    </p>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
