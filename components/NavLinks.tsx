"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The signed-in nav links. The tab matching the current route gets a soft glow.
export function NavLinks({ pendingRequests }: { pendingRequests: number }) {
  const pathname = usePathname();

  const items: { href: string; label: string; badge?: number }[] = [
    { href: "/", label: "Home" },
    { href: "/discover", label: "Discover" },
    { href: "/tags", label: "Tags" },
    { href: "/rooms", label: "Rooms" },
    { href: "/books", label: "Books" },
    { href: "/requests", label: "Requests", badge: pendingRequests },
    { href: "/customize", label: "Customize" },
    { href: "/settings", label: "Settings" },
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className={`relative font-medium transition-colors ${
            isActive(it.href) ? "nav-glow" : "text-ink-soft hover:text-brass"
          }`}
        >
          {it.label}
          {it.badge && it.badge > 0 ? (
            <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-pill bg-oxblood px-1 text-[10px] font-bold text-cream">
              {it.badge}
            </span>
          ) : null}
        </Link>
      ))}
    </>
  );
}
