// Monogram avatar — a circle with the reader's initial. We never upload or store
// user photos, so a typographic monogram keeps the design clean and consistent.
export function Avatar({
  name,
  size = 48,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const letter = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <span
      className={`avatar ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}
