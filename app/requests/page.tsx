import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { FollowRequestActions } from "@/components/FollowRequestActions";

type RequestRow = {
  follower_id: string;
  follower: {
    username: string;
    display_name: string | null;
    avatar_icon: string | null;
  } | null;
};

// Incoming follow requests for private accounts — approve or decline each.
export default async function RequestsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("follows")
    .select(
      "follower_id, created_at, follower:profiles!follower_id (username, display_name, avatar_icon)"
    )
    .eq("following_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const requests = (data ?? []) as unknown as RequestRow[];

  return (
    <div className="mx-auto max-w-prose space-y-6">
      <div>
        <h1 className="mb-1 font-display text-3xl font-bold text-cream">
          Follow requests
        </h1>
        <p className="text-sm text-cream-soft">
          People asking to follow your private account.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="card p-6 text-center text-ink-faint">
          No pending requests.
        </div>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li key={r.follower_id} className="card flex items-center gap-3 p-4">
              <Link href={`/profile/${r.follower?.username ?? ""}`}>
                <Avatar
                  name={r.follower?.display_name ?? r.follower?.username ?? "?"}
                  icon={r.follower?.avatar_icon}
                  size={44}
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/profile/${r.follower?.username ?? ""}`}
                  className="font-display font-semibold text-ink no-underline hover:text-brass"
                >
                  {r.follower?.display_name ?? r.follower?.username ?? "Unknown"}
                </Link>
                <p className="font-mono text-xs text-ink-faint">
                  @{r.follower?.username}
                </p>
              </div>
              <FollowRequestActions followerId={r.follower_id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
