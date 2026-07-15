// A modern circular spinner. `inline` renders a small one that sits inside
// buttons (inheriting the button's text color); otherwise a larger standalone.
export function Spinner({
  size = 20,
  inline = false,
}: {
  size?: number;
  inline?: boolean;
}) {
  if (inline) return <span className="spinner-sm" aria-hidden="true" />;
  return (
    <span
      className="spinner"
      style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size / 9)) }}
      role="status"
      aria-label="Loading"
    />
  );
}
