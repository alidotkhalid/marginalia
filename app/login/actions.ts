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
      // After clicking the link in the email, land on the welcome flow.
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/welcome`,
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
