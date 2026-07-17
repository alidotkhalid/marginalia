import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { signOut } from "./actions";

export const metadata: Metadata = {
  title: "Marginalia",
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
    const [{ data }, { count }] = await Promise.all([
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
    ]);
    username = data?.username ?? null;
    displayName = data?.display_name ?? data?.username ?? null;
    avatarIcon = data?.avatar_icon ?? null;
    pendingRequests = count ?? 0;
  }

  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-20 border-b border-brass/20 bg-parchment/95 backdrop-blur">
          <div className="mx-auto flex max-w-shell items-center justify-between px-4 py-3 sm:px-6">
            <Link
              href="/"
              className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-ink no-underline hover:text-brass"
            >
              <span className="text-brass">❦</span> Marginalia
            </Link>

            <nav className="flex items-center gap-5 text-sm">
              {user ? (
                <>
                  <Link href="/" className="font-medium text-ink-soft hover:text-brass">
                    Home
                  </Link>
                  <Link
                    href="/discover"
                    className="font-medium text-ink-soft hover:text-brass"
                  >
                    Discover
                  </Link>
                  <Link
                    href="/tags"
                    className="font-medium text-ink-soft hover:text-brass"
                  >
                    Tags
                  </Link>
                  <Link
                    href="/rooms"
                    className="font-medium text-ink-soft hover:text-brass"
                  >
                    Rooms
                  </Link>
                  <Link
                    href="/books"
                    className="font-medium text-ink-soft hover:text-brass"
                  >
                    Books
                  </Link>
                  <Link
                    href="/requests"
                    className="relative font-medium text-ink-soft hover:text-brass"
                  >
                    Requests
                    {pendingRequests > 0 && (
                      <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-pill bg-oxblood px-1 text-[10px] font-bold text-cream">
                        {pendingRequests}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/customize"
                    className="font-medium text-ink-soft hover:text-brass"
                  >
                    Customize
                  </Link>
                  <Link
                    href="/settings"
                    className="font-medium text-ink-soft hover:text-brass"
                  >
                    Settings
                  </Link>
                  <form action={signOut}>
                    <button
                      className="font-medium text-ink-faint hover:text-oxblood"
                      type="submit"
                    >
                      Sign out
                    </button>
                  </form>
                  {username && (
                    <Link href={`/profile/${username}`} title={`@${username}`}>
                      <Avatar name={displayName ?? username} icon={avatarIcon} size={34} />
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link href="/login" className="font-medium text-ink-soft hover:text-brass">
                    Log in
                  </Link>
                  <Link href="/signup" className="btn-accent !py-1.5">
                    Join
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-shell px-4 py-8 sm:px-6">{children}</main>

        <footer className="mx-auto max-w-shell px-4 py-10 text-center text-xs text-cream-soft sm:px-6">
          <hr className="rule mb-4" />
          Marginalia · read deliberately
        </footer>
      </body>
    </html>
  );
}
