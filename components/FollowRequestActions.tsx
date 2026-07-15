"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptFollow, rejectFollow } from "@/app/actions";

// Accept / decline buttons for a single incoming follow request.
export function FollowRequestActions({ followerId }: { followerId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function accept() {
    startTransition(async () => {
      await acceptFollow(followerId);
      router.refresh();
    });
  }

  function reject() {
    startTransition(async () => {
      await rejectFollow(followerId);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={accept} disabled={pending} className="btn-primary !py-1.5 text-xs">
        Accept
      </button>
      <button onClick={reject} disabled={pending} className="btn-ghost !py-1.5 text-xs">
        Decline
      </button>
    </div>
  );
}
