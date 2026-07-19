import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateRoomForm } from "@/components/CreateRoomForm";
import { RoomsBrowser, type RoomCard } from "@/components/RoomsBrowser";
import { RoomInvites, type RoomInvite } from "@/components/RoomInvites";

type RoomRow = {
  id: string;
  name: string;
  genre: string;
  mode: string;
  book_title: string | null;
  book_cover_id: number | null;
  timer_ends_at: string | null;
};

type ActiveRow = {
  room_id: string;
  book_title: string | null;
  book_cover_id: number | null;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_icon: string | null;
  } | null;
};

type StatRow = {
  room_id: string;
  avg_minutes: number;
  books: { title: string; cover: number | null }[] | null;
};

export default async function RoomsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cutoff = new Date(Date.now() - 3 * 60_000).toISOString();

  // Sweep out rooms nobody has sat in for a month before listing.
  await supabase.rpc("cleanup_stale_rooms");

  const [{ data: rooms }, { data: activeParts }, { data: statRows }, { data: invites }] =
    await Promise.all([
      supabase
        .from("rooms")
        .select("id, name, genre, mode, book_title, book_cover_id, timer_ends_at")
        .order("created_at", { ascending: false })
        .limit(60),
      // Only who is sitting in a room right now: a handful of rows at most.
      supabase
        .from("room_participants")
        .select(
          "room_id, book_title, book_cover_id, profiles!user_id (username, display_name, avatar_icon)"
        )
        .gt("last_seen", cutoff),
      // Session averages and cover stacks, aggregated in Postgres.
      supabase.from("room_stats").select("room_id, avg_minutes, books"),
      supabase
        .from("room_invites")
        .select(
          "room_id, created_at, rooms ( id, name, genre, mode ), profiles!inviter_id (username, display_name, avatar_icon)"
        )
        .eq("invitee_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  const activeByRoom = new Map<string, ActiveRow[]>();
  for (const p of (activeParts ?? []) as unknown as ActiveRow[]) {
    const list = activeByRoom.get(p.room_id);
    if (list) list.push(p);
    else activeByRoom.set(p.room_id, [p]);
  }

  const statByRoom = new Map(
    ((statRows ?? []) as unknown as StatRow[]).map((s) => [s.room_id, s])
  );

  const cards: RoomCard[] = ((rooms ?? []) as RoomRow[]).map((r) => {
    const active = activeByRoom.get(r.id) ?? [];
    const stat = statByRoom.get(r.id);

    // The room's own book (a buddy read) leads the stack.
    const covers = [
      ...(r.book_title
        ? [{ id: r.book_cover_id ?? null, title: r.book_title }]
        : []),
      ...(stat?.books ?? [])
        .filter((b) => b.title !== r.book_title)
        .map((b) => ({ id: b.cover ?? null, title: b.title })),
    ].slice(0, 4);

    const people = active.map((p) => ({
      name: p.profiles?.display_name ?? p.profiles?.username ?? "reader",
      icon: p.profiles?.avatar_icon ?? null,
    }));

    const haystack = [
      r.name,
      r.genre,
      r.mode,
      ...covers.map((c) => c.title),
      ...active.map((p) => p.profiles?.username ?? ""),
      ...active.map((p) => p.profiles?.display_name ?? ""),
    ]
      .join(" ")
      .toLowerCase();

    return {
      id: r.id,
      name: r.name,
      genre: r.genre ?? "mixed",
      mode: r.mode ?? "quiet",
      readers: active.length,
      live: active.length > 0,
      avgMinutes: stat?.avg_minutes ?? 0,
      covers,
      people,
      haystack,
    };
  });

  const invitations: RoomInvite[] = (
    (invites ?? []) as unknown as {
      room_id: string;
      rooms: { id: string; name: string; genre: string; mode: string } | null;
      profiles: {
        username: string;
        display_name: string | null;
        avatar_icon: string | null;
      } | null;
    }[]
  )
    .filter((i) => i.rooms)
    .map((i) => ({
      roomId: i.room_id,
      roomName: i.rooms?.name ?? "a room",
      genre: i.rooms?.genre ?? "mixed",
      mode: i.rooms?.mode ?? "quiet",
      fromName:
        i.profiles?.display_name ?? i.profiles?.username ?? "someone",
      fromIcon: i.profiles?.avatar_icon ?? null,
    }));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl font-bold text-cream">
            Reading rooms
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Sit and read alongside others. A shared timer, a quiet room, no
            camera, just company.
          </p>
        </div>
        <CreateRoomForm />
      </header>

      {invitations.length > 0 && <RoomInvites invites={invitations} />}

      <RoomsBrowser rooms={cards} />
    </div>
  );
}
