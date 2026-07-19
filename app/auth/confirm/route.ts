import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Where every emailed Supabase link lands: signup confirmations and password
// resets both arrive here, in one of two shapes depending on project settings.
//   ?code=...                  the PKCE flow, exchanged for a session
//   ?token_hash=...&type=...   the OTP flow, verified directly
// Either way, on success the reader has a session and is sent to `next`.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  // Only ever redirect within the site.
  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") ? nextParam : "/";

  const supabase = createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as
        | "signup"
        | "recovery"
        | "invite"
        | "email_change"
        | "email",
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(
    new URL(
      `/login?error=${encodeURIComponent(
        "That link is invalid or has expired. Request a fresh one and try again."
      )}`,
      origin
    )
  );
}
