"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTagFollow } from "@/app/actions";

// Follow / unfollow a genre tag. Followed tags surface reads under "Tags".
export function TagFollowButton({
  tag,
  initialFollowing,
}: {
  tag: string;
  initialFollowing: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !following;
    setFollowing(next);
    startTransition(async () => {
      await setTagFollow(tag, next);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={following ? "btn-ghost !py-1.5 text-sm" : "btn-accent !py-1.5 text-sm"}
    >
      {following ? "Following tag" : "Follow tag"}
    </button>
  );
}
