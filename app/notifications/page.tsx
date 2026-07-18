import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FollowButton";
import { FollowRequestActions } from "@/components/FollowRequestActions";
import { FollowRequestsPanel } from "@/components/FollowRequestsPanel";
import { RoomInviteRow } from "@/components/RoomInviteRow";
import { roomGenreLabel, roomModeLabel } from "@/lib/rooms";
import type { FollowStatus } from "@/app/actions";

type Person = {
  username: string;
  display_name: string | null;
  avatar_icon: string | null;
} | null;

type Item =
  | {
      kind: "follow";
      at: string;
      person: Person;
      personId: string;
    }
  | {
      kind: "invite";
      at: string;
      person: Person;
      roomId: string;
      roomName: string;
      genre: string;
      mode: string;
    };

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// Everything waiting for you: follow requests up top, then who followed you and
// who asked you into a room.
export default async function NotificationsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: requestRows }, { data: followerRows }, { data: inviteRows }, { data: myFollows }] =
    await Promise.all([
      supabase
        .from("follows")
        .select(
          "follower_id, created_at, follower:profiles!follower_id (username, display_name, avatar_icon)"
        )
        .eq("following_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("follows")
        .select(
          "follower_id, created_at, follower:profiles!follower_id (username, display_name, avatar_icon)"
        )
        .eq("following_id", user.id)
        .eq("status", "accepted")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("room_invites")
        .select(
          "room_id, created_at, rooms ( id, name, genre, mode ), inviter:profiles!inviter_id (username, display_name, avatar_icon)"
        )
        .eq("invitee_id", user.id)
        .order("created_at", { ascending: false }),
      // Who I already follow, so the Follow back button shows the right state.
      supabase
        .from("follows")
        .select("following_id, status")
        .eq("follower_id", user.id),
    ]);

  const statusByUser = new Map<string, FollowStatus>();
  for (const f of myFollows ?? []) {
    statusByUser.set(f.following_id, (f.status as FollowStatus) ?? "accepted");
  }

  const requests = (requestRows ?? []) as unknown as {
    follower_id: string;
    created_at: string;
    follower: Person;
  }[];

  const items: Item[] = [];

  for (const f of (followerRows ?? []) as unknown as {
    follower_id: string;
    created_at: string;
    follower: Person;
  }[]) {
    items.push({
      kind: "follow",
      at: f.created_at,
      person: f.follower,
      personId: f.follower_id,
    });
  }

  for (const i of (inviteRows ?? []) as unknown as {
    room_id: string;
    created_at: string;
    rooms: { id: string; name: string; genre: string; mode: string } | null;
    inviter: Person;
  }[]) {
    if (!i.rooms) continue;
    items.push({
      kind: "invite",
      at: i.created_at,
      person: i.inviter,
      roomId: i.room_id,
      roomName: i.rooms.name,
      genre: i.rooms.genre ?? "mixed",
      mode: i.rooms.mode ?? "quiet",
    });
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-5xl font-bold text-cream">
          Notifications
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          New followers, room invitations, and anyone waiting on you.
        </p>
      </div>

      {requests.length > 0 && (
        <FollowRequestsPanel count={requests.length}>
          <ul className="space-y-3">
            {requests.map((r) => (
              <li key={r.follower_id} className="flex items-center gap-3">
                <Link href={`/profile/${r.follower?.username ?? ""}`}>
                  <Avatar
                    name={r.follower?.display_name ?? r.follower?.username ?? "?"}
                    icon={r.follower?.avatar_icon ?? null}
                    size={44}
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/profile/${r.follower?.username ?? ""}`}
                    className="font-semibold text-ink no-underline hover:text-brass"
                  >
                    {r.follower?.display_name ?? r.follower?.username ?? "Unknown"}
                  </Link>
                  <p className="font-mono text-xs text-ink-faint">
                    @{r.follower?.username} · {timeAgo(r.created_at)}
                  </p>
                </div>
                <FollowRequestActions followerId={r.follower_id} />
              </li>
            ))}
          </ul>
        </FollowRequestsPanel>
      )}

      {items.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-display text-lg text-ink-soft">Nothing yet.</p>
          <p className="mt-1 text-sm text-ink-faint">
            When someone follows you or invites you into a room, it will appear
            here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.06]">
          {items.map((it) => (
            <li
              key={
                it.kind === "follow"
                  ? `f-${it.personId}`
                  : `i-${it.roomId}-${it.at}`
              }
              className="flex flex-wrap items-center gap-4 py-4"
            >
              <Link href={`/profile/${it.person?.username ?? ""}`}>
                <Avatar
                  name={it.person?.display_name ?? it.person?.username ?? "?"}
                  icon={it.person?.avatar_icon ?? null}
                  size={44}
                />
              </Link>

              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink-soft">
                  <Link
                    href={`/profile/${it.person?.username ?? ""}`}
                    className="font-semibold text-ink no-underline hover:text-brass"
                  >
                    {it.person?.display_name ?? it.person?.username ?? "Someone"}
                  </Link>{" "}
                  {it.kind === "follow" ? (
                    "started following you."
                  ) : (
                    <>
                      invited you to{" "}
                      <Link
                        href={`/rooms/${it.roomId}`}
                        className="font-display font-semibold text-ink no-underline hover:text-brass"
                      >
                        {it.roomName}
                      </Link>
                      .
                    </>
                  )}
                </p>
                <p className="font-mono text-xs text-ink-faint">
                  {timeAgo(it.at)}
                  {it.kind === "invite" && (
                    <span className="ml-2 text-brass/80">
                      {roomModeLabel(it.mode)} · {roomGenreLabel(it.genre)}
                    </span>
                  )}
                </p>
              </div>

              {it.kind === "follow" ? (
                <FollowButton
                  targetId={it.personId}
                  initialStatus={statusByUser.get(it.personId) ?? "none"}
                />
              ) : (
                <RoomInviteRow roomId={it.roomId} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
