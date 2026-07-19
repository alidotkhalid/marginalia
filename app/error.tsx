"use client";

// Catches anything that throws while rendering a page. Client component by
// Next.js requirement, so it can offer a retry.
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="font-display text-6xl font-bold text-brass">Oh no</p>
      <h1 className="mt-3 font-display text-2xl font-semibold text-cream">
        Something went wrong on our side
      </h1>
      <p className="mx-auto mt-2 max-w-xs text-sm text-ink-soft">
        The page hit an error while loading. It is usually temporary.
      </p>
      {error?.digest && (
        <p className="mt-2 font-mono text-xs text-ink-faint">
          reference: {error.digest}
        </p>
      )}
      <div className="mt-6 flex items-center justify-center gap-3">
        <button type="button" onClick={reset} className="btn-accent">
          Try again
        </button>
        <a
          href="/"
          className="font-mono text-sm text-ink-faint hover:text-brass"
        >
          back to the feed
        </a>
      </div>
    </div>
  );
}
