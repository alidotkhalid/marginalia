"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { dismissRoomInvite } from "@/app/actions";

// Join / dismiss for a single room invitation in the notifications list.
export function RoomInviteRow({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() =>
          startTransition(async () => {
            await dismissRoomInvite(roomId);
            router.push(`/rooms/${roomId}`);
          })
        }
        disabled={pending}
        className="btn-accent !py-1.5 text-sm"
      >
        Join
      </button>
      <button
        onClick={() =>
          startTransition(async () => {
            await dismissRoomInvite(roomId);
            router.refresh();
          })
        }
        disabled={pending}
        className="font-mono text-xs text-ink-faint hover:text-oxblood"
      >
        dismiss
      </button>
    </div>
  );
}
