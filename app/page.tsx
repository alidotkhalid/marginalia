import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PostComposer } from "@/components/PostComposer";
import { PostCard, type FeedPost } from "@/components/PostCard";

// The Feed — a strictly chronological timeline of notes from people you follow
// (plus your own). No ranking, no recommendations, no infinite scroll.
export default async function FeedPage() {
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

  const { data: following } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id)
    .eq("status", "accepted");

  const authorIds = [user.id, ...(following?.map((f) => f.following_id) ?? [])];

  const { data: posts } = await supabase
    .from("feed_posts")
    .select("*")
    .in("author_id", authorIds)
    .order("created_at", { ascending: false })
    .limit(50);

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
          <PostComposer />
        </div>
      </section>

      <section className="space-y-4">
        {feed.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="font-display text-lg text-ink-soft">
              Your feed is a blank page.
            </p>
            <p className="mt-1 text-sm text-ink-faint">
              Post your first note above, or{" "}
              <Link href="/discover" className="link">
                find readers to follow
              </Link>
              .
            </p>
          </div>
        ) : (
          feed.map((post) => (
            <PostCard key={post.id} post={post} currentUserId={user.id} />
          ))
        )}
      </section>
    </div>
  );
}
