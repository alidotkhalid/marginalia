import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { signOut } from "./actions";

export const metadata: Metadata = {
  title: "Marginalia — a quiet place for readers",
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
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", user.id)
      .single();
    username = data?.username ?? null;
    displayName = data?.display_name ?? data?.username ?? null;
  }

  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-20 border-b border-brass/20 bg-parchment/95 backdrop-blur">
          <div className="mx-auto flex max-w-shell items-center justify-between px-4 py-3 sm:px-6">
            <Link
              href="/"
              className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-ink no-underline hover:text-forest"
            >
              <span className="text-brass">❦</span> Marginalia
            </Link>

            <nav className="flex items-center gap-5 text-sm">
              {user ? (
                <>
                  <Link href="/" className="font-medium text-ink-soft hover:text-forest">
                    Home
                  </Link>
                  <Link
                    href="/discover"
                    className="font-medium text-ink-soft hover:text-forest"
                  >
                    Discover
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
                      <Avatar name={displayName ?? username} size={34} />
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link href="/login" className="font-medium text-ink-soft hover:text-forest">
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
          Marginalia · read deliberately · no algorithms, no ads, no noise
        </footer>
      </body>
    </html>
  );
}
