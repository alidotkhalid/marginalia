import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CreateRoomForm } from "@/components/CreateRoomForm";

type RoomRow = {
  id: string;
  name: string;
  timer_ends_at: string | null;
};

export default async function RoomsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cutoff = new Date(Date.now() - 3 * 60_000).toISOString();
  const [{ data: rooms }, { data: parts }] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, name, timer_ends_at")
      .order("created_at", { ascending: false })
      .limit(60),
    supabase.from("room_participants").select("room_id, last_seen").gt("last_seen", cutoff),
  ]);

  const countByRoom = new Map<string, number>();
  for (const p of parts ?? []) {
    countByRoom.set(p.room_id, (countByRoom.get(p.room_id) ?? 0) + 1);
  }

  const list = (rooms ?? []) as RoomRow[];
  const nowMs = Date.now();

  return (
    <div className="mx-auto max-w-prose space-y-6">
      <div>
        <h1 className="mb-1 font-display text-3xl font-bold text-cream">
          Reading rooms
        </h1>
        <p className="text-sm text-cream-soft">
          Sit and read alongside others. A shared timer, a quiet room, no camera,
          just company.
        </p>
      </div>

      <CreateRoomForm />

      {list.length === 0 ? (
        <div className="card p-6 text-center text-ink-faint">
          No rooms yet. Open the first one above.
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((r) => {
            const count = countByRoom.get(r.id) ?? 0;
            const timerRunning =
              r.timer_ends_at !== null &&
              new Date(r.timer_ends_at).getTime() > nowMs;
            return (
              <li key={r.id}>
                <Link
                  href={`/rooms/${r.id}`}
                  className="card flex items-center justify-between gap-3 p-5 no-underline transition-colors hover:border-brass"
                >
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-semibold text-ink">
                      {r.name}
                    </p>
                    <p className="font-mono text-xs text-ink-faint">
                      {count} reading now
                      {timerRunning ? " · timer running" : ""}
                    </p>
                  </div>
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-pill ${
                      count > 0 ? "bg-forest-light" : "bg-parchment-dark"
                    }`}
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
