"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The signed-in nav. Every tab is a pill; the one matching the current route is
// filled with a soft gold wash. No links are removed, they just wrap on narrow
// screens.
export function NavLinks({
  pendingRequests,
  username,
}: {
  pendingRequests: number;
  username?: string | null;
}) {
  const pathname = usePathname();

  const items: { href: string; label: string; badge?: number }[] = [
    { href: "/", label: "Home" },
    { href: "/discover", label: "Discover" },
    { href: "/tags", label: "Tags" },
    { href: "/rooms", label: "Rooms" },
    { href: "/books", label: "Books" },
    ...(username ? [{ href: `/profile/${username}`, label: "Profile" }] : []),
    { href: "/notifications", label: "Notifications", badge: pendingRequests },
    { href: "/settings", label: "Settings" },
  ];

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className={`nav-pill ${isActive(it.href) ? "nav-pill-active" : ""}`}
        >
          {it.label}
          {it.badge && it.badge > 0 ? (
            <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-pill bg-oxblood px-1 text-[10px] font-bold text-cream">
              {it.badge}
            </span>
          ) : null}
        </Link>
      ))}
    </>
  );
}
