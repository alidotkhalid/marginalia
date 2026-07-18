import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PostComposer, type DraftInit } from "@/components/PostComposer";
import { PostCard, type FeedPost } from "@/components/PostCard";
import { Greeting } from "@/components/Greeting";
import { StreakPanel } from "@/components/StreakPanel";
import { RoomLiveBar } from "@/components/RoomLiveBar";
import type { BookResult } from "@/lib/openlibrary";

type CurrentBook = { title: string } | null;

// The Feed: a strictly chronological timeline of reads from people you follow
// (plus your own). No ranking, no recommendations, no infinite scroll.
export default async function FeedPage({
  searchParams,
}: {
  searchParams: { draft?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <p className="text-center text-cream-soft">
        Please{" "}
        <Link href="/login" className="text-brass hover:text-brass-light">
          log in
        </Link>{" "}
        to read your feed.
      </p>
    );
  }

  // If ?draft=id is present, load that draft into the composer.
  let initialDraft: DraftInit | undefined;
  if (searchParams.draft) {
    const { data: d } = await supabase
      .from("drafts")
      .select("*")
      .eq("id", searchParams.draft)
      .eq("author_id", user.id)
      .maybeSingle();
    if (d) {
      const book: BookResult | null = d.book_olid
        ? {
            olid: d.book_olid as string,
            title: (d.book_title as string) ?? "",
            author: (d.book_author as string | null) ?? null,
            coverId: (d.book_cover_id as number | null) ?? null,
            firstYear: null,
          }
        : null;
      initialDraft = {
        id: d.id as string,
        note: (d.text_note as string | null) ?? "",
        quote: (d.text_quote as string | null) ?? "",
        review: (d.text_review as string | null) ?? "",
        genre: (d.genre as string | null) ?? "",
        book,
      };
    }
  }

  const [{ data: me }, { data: following }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "username, display_name, avatar_icon, reading_progress, books!currently_reading (title)"
      )
      .eq("id", user.id)
      .single(),
    supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .eq("status", "accepted"),
  ]);

  const followingSet = new Set((following ?? []).map((f) => f.following_id));
  const authorIds = [user.id, ...followingSet];
  const myName = me?.display_name ?? me?.username ?? "reader";

  // "Live" means seen in a room in the last three minutes.
  const liveCutoff = new Date(Date.now() - 3 * 60_000).toISOString();
  // The streak bars cover the last seven days, today last.
  const weekStart = new Date(Date.now() - 6 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const [{ data: posts }, { data: live }, { data: days }, { data: streakRows }] =
    await Promise.all([
      supabase
        .from("feed_posts")
        .select("*")
        .in("author_id", authorIds)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("room_participants")
        .select("room_id, user_id, rooms ( id, name )")
        .gt("last_seen", liveCutoff),
      supabase
        .from("activity_days")
        .select("day")
        .eq("user_id", user.id)
        .gte("day", weekStart),
      supabase.rpc("reading_streak", { uid: user.id }),
    ]);

  const feed = (posts ?? []) as FeedPost[];

  // Friends reading right now (people you follow, not you).
  const liveRows = (live ?? []) as unknown as {
    room_id: string;
    user_id: string;
    rooms: { id: string; name: string } | null;
  }[];
  const friendsNow = new Set(
    liveRows.filter((r) => followingSet.has(r.user_id)).map((r) => r.user_id)
  ).size;

  // The busiest live room becomes the banner.
  const byRoom = new Map<string, { id: string; name: string; readers: number }>();
  for (const r of liveRows) {
    if (!r.rooms) continue;
    const found = byRoom.get(r.room_id);
    if (found) found.readers += 1;
    else byRoom.set(r.room_id, { id: r.rooms.id, name: r.rooms.name, readers: 1 });
  }
  const liveRoom =
    [...byRoom.values()].sort((a, b) => b.readers - a.readers)[0] ?? null;

  // Seven booleans, oldest first.
  const activeDays = new Set(
    ((days ?? []) as { day: string }[]).map((d) => String(d.day).slice(0, 10))
  );
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86_400_000)
      .toISOString()
      .slice(0, 10);
    return activeDays.has(d);
  });

  const streak =
    (streakRows as unknown as { current_days: number }[] | null)?.[0]
      ?.current_days ?? 0;
  const currentBook = (me?.books as unknown as CurrentBook) ?? null;

  return (
    <div className="space-y-6">
      <Greeting name={myName} readersNow={friendsNow} />

      {/* Composer beside the streak */}
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <section className="card p-5">
          <PostComposer
            initialDraft={initialDraft}
            variant="compact"
            authorName={myName}
            authorIcon={me?.avatar_icon ?? null}
          />
        </section>

        <StreakPanel
          current={streak}
          week={week}
          currentBook={currentBook?.title ?? null}
          progress={(me?.reading_progress as number) ?? 0}
        />
      </div>

      <RoomLiveBar room={liveRoom} />

      {/* The feed itself, two columns on wide screens */}
      {feed.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="font-display text-lg text-ink-soft">
            Your feed is a blank page.
          </p>
          <p className="mt-1 text-sm text-ink-faint">
            Share your first read above, or{" "}
            <Link href="/discover" className="link">
              find readers to follow
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="gap-5 space-y-5 lg:columns-2">
          {feed.map((post) => (
            <div key={post.id} className="break-inside-avoid">
              <PostCard
                post={post}
                currentUserId={user.id}
                followStatus={
                  followingSet.has(post.author_id) ? "accepted" : "none"
                }
                variant="feed"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
