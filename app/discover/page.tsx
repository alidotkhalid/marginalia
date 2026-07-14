import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BookCover } from "@/components/BookCover";
import { FollowButton } from "@/components/FollowButton";

type ReaderRow = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  books: { title: string; author: string | null; cover_id: number | null } | null;
};

// A quiet directory of readers to follow — no ranking, just recently joined
// members and what they're reading. Newest first.
export default async function DiscoverPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Everyone except yourself, with their Currently Reading book embedded.
  let query = supabase
    .from("profiles")
    .select(
      "id, username, display_name, bio, books!currently_reading (title, author, cover_id)"
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (user) query = query.neq("id", user.id);

  const { data: readers } = await query;

  // Which of them do you already follow?
  let followingSet = new Set<string>();
  if (user) {
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);
    followingSet = new Set((follows ?? []).map((f) => f.following_id));
  }

  // Supabase's untyped client infers embedded books as an array, but the
  // currently_reading FK is many-to-one, so at runtime it's a single object or
  // null. Bridge the inferred type to our runtime-accurate ReaderRow shape.
  const list = (readers ?? []) as unknown as ReaderRow[];

  return (
    <div className="space-y-6">
      <section>
        <h1 className="mb-1 font-display text-3xl">Find readers</h1>
        <p className="text-sm text-ink-faint">
          Follow people whose reading you&rsquo;d like on your feed.
        </p>
      </section>

      <hr className="rule" />

      {list.length === 0 ? (
        <p className="text-sm text-ink-faint">No other readers yet. Invite a friend.</p>
      ) : (
        <ul className="space-y-4">
          {list.map((r) => (
            <li key={r.id} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/profile/${r.username}`}
                    className="font-display text-lg text-ink no-underline hover:text-forest"
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
                    initialFollowing={followingSet.has(r.id)}
                  />
                )}
              </div>

              {r.books && (
                <div className="mt-3 flex items-center gap-3 border-t border-parchment-dark pt-3">
                  <BookCover
                    coverId={r.books.cover_id}
                    title={r.books.title}
                    size="S"
                  />
                  <div className="min-w-0 text-sm">
                    <span className="tag-reading">Reading</span>
                    <p className="mt-1 truncate font-display text-ink-soft">
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
