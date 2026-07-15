"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { followUser, unfollowUser, type FollowStatus } from "@/app/actions";
import { Spinner } from "./Spinner";

// Three-state follow control: Follow → (Requested | Following) → back to Follow.
// Private accounts return "pending" (a request); public ones return "accepted".
export function FollowButton({
  targetId,
  initialStatus,
}: {
  targetId: string;
  initialStatus: FollowStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<FollowStatus>(initialStatus);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      if (status === "none") {
        const res = await followUser(targetId);
        setStatus(res.status);
      } else {
        await unfollowUser(targetId);
        setStatus("none");
      }
      router.refresh();
    });
  }

  const label =
    status === "accepted"
      ? "Following"
      : status === "pending"
      ? "Requested"
      : "Follow";

  return (
    <button
      className={status === "none" ? "btn-primary" : "btn-ghost"}
      disabled={pending}
      onClick={toggle}
    >
      {pending && <Spinner inline />}
      {label}
    </button>
  );
}
