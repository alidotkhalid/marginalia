"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { dismissRoomInvite } from "@/app/actions";
import { roomGenreLabel, roomModeLabel } from "@/lib/rooms";
import { Avatar } from "./Avatar";

export type RoomInvite = {
  roomId: string;
  roomName: string;
  genre: string;
  mode: string;
  fromName: string;
  fromIcon: string | null;
};

// Invitations waiting for you, shown above the room list.
export function RoomInvites({ invites }: { invites: RoomInvite[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function join(roomId: string) {
    startTransition(async () => {
      await dismissRoomInvite(roomId);
      router.push(`/rooms/${roomId}`);
    });
  }

  function dismiss(roomId: string) {
    startTransition(async () => {
      await dismissRoomInvite(roomId);
      router.refresh();
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">
        You have been invited
      </h2>
      <ul className="space-y-2">
        {invites.map((i) => (
          <li
            key={i.roomId}
            className="card flex flex-wrap items-center gap-3 px-5 py-3.5"
          >
            <Avatar name={i.fromName} icon={i.fromIcon} size={32} />
            <span className="min-w-0 flex-1 text-sm text-ink-soft">
              <span className="font-semibold text-ink">{i.fromName}</span> invited
              you to{" "}
              <span className="font-display font-semibold text-ink">
                {i.roomName}
              </span>
              <span className="ml-2 font-mono text-xs text-brass/80">
                {roomModeLabel(i.mode)} · {roomGenreLabel(i.genre)}
              </span>
            </span>
            <button
              onClick={() => join(i.roomId)}
              disabled={pending}
              className="btn-accent !py-1.5 text-sm"
            >
              Join
            </button>
            <button
              onClick={() => dismiss(i.roomId)}
              disabled={pending}
              className="font-mono text-xs text-ink-faint hover:text-oxblood"
            >
              dismiss
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
