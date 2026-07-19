import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase auth session on every request and, optionally,
// gates protected routes. Called from the root `middleware.ts`.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: any }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: getUser() revalidates the token — do not remove.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Gate profile editing behind auth. The home route stays open: signed out,
  // it shows the landing page.
  const isProtected = path.startsWith("/settings");

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // A verified but unfinished account is sent to the welcome flow. Auth routes
  // and the flow itself are exempt, otherwise the redirect would loop.
  const exempt =
    path === "/welcome" ||
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/reset") ||
    path.startsWith("/auth") ||
    path.startsWith("/api");

  if (user && !exempt) {
    // Once a reader is known to be onboarded, a cookie remembers it (keyed to
    // their id, so a different account on the same browser is still checked).
    // Saves a database query on every navigation.
    const ONB_COOKIE = "m_onb";
    if (request.cookies.get(ONB_COOKIE)?.value !== user.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarded_at")
        .eq("id", user.id)
        .maybeSingle();

      if (profile && !profile.onboarded_at) {
        const url = request.nextUrl.clone();
        url.pathname = "/welcome";
        url.search = "";
        return NextResponse.redirect(url);
      }

      if (profile?.onboarded_at) {
        response.cookies.set(ONB_COOKIE, user.id, {
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
          httpOnly: true,
          sameSite: "lax",
        });
      }
    }
  }

  return response;
}
