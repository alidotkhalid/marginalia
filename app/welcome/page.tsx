import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/OnboardingForm";

// The welcome flow, shown once after a new account is verified.
export default async function WelcomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, onboarded_at")
    .eq("id", user.id)
    .maybeSingle();

  // Already set up: nothing to do here.
  if (profile?.onboarded_at) redirect("/");

  const username = (profile?.username as string) ?? "";

  return (
    <div className="mx-auto max-w-xl space-y-6 py-4">
      <header>
        <h1 className="font-display text-4xl font-bold text-cream">
          Welcome to Marginaly
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          A few quick things, and your shelf is ready. You can change any of it
          later.
        </p>
      </header>

      <OnboardingForm
        username={username}
        initialName={(profile?.display_name as string | null) ?? ""}
      />
    </div>
  );
}
