import Link from "next/link";

// Shown for any URL that doesn't exist: a mistyped profile, a deleted room.
export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="font-display text-6xl font-bold text-brass">404</p>
      <h1 className="mt-3 font-display text-2xl font-semibold text-cream">
        This page is not in the catalogue
      </h1>
      <p className="mx-auto mt-2 max-w-xs text-sm text-ink-soft">
        The page you were after may have been moved, deleted, or never shelved
        in the first place.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Link href="/" className="btn-accent no-underline">
          Back to your feed
        </Link>
        <Link
          href="/discover"
          className="font-mono text-sm text-ink-faint hover:text-brass"
        >
          or browse Discover
        </Link>
      </div>
    </div>
  );
}
