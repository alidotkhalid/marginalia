import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { PrivacyToggle } from "@/components/PrivacyToggle";
import { BlockButton } from "@/components/BlockButton";

type BlockRow = {
  blocked_id: string;
  blocked: { username: string; display_name: string | null } | null;
};

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: blocksData }, { count: pending }] =
    await Promise.all([
      supabase.from("profiles").select("is_private").eq("id", user.id).maybeSingle(),
      supabase
        .from("blocks")
        .select("blocked_id, blocked:profiles!blocked_id (username, display_name)")
        .eq("blocker_id", user.id),
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user.id)
        .eq("status", "pending"),
    ]);

  const isPrivate = (profile?.is_private as boolean) ?? false;
  const blocks = (blocksData ?? []) as unknown as BlockRow[];

  return (
    <div className="mx-auto max-w-prose space-y-6">
      <h1 className="font-display text-3xl font-bold text-cream">Settings</h1>

      {/* Privacy */}
      <section className="card p-5">
        <h2 className="mb-4 font-display text-xl text-ink">Privacy</h2>
        <PrivacyToggle initialPrivate={isPrivate} />
        <div className="mt-4 border-t border-parchment-dark pt-4">
          <Link href="/requests" className="link text-sm">
            Follow requests{pending ? ` (${pending})` : ""} →
          </Link>
        </div>
      </section>

      {/* Blocked users */}
      <section className="card p-5">
        <h2 className="mb-4 font-display text-xl text-ink">Blocked users</h2>
        {blocks.length === 0 ? (
          <p className="text-sm text-ink-faint">You haven&rsquo;t blocked anyone.</p>
        ) : (
          <ul className="space-y-3">
            {blocks.map((b) => (
              <li key={b.blocked_id} className="flex items-center gap-3">
                <Avatar
                  name={b.blocked?.display_name ?? b.blocked?.username ?? "?"}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/profile/${b.blocked?.username ?? ""}`}
                    className="font-display font-semibold text-ink no-underline hover:text-forest"
                  >
                    {b.blocked?.display_name ?? b.blocked?.username ?? "Unknown"}
                  </Link>
                  <p className="font-mono text-xs text-ink-faint">
                    @{b.blocked?.username}
                  </p>
                </div>
                <BlockButton targetId={b.blocked_id} initialBlocked={true} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
