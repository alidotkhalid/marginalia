import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PostCard, type FeedPost } from "@/components/PostCard";
import { TagShelfList, type TagShelf } from "@/components/TagShelfList";
import type { FollowStatus } from "@/app/actions";
import { GENRES } from "@/lib/genres";

// "Tags you follow": every tag on the left to follow, and reads from the ones
// you follow on the right.
export default async function TagsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: tagRows }, { data: genreRows }, { data: follows }] =
    await Promise.all([
      supabase.from("tag_follows").select("tag").eq("user_id", user.id),
      // One aggregated row per tag (the tag_counts view).
      supabase.from("tag_counts").select("tag, posts"),
      supabase
        .from("follows")
        .select("following_id, status")
        .eq("follower_id", user.id),
    ]);

  const tags = (tagRows ?? []).map((t) => t.tag as string);

  const counts = new Map<string, number>(
    ((genreRows ?? []) as { tag: string; posts: number }[]).map((r) => [
      r.tag,
      r.posts,
    ])
  );

  // Every genre, busiest first, so there is always something to follow.
  const shelves: TagShelf[] = GENRES.map((g) => ({
    slug: g.slug,
    label: g.label,
    count: counts.get(g.slug) ?? 0,
  })).sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));

  const statusByUser = new Map<string, FollowStatus>();
  for (const f of follows ?? []) {
    statusByUser.set(f.following_id, (f.status as FollowStatus) ?? "accepted");
  }

  let feed: FeedPost[] = [];
  if (tags.length > 0) {
    const { data: posts } = await supabase
      .from("feed_posts")
      .select("*")
      .in("genre", tags)
      .order("created_at", { ascending: false })
      .limit(50);
    feed = (posts ?? []) as FeedPost[];
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[16rem_1fr]">
      <aside className="lg:border-r lg:border-white/[0.06] lg:pr-6">
        <TagShelfList tags={shelves} followed={tags} />
      </aside>

      <div className="space-y-6">
        <div>
          <h1 className="font-display text-5xl font-bold text-cream">
            Tags you follow
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Reads from every genre you follow, newest first.
          </p>
          <p className="mt-3 max-w-prose rounded-card border border-brass/20 bg-brass/[0.06] px-4 py-3 text-sm text-ink-soft">
            Every tag you star here becomes a shelf in{" "}
            <Link href="/discover" className="link">
              Discover
            </Link>
            , where you can browse the readers who write about it and the reads
            filed under it.
          </p>
        </div>

        {tags.length === 0 ? (
          <div className="card p-8 text-center text-ink-faint">
            You don&rsquo;t follow any tags yet. Star one on the left to begin.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <Link
                  key={t}
                  href={`/discover?tag=${t}`}
                  className="rounded-pill border border-brass/40 bg-brass/15 px-3 py-1 font-mono text-xs text-brass no-underline hover:border-brass"
                >
                  ★ #{t}
                </Link>
              ))}
            </div>

            {feed.length === 0 ? (
              <div className="card p-8 text-center text-ink-faint">
                No reads on your followed tags yet.
              </div>
            ) : (
              <div className="gap-5 space-y-5 xl:columns-2">
                {feed.map((post) => (
                  <div key={post.id} className="break-inside-avoid">
                    <PostCard
                      post={post}
                      currentUserId={user.id}
                      followStatus={statusByUser.get(post.author_id) ?? "none"}
                      variant="feed"
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
