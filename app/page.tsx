import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PostComposer, type DraftInit } from "@/components/PostComposer";
import { PostCard, type FeedPost } from "@/components/PostCard";
import type { BookResult } from "@/lib/openlibrary";

// The Feed — a strictly chronological timeline of notes from people you follow
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

  const { data: following } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id)
    .eq("status", "accepted");

  const followingSet = new Set((following ?? []).map((f) => f.following_id));
  const authorIds = [user.id, ...followingSet];

  const roomsCutoff = new Date(Date.now() - 3 * 60_000).toISOString();
  const [{ data: posts }, { count: readersNow }] = await Promise.all([
    supabase
      .from("feed_posts")
      .select("*")
      .in("author_id", authorIds)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("room_participants")
      .select("*", { count: "exact", head: true })
      .gt("last_seen", roomsCutoff),
  ]);

  const feed = (posts ?? []) as FeedPost[];

  return (
    <div className="mx-auto max-w-prose space-y-6">
      <section>
        <h1 className="mb-1 font-display text-3xl font-bold text-cream">
          Today&rsquo;s reading
        </h1>
        <p className="mb-4 text-sm text-cream-soft">
          A quiet, chronological record of what your circle is reading.
        </p>
        <div className="card p-5">
          <PostComposer initialDraft={initialDraft} />
        </div>
      </section>

      <Link
        href="/rooms"
        className="flex items-center justify-between rounded-card border border-brass/30 bg-brass/5 px-5 py-3 no-underline transition-colors hover:border-brass"
      >
        <span className="flex items-center gap-2 text-sm text-cream">
          <span className="relative flex h-2.5 w-2.5">
            {(readersNow ?? 0) > 0 && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-pill bg-forest-light opacity-75" />
            )}
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-pill ${
                (readersNow ?? 0) > 0 ? "bg-forest-light" : "bg-parchment-dark"
              }`}
            />
          </span>
          {readersNow && readersNow > 0
            ? `${readersNow} ${readersNow === 1 ? "reader is" : "readers are"} reading in rooms right now`
            : "No one in the rooms yet — open one"}
        </span>
        <span className="font-mono text-xs text-brass">Rooms →</span>
      </Link>

      <section className="space-y-4">
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
          feed.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user.id}
              followStatus={followingSet.has(post.author_id) ? "accepted" : "none"}
            />
          ))
        )}
      </section>
    </div>
  );
}
