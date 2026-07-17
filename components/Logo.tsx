// The Marginaly mark: an orange margin rule with a note-dash in the margin, and
// a text block to its right (the text lines inherit the surrounding text color).
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={(size * 28) / 24}
      height={size}
      viewBox="0 0 28 24"
      fill="none"
      aria-hidden="true"
    >
      {/* Margin rule + note dash (orange) */}
      <rect x="11" y="2" width="2.4" height="20" rx="1.2" fill="#c0592c" />
      <rect x="3" y="6.6" width="5" height="2.4" rx="1.2" fill="#c0592c" />
      {/* Text block (inherits current text color) */}
      <rect x="15.5" y="5.6" width="9.5" height="2.4" rx="1.2" fill="currentColor" />
      <rect x="15.5" y="9.7" width="7" height="2.4" rx="1.2" fill="currentColor" />
      <rect x="15.5" y="13.8" width="9.5" height="2.4" rx="1.2" fill="currentColor" />
      <rect x="15.5" y="17.9" width="5.5" height="2.4" rx="1.2" fill="currentColor" />
    </svg>
  );
}
