import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updatePassword } from "../../login/actions";

// Step two of a password reset: arrived via the emailed link (which created a
// session), choose a new password.
export default async function ResetUpdatePage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No session means the link was not followed (or expired).
  if (!user) {
    redirect(
      `/login?error=${encodeURIComponent(
        "That reset link has expired. Request a new one."
      )}`
    );
  }

  return (
    <div className="mx-auto max-w-sm py-6">
      <h1 className="mb-1 font-display text-3xl font-bold text-cream">
        Choose a new password
      </h1>
      <p className="mb-6 text-sm text-cream-soft">
        For {user.email}. You will stay signed in.
      </p>

      <form action={updatePassword} className="card space-y-3 p-5">
        <label className="block">
          <span className="mb-1 block font-mono text-xs uppercase tracking-wider text-ink-faint">
            New password
          </span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoFocus
            className="input"
          />
        </label>

        {searchParams.error && (
          <p className="text-sm text-oxblood">{searchParams.error}</p>
        )}

        <button type="submit" className="btn-primary w-full">
          Save password
        </button>
      </form>
    </div>
  );
}
