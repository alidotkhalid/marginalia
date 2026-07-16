import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PostCard, type FeedPost } from "@/components/PostCard";
import type { FollowStatus } from "@/app/actions";

// "Saved Reads" — every read the user has bookmarked. The bookmark on each card
// removes it here.
export default async function SavedPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: posts }, { data: follows }] = await Promise.all([
    supabase
      .from("feed_posts")
      .select("*")
      .eq("saved_by_me", true)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("follows").select("following_id, status").eq("follower_id", user.id),
  ]);

  const statusByUser = new Map<string, FollowStatus>();
  for (const f of follows ?? []) {
    statusByUser.set(f.following_id, (f.status as FollowStatus) ?? "accepted");
  }

  const feed = (posts ?? []) as FeedPost[];

  return (
    <div className="mx-auto max-w-prose space-y-6">
      <div>
        <h1 className="mb-1 font-display text-3xl font-bold text-cream">
          Saved reads
        </h1>
        <p className="text-sm text-cream-soft">
          Reads you&rsquo;ve bookmarked. Tap the bookmark to remove one.
        </p>
      </div>

      {feed.length === 0 ? (
        <div className="card p-6 text-center text-ink-faint">
          You haven&rsquo;t saved any reads yet.
        </div>
      ) : (
        <div className="space-y-4">
          {feed.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user.id}
              followStatus={statusByUser.get(post.author_id) ?? "none"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
