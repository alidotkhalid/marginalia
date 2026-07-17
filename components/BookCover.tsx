import Image from "next/image";
import { coverUrl } from "@/lib/openlibrary";

// Renders Open Library cover art, or a typographic placeholder "spine" when a
// book has no cover on file. Never renders user-uploaded imagery, by design.
export function BookCover({
  coverId,
  title,
  size = "M",
  className = "",
}: {
  coverId: number | null | undefined;
  title: string;
  size?: "S" | "M" | "L";
  className?: string;
}) {
  const url = coverUrl(coverId, size);
  const dims = size === "S" ? 40 : size === "L" ? 180 : 72;

  if (!url) {
    return (
      <div
        className={`flex items-center justify-center bg-forest text-cream rounded-[3px] ${className}`}
        style={{ width: dims, height: dims * 1.5 }}
        aria-label={title}
      >
        <span className="px-1 text-center font-display text-[10px] leading-tight line-clamp-4">
          {title}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={url}
      alt={`Cover of ${title}`}
      width={dims}
      height={Math.round(dims * 1.5)}
      className={`rounded-[2px] object-cover ${className}`}
    />
  );
}
