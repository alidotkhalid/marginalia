import Link from "next/link";
import { signup } from "../login/actions";

export default function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string; sent?: string };
}) {
  // The account exists but is not usable until the emailed link is clicked.
  if (searchParams.sent) {
    return (
      <div className="mx-auto max-w-sm py-6">
        <h1 className="mb-1 font-display text-3xl font-bold text-cream">
          Check your inbox
        </h1>
        <p className="mb-6 text-sm text-cream-soft">
          One more step before you can read along.
        </p>

        <div className="card space-y-3 p-5">
          <p className="text-sm text-ink-soft">
            We sent a verification link to{" "}
            <span className="font-mono text-ink">{searchParams.sent}</span>.
            Open it to confirm your address and finish setting up your profile.
          </p>
          <p className="text-sm text-ink-faint">
            Nothing there yet? Give it a minute, and check your spam folder.
          </p>
        </div>

        <p className="mt-4 text-center text-sm text-cream-soft">
          Already verified?{" "}
          <Link href="/login" className="text-brass hover:text-brass-light">
            Log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm py-6">
      <h1 className="mb-1 font-display text-3xl font-bold text-cream">
        Join Marginaly
      </h1>
      <p className="mb-6 text-sm text-cream-soft">
        A quiet corner for readers, and a shelf of your own.
      </p>

      <form action={signup} className="card space-y-3 p-5">
        <label className="block">
          <span className="mb-1 block font-mono text-xs uppercase tracking-wider text-ink-faint">
            Username
          </span>
          <input
            name="username"
            type="text"
            required
            pattern="[a-z0-9_]{3,24}"
            placeholder="e.g. margaret_reads"
            className="input font-mono"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-xs uppercase tracking-wider text-ink-faint">
            Email
          </span>
          <input name="email" type="email" required className="input" />
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-xs uppercase tracking-wider text-ink-faint">
            Password
          </span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="input"
          />
        </label>

        {searchParams.error && (
          <p className="text-sm text-oxblood">{searchParams.error}</p>
        )}

        <button type="submit" className="btn-primary w-full">
          Create account
        </button>

        <p className="text-center text-xs text-ink-faint">
          We&rsquo;ll email you a link to verify your address.
        </p>
      </form>

      <p className="mt-4 text-center text-sm text-cream-soft">
        Already a member?{" "}
        <Link href="/login" className="text-brass hover:text-brass-light">
          Log in
        </Link>
      </p>
    </div>
  );
}
