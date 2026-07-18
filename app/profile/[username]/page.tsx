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
import { EditableAvatar } from "@/components/EditableAvatar";
import { PeopleStat, type Person } from "@/components/PeopleStat";
import { Shelf } from "@/components/Shelf";
import { StreakCard } from "@/components/StreakCard";
import { ProfileTabs } from "@/components/ProfileTabs";
import type { ReadBook } from "@/components/ReadShelf";
import type { PostKind } from "@/lib/constants";
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
      "id, username, display_name, bio, reading_progress, is_private, avatar_icon, books!currently_reading (title, author, cover_id)"
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

  // Follower / following lists (accepted relationships only). The counts come
  // from the same rows, so the stat and the panel behind it always agree.
  const [{ data: followerRows }, { data: followingRows }] = await Promise.all([
    supabase
      .from("follows")
      .select(
        "follower_id, profiles!follower_id (id, username, display_name, avatar_icon)"
      )
      .eq("following_id", profile.id)
      .eq("status", "accepted")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("follows")
      .select(
        "following_id, profiles!following_id (id, username, display_name, avatar_icon)"
      )
      .eq("follower_id", profile.id)
      .eq("status", "accepted")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const toPeople = (rows: unknown): Person[] =>
    ((rows ?? []) as { profiles: Person | null }[])
      .map((r) => r.profiles)
      .filter((p): p is Person => !!p);

  const followerList = toPeople(followerRows);
  const followingList = toPeople(followingRows);
  const followers = followerList.length;
  const following = followingList.length;

  // Content is only fetched/shown when the viewer is allowed to see it.
  let feed: FeedPost[] = [];
  let shelf: ReadBook[] = [];
  let streak = { current: 0, best: 0 };
  const currentBook = canView ? (profile.books as unknown as CurrentBook) : null;
  const progress = (profile.reading_progress as number) ?? 0;

  if (canView) {
    const [{ data: posts }, { data: read }, { data: streakRows }] =
      await Promise.all([
        supabase
          .from("feed_posts")
          .select("*")
          .eq("author_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("read_books")
          .select("book_id, finished_at, books ( title, author, cover_id )")
          .eq("user_id", profile.id)
          .order("finished_at", { ascending: false }),
        supabase.rpc("reading_streak", { uid: profile.id }),
      ]);

    feed = (posts ?? []) as FeedPost[];
    shelf = (
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

    const row = (
      streakRows as unknown as { current_days: number; best_days: number }[] | null
    )?.[0];
    streak = { current: row?.current_days ?? 0, best: row?.best_days ?? 0 };
  }

  // Reads split by kind for the tab bar. Older multi-section reads fall back to
  // whichever section they actually carry.
  const kindOf = (p: FeedPost): PostKind =>
    p.kind ?? (p.text_review ? "review" : p.text_quote ? "quote" : "note");
  const byKind = (k: PostKind) => feed.filter((p) => kindOf(p) === k);
  const reviews = byKind("review");
  const quotes = byKind("quote");
  const notes = byKind("note");

  function readList(posts: FeedPost[], emptyLine: string) {
    if (posts.length === 0) {
      return (
        <div className="card p-8 text-center">
          <p className="font-display text-lg text-ink-soft">{emptyLine}</p>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={user?.id}
            followStatus={myStatus}
            compact
          />
        ))}
      </div>
    );
  }

  return (
    <div className="profile-theme">
      {!canView ? (
        <div className="space-y-6">
          <ProfileCard
            profile={profile}
            displayName={displayName}
            isSelf={isSelf}
            isPrivate={isPrivate}
            followers={followers}
            following={following}
            followerList={followerList}
            followingList={followingList}
            booksRead={0}
          />
          <div className="card p-8 text-center">
            <p className="font-display text-xl text-ink">
              This account is private
            </p>
            <p className="mt-1 text-sm text-ink-faint">
              {myStatus === "pending"
                ? "Your follow request is pending approval."
                : "Follow this reader to see their notes and reading."}
            </p>
            {user && (
              <div className="mt-4 flex justify-center">
                <FollowButton targetId={profile.id} initialStatus={myStatus} />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
          {/* ---- Left rail ---- */}
          <aside className="space-y-6">
            <ProfileCard
              profile={profile}
              displayName={displayName}
              isSelf={isSelf}
              isPrivate={isPrivate}
              followers={followers}
              following={following}
              followerList={followerList}
              followingList={followingList}
              booksRead={shelf.length}
            />

            {!isSelf && user && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  {myStatus === "accepted" && <AskButton targetId={profile.id} />}
                  <FollowButton targetId={profile.id} initialStatus={myStatus} />
                </div>
                <BlockButton targetId={profile.id} initialBlocked={iBlockedThem} />
              </div>
            )}

            <section className="card p-5">
              {isSelf ? (
                <CurrentlyReadingEditor current={currentBook} progress={progress} />
              ) : (
                <>
                  <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-faint">
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
                        <span className="mt-1 block font-mono text-xs text-ink-faint">
                          {progress}% read
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-ink-faint">
                      Not reading anything yet.
                    </p>
                  )}
                </>
              )}
            </section>

            <StreakCard current={streak.current} best={streak.best} />

            {isSelf && (
              <section className="card p-5">
                <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-faint">
                  Share a Read
                </h3>
                <PostComposer />
              </section>
            )}
          </aside>

          {/* ---- Tabs ---- */}
          <ProfileTabs
            counts={{
              shelf: shelf.length,
              reviews: reviews.length,
              quotes: quotes.length,
              notes: notes.length,
            }}
            shelf={
              <div className="space-y-8">
                <Shelf books={shelf} isSelf={isSelf} />

                {/* The shelf doubles as an overview: the latest reads of every
                    kind sit below the books. */}
                <div>
                  <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-ink-faint">
                    Recent reads
                  </h2>
                  {readList(
                    feed.slice(0, 5),
                    isSelf
                      ? "No notes, quotes or reviews yet. Share your first read."
                      : "No notes, quotes or reviews yet."
                  )}
                </div>
              </div>
            }
            reviews={readList(reviews, "No reviews yet.")}
            quotes={readList(quotes, "No quotes kept yet.")}
            notes={readList(notes, "No notes yet.")}
          />
        </div>
      )}
    </div>
  );
}

