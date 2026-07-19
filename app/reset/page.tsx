import Link from "next/link";
import { requestPasswordReset } from "../login/actions";

// Step one of a password reset: ask for the email, send the link.
export default function ResetPage({
  searchParams,
}: {
  searchParams: { sent?: string };
}) {
  if (searchParams.sent) {
    return (
      <div className="mx-auto max-w-sm py-6">
        <h1 className="mb-1 font-display text-3xl font-bold text-cream">
          Check your inbox
        </h1>
        <p className="mb-6 text-sm text-cream-soft">
          A way back in is on its way.
        </p>

        <div className="card space-y-3 p-5">
          <p className="text-sm text-ink-soft">
            If an account exists for{" "}
            <span className="font-mono text-ink">{searchParams.sent}</span>, a
            password-reset link is on its way. Open it and choose a new
            password.
          </p>
          <p className="text-sm text-ink-faint">
            Nothing there? Give it a minute, and check your spam folder.
          </p>
        </div>

        <p className="mt-4 text-center text-sm text-cream-soft">
          <Link href="/login" className="text-brass hover:text-brass-light">
            Back to log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm py-6">
      <h1 className="mb-1 font-display text-3xl font-bold text-cream">
        Forgot your password?
      </h1>
      <p className="mb-6 text-sm text-cream-soft">
        It happens to the best-read of us.
      </p>

      <form action={requestPasswordReset} className="card space-y-3 p-5">
        <label className="block">
          <span className="mb-1 block font-mono text-xs uppercase tracking-wider text-ink-faint">
            Email
          </span>
          <input name="email" type="email" required className="input" />
        </label>
        <button type="submit" className="btn-primary w-full">
          Send reset link
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-cream-soft">
        Remembered it?{" "}
        <Link href="/login" className="text-brass hover:text-brass-light">
          Log in
        </Link>
      </p>
    </div>
  );
}
