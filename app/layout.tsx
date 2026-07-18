import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { Logo } from "@/components/Logo";
import { NavLinks } from "@/components/NavLinks";
import { signOut } from "./actions";

export const metadata: Metadata = {
  title: "Marginaly",
  description:
    "A distraction-free, text-first social network for book lovers. No algorithms, no video, no infinite scroll.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let username: string | null = null;
  let displayName: string | null = null;
  let avatarIcon: string | null = null;
  let pendingRequests = 0;
  if (user) {
    // The nav badge counts everything waiting: follow requests + room invites.
    const [{ data }, { count: requests }, { count: invites }] = await Promise.all([
      supabase
        .from("profiles")
        .select("username, display_name, avatar_icon")
        .eq("id", user.id)
        .single(),
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", user.id)
        .eq("status", "pending"),
      supabase
        .from("room_invites")
        .select("*", { count: "exact", head: true })
        .eq("invitee_id", user.id),
    ]);
    username = data?.username ?? null;
    displayName = data?.display_name ?? data?.username ?? null;
    avatarIcon = data?.avatar_icon ?? null;
    pendingRequests = (requests ?? 0) + (invites ?? 0);
  }

  return (
    <html lang="en">
      <body>
        <header className="site-nav sticky top-0 z-20">
          <div className="mx-auto flex max-w-shell flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
            <Link href="/" className="site-brand">
              <Logo /> Marginaly
            </Link>

            {user ? (
              <>
                <nav className="order-3 flex flex-1 flex-wrap items-center justify-center gap-1.5 text-sm md:order-none">
                  <NavLinks pendingRequests={pendingRequests} username={username} />
                </nav>

                <div className="ml-auto flex items-center gap-4 md:ml-0">
                  <form action={signOut}>
                    <button className="nav-pill" type="submit">
                      Sign out
                    </button>
                  </form>
                  {username && (
                    <Link href={`/profile/${username}`} title={`@${username}`}>
                      <Avatar
                        name={displayName ?? username}
                        icon={avatarIcon}
                        size={34}
                      />
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <nav className="ml-auto flex items-center gap-3 text-sm">
                <Link href="/login" className="nav-pill">
                  Log in
                </Link>
                <Link href="/signup" className="btn-accent !py-1.5">
                  Join
                </Link>
              </nav>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-shell px-4 py-8 sm:px-6">{children}</main>

        <footer className="mx-auto max-w-shell px-4 py-10 text-center text-xs text-cream-soft sm:px-6">
          <hr className="rule mb-4" />
          Marginaly · read deliberately
        </footer>
      </body>
    </html>
  );
}
