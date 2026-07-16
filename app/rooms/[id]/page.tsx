import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RoomLive, type RoomParticipant } from "@/components/RoomLive";

export default async function RoomPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: room } = await supabase
    .from("rooms")
    .select("id, name, timer_ends_at, created_by")
    .eq("id", params.id)
    .maybeSingle();
  if (!room) notFound();

  const cutoff = new Date(Date.now() - 3 * 60_000).toISOString();
  const { data: parts } = await supabase
    .from("room_participants")
    .select(
      "user_id, book_title, book_cover_id, current_page, last_seen, profiles!user_id (username, display_name, avatar_icon)"
    )
    .eq("room_id", params.id)
    .gt("last_seen", cutoff)
    .order("joined_at", { ascending: true });

  const participants: RoomParticipant[] = (
    (parts ?? []) as unknown as Array<{
      user_id: string;
      book_title: string | null;
      book_cover_id: number | null;
      current_page: number;
      last_seen: string;
      profiles: {
        username: string;
        display_name: string | null;
        avatar_icon: string | null;
      } | null;
    }>
  ).map((p) => ({
    user_id: p.user_id,
    username: p.profiles?.username ?? "unknown",
    display_name: p.profiles?.display_name ?? null,
    avatar_icon: p.profiles?.avatar_icon ?? null,
    book_title: p.book_title,
    book_cover_id: p.book_cover_id,
    current_page: p.current_page,
    last_seen: p.last_seen,
  }));

  return (
    <div className="mx-auto max-w-prose space-y-6">
      <h1 className="font-display text-3xl font-bold text-cream">
        {room.name as string}
      </h1>
      <RoomLive
        roomId={room.id as string}
        timerEndsAt={(room.timer_ends_at as string | null) ?? null}
        participants={participants}
        meId={user.id}
        amCreator={room.created_by === user.id}
      />
    </div>
  );
}
