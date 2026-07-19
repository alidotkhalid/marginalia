import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { Logo } from "@/components/Logo";
import { NavLinks } from "@/components/NavLinks";
import { TimezoneSync } from "@/components/TimezoneSync";
import { signOut } from "./actions";

const DESCRIPTION =
  "A distraction-free, text-first social network for book lovers. No algorithms, no video, no infinite scroll.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://marginalia-ivory.vercel.app"
  ),
  title: { default: "Marginaly", template: "%s · Marginaly" },
  description: DESCRIPTION,
  openGraph: {
    title: "Marginaly",
    description: DESCRIPTION,
    siteName: "Marginaly",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Marginaly" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Marginaly",
    description: DESCRIPTION,
    images: ["/og.png"],
  },
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
    // One call covers everything waiting: follow requests, room invites, new
    // followers, and comments on your reads since you last looked.
    const [{ data }, { data: unseen }] = await Promise.all([
      supabase
        .from("profiles")
        .select("username, display_name, avatar_icon")
        .eq("id", user.id)
        .single(),
      supabase.rpc("unseen_notifications", { uid: user.id }),
    ]);
    username = data?.username ?? null;
    displayName = data?.display_name ?? data?.username ?? null;
    avatarIcon = data?.avatar_icon ?? null;
    pendingRequests = (unseen as number | null) ?? 0;
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

        {user && <TimezoneSync />}
        <main className="mx-auto max-w-shell px-4 py-8 sm:px-6">{children}</main>

        <footer className="mx-auto max-w-shell px-4 py-10 text-center text-xs text-cream-soft sm:px-6">
          <hr className="rule mb-4" />
          Marginaly · read deliberately
        </footer>
      </body>
    </html>
  );
}
