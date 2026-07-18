"use client";

import { AVATAR_ICON_IDS, avatarLabel } from "@/lib/avatarIcons";
import { Avatar } from "./Avatar";

/**
 * The pick-an-avatar grid, shared by the welcome flow and the profile editor.
 * "" is the auto avatar, derived from the reader's name.
 */
export function AvatarGrid({
  name,
  selected,
  onSelect,
}: {
  name: string;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const options = ["", ...AVATAR_ICON_IDS];

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {options.map((id) => (
        <button
          key={id || "auto"}
          type="button"
          onClick={() => onSelect(id)}
          aria-pressed={selected === id}
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
  );
}
