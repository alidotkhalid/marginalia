import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PostCard, type FeedPost } from "@/components/PostCard";
import type { FollowStatus } from "@/app/actions";

// Permalink for a single read, with its comment thread already open. Arrived
// at from notifications ("View read") with ?comment= to highlight one comment.
export default async function ReadPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { comment?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: post } = await supabase
    .from("feed_posts")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!post) notFound();

  const read = post as FeedPost;

  const { data: myFollow } = await supabase
    .from("follows")
    .select("status")
    .eq("follower_id", user.id)
    .eq("following_id", read.author_id)
    .maybeSingle();

  // Only pass a well-formed comment id through to the highlighter.
  const rawComment = searchParams.comment ?? "";
  const highlight = /^[0-9a-f-]{36}$/i.test(rawComment) ? rawComment : null;

  return (
    <div className="mx-auto max-w-prose space-y-4">
      <Link
        href={`/profile/${read.author_username}`}
        className="font-mono text-sm text-ink-faint no-underline hover:text-brass"
      >
        ← @{read.author_username}&rsquo;s profile
      </Link>

      <PostCard
        post={read}
        currentUserId={user.id}
        followStatus={(myFollow?.status as FollowStatus) ?? "none"}
        variant="feed"
        commentsOpen
        highlightCommentId={highlight}
      />
    </div>
  );
}
