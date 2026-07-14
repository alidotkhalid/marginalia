import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
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
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();
    username = data?.username ?? null;
  }

  return (
    <html lang="en">
      <body>
        <header className="border-b border-brass/40 bg-parchment">
          <div className="mx-auto flex max-w-prose items-center justify-between px-4 py-4">
            <Link
              href="/"
              className="font-display text-2xl font-bold tracking-tight text-ink no-underline hover:text-forest"
            >
              Marginalia
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              {user ? (
                <>
                  <Link href="/discover" className="text-ink-soft">
                    Discover
                  </Link>
                  {username && (
                    <Link href={`/profile/${username}`} className="text-ink-soft">
                      @{username}
                    </Link>
                  )}
                  <form action={signOut}>
                    <button className="text-ink-faint hover:text-oxblood" type="submit">
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-ink-soft">
                    Log in
                  </Link>
                  <Link href="/signup" className="btn-primary text-sm">
                    Join
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-prose px-4 py-8">{children}</main>

        <footer className="mx-auto max-w-prose px-4 py-10 text-center text-xs text-ink-faint">
          <hr className="rule mb-4" />
          Marginalia · read deliberately · no algorithms, no ads, no noise
        </footer>
      </body>
    </html>
  );
}
