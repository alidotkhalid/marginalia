import { AVATAR_ICON_IDS, isAvatarIcon } from "@/lib/avatarIcons";

// Avatar: shows the reader's chosen Marginaly avatar, or, if they haven't picked
// one, a stable avatar derived from their name so everyone has a consistent face.

// FNV-1a hash → unsigned 32-bit.
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function Avatar({
  name,
  icon,
  size = 48,
  className = "",
}: {
  name: string;
  icon?: string | null;
  size?: number;
  className?: string;
}) {
  const id =
    icon && isAvatarIcon(icon)
      ? icon
      : AVATAR_ICON_IDS[hashString(name || "?") % AVATAR_ICON_IDS.length];

  return (
    <span
      className={`avatar ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${name}'s avatar`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/avatars/${id}.png`}
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-cover"
      />
    </span>
  );
}
