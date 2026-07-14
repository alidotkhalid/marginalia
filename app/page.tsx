import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PostComposer } from "@/components/PostComposer";
import { PostCard, type FeedPost } from "@/components/PostCard";

// The Feed — a strictly chronological timeline of notes from people you follow
// (plus your own). No ranking, no recommendations, no infinite scroll: a finite
// page of the most recent notes, oldest reading habits honored.
export default async function FeedPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware redirects unauthenticated users to /login, but guard anyway.
  if (!user) {
    return (
      <p className="text-center text-ink-faint">
        Please <Link href="/login">log in</Link> to read your feed.
      </p>
    );
  }

  // Who does this user follow? Include the user themselves.
  const { data: following } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);

  const authorIds = [
    user.id,
    ...(following?.map((f) => f.following_id) ?? []),
  ];

  // Pull the most recent notes from that set, newest first.
  const { data: posts } = await supabase
    .from("feed_posts")
    .select("*")
    .in("author_id", authorIds)
    .order("created_at", { ascending: false })
    .limit(50);

  const feed = (posts ?? []) as FeedPost[];

  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-1 font-display text-3xl">Today&rsquo;s reading</h1>
        <p className="mb-4 text-sm text-ink-faint">
          A quiet, chronological record of what your circle is reading.
        </p>
        <PostComposer />
      </section>

      <hr className="rule" />

      <section className="space-y-4">
        {feed.length === 0 ? (
          <div className="card p-6 text-center text-ink-faint">
            <p className="font-display text-lg text-ink-soft">
              Your feed is a blank page.
            </p>
            <p className="mt-1 text-sm">
              Post your first note above, or find readers to follow.
            </p>
          </div>
        ) : (
          feed.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </section>
    </div>
  );
}
