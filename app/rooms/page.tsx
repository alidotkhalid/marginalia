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
  timer_ends_at: string | null;
};

type PartRow = {
  room_id: string;
  user_id: string;
  book_title: string | null;
  book_cover_id: number | null;
  joined_at: string;
  last_seen: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_icon: string | null;
  } | null;
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

  const [{ data: rooms }, { data: parts }, { data: invites }] =
    await Promise.all([
      supabase
        .from("rooms")
        .select("id, name, genre, mode, timer_ends_at")
        .order("created_at", { ascending: false })
        .limit(60),
      // Everyone who has ever sat in a room, so we can show the books read here
      // and work out a typical session length.
      supabase
        .from("room_participants")
        .select(
          "room_id, user_id, book_title, book_cover_id, joined_at, last_seen, profiles!user_id (username, display_name, avatar_icon)"
        )
        .order("last_seen", { ascending: false })
        .limit(600),
      supabase
        .from("room_invites")
        .select(
          "room_id, created_at, rooms ( id, name, genre, mode ), profiles!inviter_id (username, display_name, avatar_icon)"
        )
        .eq("invitee_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  const partRows = (parts ?? []) as unknown as PartRow[];

  // Group participants by room.
  const grouped = new Map<string, PartRow[]>();
  for (const p of partRows) {
    const list = grouped.get(p.room_id);
    if (list) list.push(p);
    else grouped.set(p.room_id, [p]);
  }

  const cards: RoomCard[] = ((rooms ?? []) as RoomRow[]).map((r) => {
    const all = grouped.get(r.id) ?? [];
    const active = all.filter((p) => p.last_seen > cutoff);

    // A typical session: how long people stayed, averaged, in minutes.
    const durations = all
      .map(
        (p) =>
          (new Date(p.last_seen).getTime() - new Date(p.joined_at).getTime()) /
          60_000
      )
      .filter((m) => m >= 1);
    const avgMinutes = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    // De-duplicate the books on the shelf stack.
    const seen = new Set<string>();
    const covers: { id: number | null; title: string }[] = [];
    for (const p of all) {
      if (!p.book_title || seen.has(p.book_title)) continue;
      seen.add(p.book_title);
      covers.push({ id: p.book_cover_id, title: p.book_title });
      if (covers.length === 4) break;
    }

    const people = active.map((p) => ({
      name: p.profiles?.display_name ?? p.profiles?.username ?? "reader",
      icon: p.profiles?.avatar_icon ?? null,
    }));

    const haystack = [
      r.name,
      r.genre,
      r.mode,
      ...all.map((p) => p.book_title ?? ""),
      ...all.map((p) => p.profiles?.username ?? ""),
      ...all.map((p) => p.profiles?.display_name ?? ""),
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
      avgMinutes,
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
