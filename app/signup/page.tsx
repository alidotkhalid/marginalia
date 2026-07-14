import Link from "next/link";
import { signup } from "../login/actions";

export default function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-1 font-display text-3xl">Join Marginalia</h1>
      <p className="mb-6 text-sm text-ink-faint">
        A quiet corner for readers. No feed algorithms, ever.
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
      </form>

      <p className="mt-4 text-center text-sm text-ink-faint">
        Already a member? <Link href="/login">Log in</Link>
      </p>
    </div>
  );
}
