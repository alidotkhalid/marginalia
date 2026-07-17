"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAvatarIcon } from "@/app/actions";
import { AVATAR_ICON_IDS, avatarLabel } from "@/lib/avatarIcons";
import { Avatar } from "./Avatar";

// Lets a reader pick one of the Marginaly avatars, or "Auto" for a stable one.
export function AvatarPicker({
  name,
  current,
}: {
  name: string;
  current: string | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string>(current ?? "");
  const [pending, startTransition] = useTransition();

  function choose(id: string) {
    setSelected(id);
    startTransition(async () => {
      await updateAvatarIcon(id);
      router.refresh();
    });
  }

  const options = ["", ...AVATAR_ICON_IDS]; // "" = auto identicon

  return (
    <div>
      <h3 className="section-title mb-3 text-lg">Avatar</h3>
      <div className="mb-3 flex items-center gap-3">
        <Avatar name={name} icon={selected || null} size={56} />
        <p className="text-sm text-ink-faint">
          Pick an avatar, or keep the one chosen for you.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {options.map((id) => (
          <button
            key={id || "auto"}
            type="button"
            onClick={() => choose(id)}
            disabled={pending}
            className={`flex flex-col items-center gap-1 rounded-card border-2 p-2 transition-colors ${
              selected === id
                ? "border-brass bg-brass/10"
                : "border-transparent hover:border-parchment-dark"
            }`}
          >
            <Avatar name={name} icon={id || null} size={44} />
            <span className="line-clamp-1 text-center text-[11px] text-ink-soft">
              {id ? avatarLabel(id) : "Auto"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