/** The left-rail identity card: avatar, name, handle, bio, and the three stats. */
function ProfileCard({
  profile,
  displayName,
  isSelf,
  isPrivate,
  followers,
  following,
  followerList,
  followingList,
  booksRead,
}: {
  profile: Record<string, unknown>;
  displayName: string;
  isSelf: boolean;
  isPrivate: boolean;
  followers: number;
  following: number;
  followerList: Person[];
  followingList: Person[];
  booksRead: number;
}) {
  return (
    <section className="card p-6 text-center">
      <div className="flex justify-center">
        {isSelf ? (
          <EditableAvatar
            name={displayName}
            current={(profile.avatar_icon as string | null) ?? null}
          />
        ) : (
          <Avatar
            name={displayName}
            icon={(profile.avatar_icon as string | null) ?? null}
            size={104}
          />
        )}
      </div>

      <div className="mt-4">
        {isSelf ? (
          <div className="flex justify-center">
            <EditableName current={displayName} />
          </div>
        ) : (
          <h1 className="font-display text-3xl font-bold text-ink">
            {displayName}
          </h1>
        )}
        <p className="mt-0.5 flex items-center justify-center gap-1.5 font-mono text-sm text-ink-faint">
          @{profile.username as string}
          {isPrivate && (
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="currentColor"
              role="img"
              aria-label="Private account"
            >
              <title>Private account</title>
              <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm0 2a3 3 0 0 1 3 3v3H9V7a3 3 0 0 1 3-3z" />
            </svg>
          )}
        </p>
      </div>

      {isSelf ? (
        <EditableBio current={(profile.bio as string | null) ?? null} />
      ) : (
        !!profile.bio && (
          <p className="mt-4 font-display text-sm italic leading-relaxed text-ink-soft">
            {profile.bio as string}
          </p>
        )
      )}

      <hr className="my-5 border-0 border-t border-white/10" />

      <div className="flex items-start justify-center gap-5">
        <PeopleStat
          label="Followers"
          count={followers}
          people={followerList}
          emptyLine="No followers yet."
        />
        <PeopleStat
          label="Following"
          count={following}
          people={followingList}
          emptyLine="Not following anyone yet."
        />
        <div className="px-2 py-1">
          <span className="stat-num text-ink">{booksRead}</span>
          <span className="stat-label">Books</span>
        </div>
      </div>
    </section>
  );
}
