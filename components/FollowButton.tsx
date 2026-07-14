"use client";

import { useState, useTransition } from "react";
import { toggleFollow } from "@/app/actions";

export function FollowButton({
  targetId,
  initialFollowing,
}: {
  targetId: string;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  return (
    <button
      className={following ? "btn-ghost" : "btn-primary"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleFollow(targetId, following);
          setFollowing((f) => !f);
        })
      }
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
