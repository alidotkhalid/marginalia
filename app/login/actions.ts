"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = createClient();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signup(formData: FormData) {
  const supabase = createClient();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const username = String(formData.get("username") ?? "")
    .toLowerCase()
    .trim();

  // Basic username guard mirrors the DB constraint (3–24, a-z0-9_).
  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    redirect(
      `/signup?error=${encodeURIComponent(
        "Username must be 3–24 chars: lowercase letters, numbers, underscores."
      )}`
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // The DB trigger reads username from this metadata to create the profile.
      data: { username },
      // The emailed link lands on our auth handler, which signs them in and
      // forwards to the welcome flow.
      emailRedirectTo: `${
        process.env.NEXT_PUBLIC_SITE_URL ?? ""
      }/auth/confirm?next=/welcome`,
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");

  // With email confirmation on, Supabase returns a user but no session: the
  // account is not usable until the link is clicked. Tell them to go look.
  if (!data.session) {
    redirect(`/signup?sent=${encodeURIComponent(email)}`);
  }

  // Confirmation is off, so they are already signed in. Straight to setup.
  redirect("/welcome");
}

/** Email a password-reset link. Never reveals whether the address exists. */
export async function requestPasswordReset(formData: FormData) {
  const supabase = createClient();
  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect("/reset");

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${
      process.env.NEXT_PUBLIC_SITE_URL ?? ""
    }/auth/confirm?next=/reset/update`,
  });

  // Same response either way, so the form can't be used to probe for accounts.
  redirect(`/reset?sent=${encodeURIComponent(email)}`);
}

/** Set a new password. Requires the session created by the reset link. */
export async function updatePassword(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/login?error=${encodeURIComponent(
        "That reset link has expired. Request a new one."
      )}`
    );
  }

  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    redirect(
      `/reset/update?error=${encodeURIComponent(
        "Use at least 8 characters."
      )}`
    );
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/reset/update?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/");
}
