import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { BookCover } from "@/components/BookCover";
import { PostCard, type FeedPost } from "@/components/PostCard";
import { PostComposer } from "@/components/PostComposer";
import { FollowButton } from "@/components/FollowButton";
import { CurrentlyReadingEditor } from "@/components/CurrentlyReadingEditor";
import { BookLookup } from "@/components/BookLookup";

type CurrentBook = {
  title: string;
  author: string | null;
  cover_id: number | null;
} | null;

export default async function ProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const supabase = createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      // FK-hint embed: single book row (or null) under the `books` key.
      "id, username, display_name, bio, reading_progress, books!currently_reading (title, author, cover_id)"
    )
    .eq("username", params.username)
    .maybeSingle();

  if (!profile) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isSelf = user?.id === profile.id;

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

  // Counts (followers + following) and this reader's notes, in parallel.
  const [{ count: followers }, { count: following }, { data: posts }] =
    await Promise.all([
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profile.id),
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profile.id),
      supabase
        .from("feed_posts")
        .select("*")
        .eq("author_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  const currentBook = profile.books as unknown as CurrentBook;
  const progress = (profile.reading_progress as number) ?? 0;
  const feed = (posts ?? []) as FeedPost[];
  const displayName = profile.display_name ?? profile.username;

  return (
    <div className="space-y-6">
      {/* ---- Profile header ---- */}
      <header className="card overflow-hidden">
        <div className="h-28 bg-shelf sm:h-32" />
        <div className="px-5 pb-5 sm:px-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <Avatar
                name={displayName}
                size={104}
                className="-mt-12 !ring-4 !ring-parchment"
              />
              <div className="pb-1">
                <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
                  {displayName}
                </h1>
                <p className="font-mono text-sm text-ink-faint">
                  @{profile.username}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 pb-1">
              <div className="text-center">
                <span className="stat-num">{followers ?? 0}</span>
                <span className="stat-label">Followers</span>
              </div>
              <div className="text-center">
                <span className="stat-num">{following ?? 0}</span>
                <span className="stat-label">Following</span>
              </div>
              {!isSelf && user && (
                <FollowButton
                  targetId={profile.id}
                  initialFollowing={isFollowing}
                />
              )}
            </div>
          </div>

          {profile.bio && (
            <p className="mt-4 max-w-prose text-ink-soft">{profile.bio}</p>
          )}
        </div>
      </header>

      {/* ---- Dashboard: left rail + notes ---- */}
      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        {/* Left rail */}
        <aside className="space-y-6">
          {isSelf && (
            <section className="card p-5">
              <h3 className="mb-3 font-display text-lg text-ink">Create a Post</h3>
              <PostComposer />
            </section>
          )}

          <section className="card p-5">
            {isSelf ? (
              <CurrentlyReadingEditor current={currentBook} progress={progress} />
            ) : (
              <>
                <h3 className="mb-3 font-display text-lg text-ink">
                  Currently Reading
                </h3>
                {currentBook ? (
                  <div className="flex gap-3">
                    <BookCover
                      coverId={currentBook.cover_id}
                      title={currentBook.title}
                      size="M"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-base font-semibold text-ink">
                        {currentBook.title}
                      </p>
                      <p className="truncate text-sm text-ink-faint">
                        {currentBook.author ?? "Unknown author"}
                      </p>
                      <div className="progress mt-3">
                        <span style={{ width: `${progress}%` }} />
                      </div>
                      <span className="mt-1 block text-xs font-mono text-ink-faint">
                        {progress}% read
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-ink-faint">Not reading anything yet.</p>
                )}
              </>
            )}
          </section>

          <section className="card p-5">
            <div className="mb-3 flex items-center gap-4 border-b border-parchment-dark">
              <span className="tab tab-active">Search</span>
            </div>
            <BookLookup canSetReading={isSelf} />
          </section>
        </aside>

        {/* Notes feed */}
        <section className="space-y-4">
          <div className="flex items-center gap-4 border-b border-brass/25 pb-1">
            <span className="tab tab-active">Notes</span>
          </div>
          {feed.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="font-display text-lg text-ink-soft">No notes yet.</p>
              <p className="mt-1 text-sm text-ink-faint">
                {isSelf
                  ? "Share your first thought above."
                  : "This reader hasn't posted yet."}
              </p>
            </div>
          ) : (
            feed.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </section>
      </div>
    </div>
  );
}
