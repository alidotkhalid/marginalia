import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { BookCover } from "@/components/BookCover";
import { FollowButton } from "@/components/FollowButton";
import { PostCard, type FeedPost } from "@/components/PostCard";
import { TagFollowButton } from "@/components/TagFollowButton";
import type { FollowStatus } from "@/app/actions";
import { GENRES, isGenre, genreLabel } from "@/lib/genres";

type ReaderRow = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_icon: string | null;
  books: { title: string; author: string | null; cover_id: number | null } | null;
};

// Plain GET form — navigating to /discover?q=… triggers the loading spinner and
// re-renders server-side. No client JS needed.
function SearchForm({ defaultValue }: { defaultValue: string }) {
  return (
    <form action="/discover" method="get">
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search reads, readers, keywords…"
        className="input"
        aria-label="Search"
      />
    </form>
  );
}

function GenreChips({
  active,
  followed,
}: {
  active: string | null;
  followed?: Set<string>;
}) {
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
          {followed?.has(g.slug) ? "★ " : ""}#{g.slug}
        </Link>
      ))}
    </div>
  );
}

// A single reader row with follow button.
function ReaderCard({
  r,
  showFollow,
  status,
}: {
  r: ReaderRow;
  showFollow: boolean;
  status: FollowStatus;
}) {
  return (
    <li className="card p-5">
      <div className="flex items-start gap-4">
        <Link href={`/profile/${r.username}`}>
          <Avatar name={r.display_name ?? r.username} icon={r.avatar_icon} size={52} />
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
        {showFollow && <FollowButton targetId={r.id} initialStatus={status} />}
      </div>

      {r.books && (
        <div className="mt-4 flex items-center gap-3 border-t border-parchment-dark pt-3">
          <BookCover coverId={r.books.cover_id} title={r.books.title} size="S" />
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
  );
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: { genre?: string; q?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sanitize the query so it can't break the PostgREST filter string.
  const rawQ = (searchParams.q ?? "").trim();
  const q = rawQ.replace(/[,()%*\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);

  const activeGenre =
    searchParams.genre && isGenre(searchParams.genre) ? searchParams.genre : null;

  // Follow status + blocks + followed tags (used across the views), fetched once.
  const statusByUser = new Map<string, FollowStatus>();
  let blockedIds = new Set<string>();
  let followedTags = new Set<string>();
  if (user) {
    const [{ data: follows }, { data: myBlocks }, { data: tags }] =
      await Promise.all([
        supabase.from("follows").select("following_id, status").eq("follower_id", user.id),
        supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id),
        supabase.from("tag_follows").select("tag").eq("user_id", user.id),
      ]);
    for (const f of follows ?? []) {
      statusByUser.set(f.following_id, (f.status as FollowStatus) ?? "accepted");
    }
    blockedIds = new Set((myBlocks ?? []).map((b) => b.blocked_id));
    followedTags = new Set((tags ?? []).map((t) => t.tag));
  }

  // ---- Search view ----
  if (q) {
    const [{ data: profs }, { data: postRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, username, display_name, bio, avatar_icon, books!currently_reading (title, author, cover_id)"
        )
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .limit(20),
      supabase
        .from("feed_posts")
        .select("*")
        .or(
          `text_note.ilike.%${q}%,text_quote.ilike.%${q}%,text_review.ilike.%${q}%`
        )
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    const readers = ((profs ?? []) as unknown as ReaderRow[]).filter(
      (r) => r.id !== user?.id && !blockedIds.has(r.id)
    );
    const posts = (postRows ?? []) as FeedPost[];

    return (
      <div className="mx-auto max-w-prose space-y-6">
        <section>
          <h1 className="mb-3 font-display text-3xl font-bold text-cream">Search</h1>
          <SearchForm defaultValue={rawQ} />
        </section>

        <section className="space-y-3">
          <h2 className="section-title text-lg">Readers</h2>
          {readers.length === 0 ? (
            <p className="text-sm text-cream-soft">No readers match &ldquo;{q}&rdquo;.</p>
          ) : (
            <ul className="space-y-4">
              {readers.map((r) => (
                <ReaderCard
                  key={r.id}
                  r={r}
                  showFollow={!!user}
                  status={statusByUser.get(r.id) ?? "none"}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="section-title text-lg">Reads</h2>
          {posts.length === 0 ? (
            <p className="text-sm text-cream-soft">No reads match &ldquo;{q}&rdquo;.</p>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={user?.id}
                  followStatus={statusByUser.get(post.author_id) ?? "none"}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // ---- Genre view ----
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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-3xl font-bold text-brass">
              #{activeGenre}
            </h1>
            {user && (
              <TagFollowButton
                key={activeGenre}
                tag={activeGenre}
                initialFollowing={followedTags.has(activeGenre)}
              />
            )}
          </div>
          <SearchForm defaultValue="" />
        </section>

        <p className="text-sm text-cream-soft">Reads about {genreLabel(activeGenre)}.</p>
        <GenreChips active={activeGenre} followed={followedTags} />

        {feed.length === 0 ? (
          <div className="card p-6 text-center text-ink-faint">
            No reads in this genre yet.
          </div>
        ) : (
          <div className="space-y-4">
            {feed.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                followStatus={statusByUser.get(post.author_id) ?? "none"}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ---- Default: readers directory ----
  let query = supabase
    .from("profiles")
    .select(
      "id, username, display_name, bio, avatar_icon, books!currently_reading (title, author, cover_id)"
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (user) query = query.neq("id", user.id);

  const { data: readers } = await query;
  const list = ((readers ?? []) as unknown as ReaderRow[]).filter(
    (r) => !blockedIds.has(r.id)
  );

  return (
    <div className="mx-auto max-w-prose space-y-6">
      <section>
        <h1 className="mb-1 font-display text-3xl font-bold text-cream">Discover</h1>
        <p className="mb-3 text-sm text-cream-soft">
          Search reads and readers, browse by genre, or find people to follow.
        </p>
        <SearchForm defaultValue="" />
      </section>

      <GenreChips active={null} followed={followedTags} />

      <hr className="rule" />

      {list.length === 0 ? (
        <div className="card p-6 text-center text-ink-faint">
          No other readers yet. Invite a friend.
        </div>
      ) : (
        <ul className="space-y-4">
          {list.map((r) => (
            <ReaderCard
              key={r.id}
              r={r}
              showFollow={!!user}
              status={statusByUser.get(r.id) ?? "none"}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
