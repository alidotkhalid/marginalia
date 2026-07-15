"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { blockUser, unblockUser } from "@/app/actions";

// Block / unblock control shown on another reader's profile. Blocking removes
// any follow relationship both ways and hides your posts from them.
export function BlockButton({
  targetId,
  initialBlocked,
}: {
  targetId: string;
  initialBlocked: boolean;
}) {
  const router = useRouter();
  const [blocked, setBlocked] = useState(initialBlocked);
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function doBlock() {
    startTransition(async () => {
      await blockUser(targetId);
      setBlocked(true);
      setConfirming(false);
      router.refresh();
    });
  }

  function doUnblock() {
    startTransition(async () => {
      await unblockUser(targetId);
      setBlocked(false);
      router.refresh();
    });
  }

  if (blocked) {
    return (
      <button
        onClick={doUnblock}
        disabled={pending}
        className="text-xs font-mono uppercase tracking-wider text-ink-faint hover:text-brass"
      >
        Unblock
      </button>
    );
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-xs font-mono">
        <button
          onClick={doBlock}
          disabled={pending}
          className="uppercase tracking-wider text-oxblood hover:text-oxblood-light"
        >
          Confirm block
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-ink-faint hover:text-ink"
        >
          cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs font-mono uppercase tracking-wider text-ink-faint hover:text-oxblood"
    >
      Block
    </button>
  );
}
