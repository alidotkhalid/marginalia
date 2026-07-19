import Link from "next/link";
import { login } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="mx-auto max-w-sm py-6">
      <h1 className="mb-1 font-display text-3xl font-bold text-cream">Welcome back</h1>
      <p className="mb-6 text-sm text-cream-soft">
        Return to your reading room.
      </p>

      <form action={login} className="card space-y-3 p-5">
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
          <input name="password" type="password" required className="input" />
        </label>

        {searchParams.error && (
          <p className="text-sm text-oxblood">{searchParams.error}</p>
        )}

        <button type="submit" className="btn-primary w-full">
          Log in
        </button>

        <p className="text-center">
          <Link
            href="/reset"
            className="font-mono text-xs text-ink-faint hover:text-brass"
          >
            Forgot your password?
          </Link>
        </p>
      </form>

      <p className="mt-4 text-center text-sm text-cream-soft">
        New here?{" "}
        <Link href="/signup" className="text-brass hover:text-brass-light">
          Create an account
        </Link>
      </p>
    </div>
  );
}
