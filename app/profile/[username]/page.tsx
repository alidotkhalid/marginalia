import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookCover } from "@/components/BookCover";
import { PostCard, type FeedPost } from "@/components/PostCard";
import { FollowButton } from "@/components/FollowButton";
import { CurrentlyReadingEditor } from "@/components/CurrentlyReadingEditor";

// A reader's page: bio, what they're currently reading (cover from Open Library),
// and the full chronological history of their notes.
export default async function ProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const supabase = createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      // Embed the books row via the currently_reading FK column (PostgREST
      // FK-hint syntax: table!fk_column). Returned under the `books` key.
      "id, username, display_name, bio, currently_reading, books!currently_reading (title, author, cover_id)"
    )
    .eq("username", params.username)
    .maybeSingle();

  if (!profile) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isSelf = user?.id === profile.id;

  // Is the viewer already following this profile?
  let isFollowing = false;
  if (user && !isSelf) {
    const { data } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("following_id", profile.id)
      .maybeSingle();
    isFollowing = !!data;
  }

  // Counts + this reader's own notes.
  const [{ count: followers }, { data: posts }] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", profile.id),
    supabase
      .from("feed_posts")
      .select("*")
      .eq("author_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const currentBook = profile.books as
    | { title: string; author: string | null; cover_id: number | null }
    | null;
  const feed = (posts ?? []) as FeedPost[];

  return (
    <div className="space-y-8">
      <header className="card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl">
              {profile.display_name ?? `@${profile.username}`}
            </h1>
            <p className="font-mono text-sm text-ink-faint">@{profile.username}</p>
          </div>
          {!isSelf && user && (
            <FollowButton targetId={profile.id} initialFollowing={isFollowing} />
          )}
        </div>

        {profile.bio && (
          <p className="mt-3 font-serif leading-relaxed text-ink-soft">
            {profile.bio}
          </p>
        )}

        <p className="mt-3 font-mono text-xs text-ink-faint">
          {followers ?? 0} follower{followers === 1 ? "" : "s"}
        </p>

        {isSelf ? (
          // Your own profile: an editable Currently Reading control.
          <CurrentlyReadingEditor current={currentBook} />
        ) : (
          currentBook && (
            <div className="mt-4 flex items-center gap-3 border-t border-parchment-dark pt-4">
              <BookCover
                coverId={currentBook.cover_id}
                title={currentBook.title}
                size="M"
              />
              <div>
                <span className="tag-reading">Currently reading</span>
                <p className="mt-1 font-display text-lg text-ink">
                  {currentBook.title}
                </p>
                <p className="text-sm text-ink-faint">
                  {currentBook.author ?? "Unknown author"}
                </p>
              </div>
            </div>
          )
        )}
      </header>

      <section className="space-y-4">
        <h2 className="font-display text-xl">Notes</h2>
        {feed.length === 0 ? (
          <p className="text-sm text-ink-faint">No notes yet.</p>
        ) : (
          feed.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </section>
    </div>
  );
}
