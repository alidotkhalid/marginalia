import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProfileCustomizer } from "@/components/ProfileCustomizer";
import { AvatarPicker } from "@/components/AvatarPicker";

// Standalone appearance settings (reachable from the top nav). Lets a reader
// set their profile's accent color and banner style.
export default async function CustomizePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("username, display_name, accent_color, banner_style, avatar_icon")
    .eq("id", user.id)
    .maybeSingle();

  const accent = (data?.accent_color as string) ?? "#c9a44f";
  const banner = (data?.banner_style as string) ?? "gradient";
  const avatarIcon = (data?.avatar_icon as string | null) ?? null;
  const displayName =
    (data?.display_name as string | null) ?? (data?.username as string) ?? "You";

  return (
    <div className="mx-auto max-w-prose space-y-6">
      <div>
        <h1 className="mb-1 font-display text-3xl font-bold text-cream">
          Customize your profile
        </h1>
        <p className="text-sm text-cream-soft">
          Pick an accent color and banner. Changes show on{" "}
          <Link href={`/profile/${data?.username ?? ""}`} className="link">
            your profile
          </Link>
          .
        </p>
      </div>

      <section className="card p-5">
        <AvatarPicker name={displayName} current={avatarIcon} />
      </section>

      <section className="card p-5">
        <ProfileCustomizer accent={accent} banner={banner} startOpen />
      </section>
    </div>
  );
}
