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

  // Sits beside Follow, in the same pill shape, but red so it reads as the
  // destructive choice.
  const pill =
    "btn border border-oxblood text-oxblood hover:bg-oxblood hover:text-cream";

  if (blocked) {
    return (
      <button onClick={doUnblock} disabled={pending} className={pill}>
        Unblock
      </button>
    );
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2">
        <button
          onClick={doBlock}
          disabled={pending}
          className="btn border border-oxblood bg-oxblood text-cream hover:bg-oxblood-light"
        >
          Confirm
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="font-mono text-xs text-ink-faint hover:text-ink"
        >
          cancel
        </button>
      </span>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} className={pill}>
      Block
    </button>
  );
}
