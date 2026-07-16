import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { BookCover } from "@/components/BookCover";
import { PostCard, type FeedPost } from "@/components/PostCard";
import { PostComposer } from "@/components/PostComposer";
import { FollowButton } from "@/components/FollowButton";
import { BlockButton } from "@/components/BlockButton";
import { AskButton } from "@/components/AskButton";
import { CurrentlyReadingEditor } from "@/components/CurrentlyReadingEditor";
import { EditableName } from "@/components/EditableName";
import { EditableBio } from "@/components/EditableBio";
import { ReadShelf, type ReadBook } from "@/components/ReadShelf";
import { bannerBackground } from "@/lib/theme";
import type { FollowStatus } from "@/app/actions";

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
      "id, username, display_name, bio, reading_progress, accent_color, banner_style, is_private, books!currently_reading (title, author, cover_id)"
    )
    .eq("username", params.username)
    .maybeSingle();

  if (!profile) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isSelf = user?.id === profile.id;

  // Relationship state with this profile.
  let blockedByThem = false;
  let iBlockedThem = false;
  let myStatus: FollowStatus = "none";
  if (user && !isSelf) {
    const [{ data: rpcBlocked }, { data: myBlock }, { data: myFollow }] =
      await Promise.all([
        supabase.rpc("i_am_blocked_by", { target: profile.id }),
        supabase
          .from("blocks")
          .select("blocked_id")
          .eq("blocker_id", user.id)
          .eq("blocked_id", profile.id)
          .maybeSingle(),
        supabase
          .from("follows")
          .select("status")
          .eq("follower_id", user.id)
          .eq("following_id", profile.id)
          .maybeSingle(),
      ]);
    blockedByThem = rpcBlocked === true;
    iBlockedThem = !!myBlock;
    myStatus = (myFollow?.status as FollowStatus) ?? "none";
  }

  const accent = (profile.accent_color as string) ?? "#b1934f";
  const banner = (profile.banner_style as string) ?? "gradient";
  const displayName = profile.display_name ?? profile.username;
  const isPrivate = (profile.is_private as boolean) ?? false;
  const canView = isSelf || !isPrivate || myStatus === "accepted";

  // If this reader has blocked the viewer, show nothing further.
  if (blockedByThem) {
    return (
      <div className="mx-auto max-w-prose">
        <div className="card p-8 text-center">
          <p className="font-display text-xl text-ink">Profile unavailable</p>
          <p className="mt-1 text-sm text-ink-faint">
            This account isn&rsquo;t available to you.
          </p>
        </div>
      </div>
    );
  }

  // Follower / following counts (accepted relationships only).
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", profile.id)
      .eq("status", "accepted"),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profile.id)
      .eq("status", "accepted"),
  ]);

  // Content is only fetched/shown when the viewer is allowed to see it.
  let feed: FeedPost[] = [];
  let readShelf: ReadBook[] = [];
  const currentBook = canView ? (profile.books as unknown as CurrentBook) : null;
  const progress = (profile.reading_progress as number) ?? 0;

  if (canView) {
    const [{ data: posts }, { data: read }] = await Promise.all([
      supabase
        .from("feed_posts")
        .select("*")
        .eq("author_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("read_books")
        .select("book_id, finished_at, books ( title, author, cover_id )")
        .eq("user_id", profile.id)
        .order("finished_at", { ascending: false }),
    ]);
    feed = (posts ?? []) as FeedPost[];
    readShelf = (
      (read ?? []) as unknown as {
        book_id: string;
        books: {
          title: string;
          author: string | null;
          cover_id: number | null;
        } | null;
      }[]
    ).map((r) => ({
      book_id: r.book_id,
      title: r.books?.title ?? "Untitled",
      author: r.books?.author ?? null,
      cover_id: r.books?.cover_id ?? null,
    }));
  }

  return (
    <div className="space-y-6">
      {/* ---- Profile header ---- */}
      <header className="card overflow-hidden">
        <div
          className="h-28 sm:h-32"
          style={{ background: bannerBackground(accent, banner) }}
        />
        <div className="px-5 pb-5 sm:px-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <Avatar
                name={displayName}
                size={104}
                className="-mt-12 !ring-4 !ring-parchment"
              />
              <div className="pb-1">
                {isSelf ? (
                  <EditableName current={displayName} />
                ) : (
                  <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
                    {displayName}
                  </h1>
                )}
                <p className="font-mono text-sm text-ink-faint">
                  @{profile.username}
                  {isPrivate && <span className="ml-2">🔒 Private</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 pb-1">
              <div className="text-center">
                <span className="stat-num" style={{ color: accent }}>
                  {followers ?? 0}
                </span>
                <span className="stat-label">Followers</span>
              </div>
              <div className="text-center">
                <span className="stat-num" style={{ color: accent }}>
                  {following ?? 0}
                </span>
                <span className="stat-label">Following</span>
              </div>
              {!isSelf && user && (
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    {myStatus === "accepted" && <AskButton targetId={profile.id} />}
                    <FollowButton targetId={profile.id} initialStatus={myStatus} />
                  </div>
                  <BlockButton targetId={profile.id} initialBlocked={iBlockedThem} />
                </div>
              )}
            </div>
          </div>

          {isSelf ? (
            <EditableBio current={(profile.bio as string | null) ?? null} />
          ) : (
            profile.bio && (
              <p className="mt-4 max-w-prose text-ink-soft">{profile.bio}</p>
            )
          )}
        </div>
      </header>

      {/* ---- Private gate for non-approved viewers ---- */}
      {!canView ? (
        <div className="card p-8 text-center">
          <p className="font-display text-xl text-ink">🔒 This account is private</p>
          <p className="mt-1 text-sm text-ink-faint">
            {myStatus === "pending"
              ? "Your follow request is pending approval."
              : "Follow this reader to see their notes and reading."}
          </p>
        </div>
      ) : (
        /* ---- Dashboard ---- */
        <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
          <aside className="space-y-6">
            {isSelf && (
              <section className="card p-5">
                <h3 className="section-title mb-3 text-lg">Share a Read</h3>
                <PostComposer />
              </section>
            )}

            <section className="card p-5">
              {isSelf ? (
                <CurrentlyReadingEditor current={currentBook} progress={progress} />
              ) : (
                <>
                  <h3 className="section-title mb-3 text-lg">
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
                          <span style={{ width: `${progress}%`, background: accent }} />
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
              <h3 className="section-title mb-3 text-lg">
                Books Read{" "}
                <span className="font-mono text-xs text-ink-faint">
                  ({readShelf.length})
                </span>
              </h3>
              <ReadShelf books={readShelf} isSelf={isSelf} />
            </section>

          </aside>

          <section className="space-y-4">
            <div
              className="flex items-center gap-4 border-b-2 pb-1"
              style={{ borderColor: accent }}
            >
              <span className="pb-1 text-sm font-semibold text-cream">Reads</span>
            </div>
            {feed.length === 0 ? (
              <div className="card p-6 text-center">
                <p className="font-display text-lg text-ink-soft">No reads yet.</p>
                <p className="mt-1 text-sm text-ink-faint">
                  {isSelf
                    ? "Share your first read above."
                    : "This reader hasn't shared any reads yet."}
                </p>
              </div>
            ) : (
              feed.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={user?.id}
                  followStatus={myStatus}
                />
              ))
            )}
          </section>
        </div>
      )}
    </div>
  );
}
