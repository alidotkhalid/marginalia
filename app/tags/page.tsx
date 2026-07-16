import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PostCard, type FeedPost } from "@/components/PostCard";
import type { FollowStatus } from "@/app/actions";
import { genreLabel } from "@/lib/genres";

// "Tags you follow" — reads tagged with any genre the reader follows.
export default async function TagsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tagRows } = await supabase
    .from("tag_follows")
    .select("tag")
    .eq("user_id", user.id);
  const tags = (tagRows ?? []).map((t) => t.tag as string);

  let feed: FeedPost[] = [];
  const statusByUser = new Map<string, FollowStatus>();
  if (tags.length > 0) {
    const [{ data: posts }, { data: follows }] = await Promise.all([
      supabase
        .from("feed_posts")
        .select("*")
        .in("genre", tags)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("follows").select("following_id, status").eq("follower_id", user.id),
    ]);
    feed = (posts ?? []) as FeedPost[];
    for (const f of follows ?? []) {
      statusByUser.set(f.following_id, (f.status as FollowStatus) ?? "accepted");
    }
  }

  return (
    <div className="mx-auto max-w-prose space-y-6">
      <div>
        <h1 className="mb-1 font-display text-3xl font-bold text-cream">
          Tags you follow
        </h1>
        <p className="text-sm text-cream-soft">
          Reads from every genre you follow, newest first.
        </p>
      </div>

      {tags.length === 0 ? (
        <div className="card p-6 text-center text-ink-faint">
          You don&rsquo;t follow any tags yet.{" "}
          <Link href="/discover" className="link">
            Follow some in Discover
          </Link>
          .
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <Link
                key={t}
                href={`/discover?genre=${t}`}
                className="rounded-pill border border-brass bg-brass/15 px-3 py-1 font-mono text-xs text-brass"
                title={genreLabel(t) ?? t}
              >
                ★ #{t}
              </Link>
            ))}
          </div>

          {feed.length === 0 ? (
            <div className="card p-6 text-center text-ink-faint">
              No reads on your followed tags yet.
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
        </>
      )}
    </div>
  );
}
