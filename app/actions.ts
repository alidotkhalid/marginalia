"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BookResult } from "@/lib/openlibrary";
import { POST_MAX_CHARS } from "@/lib/constants";

/**
 * Cache a book row (de-duplicated on Open Library id) and return its uuid.
 * Called before creating a post so we can attach a stable book_id.
 */
async function upsertBook(
  supabase: ReturnType<typeof createClient>,
  book: BookResult
): Promise<string> {
  // Try to find an existing cached row first.
  const { data: existing } = await supabase
    .from("books")
    .select("id")
    .eq("olid", book.olid)
    .maybeSingle();

  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("books")
    .insert({
      olid: book.olid,
      title: book.title,
      author: book.author,
      cover_id: book.coverId,
      first_year: book.firstYear,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

/**
 * Create a reading note. `book` is the JSON-serialized BookResult chosen in the
 * composer's book search. `body` is the character-limited text.
 */
export async function createPost(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const body = String(formData.get("body") ?? "").trim();
  const kind = String(formData.get("kind") ?? "note");
  const bookRaw = formData.get("book");

  if (!body) return { error: "Write something first." };
  if (body.length > POST_MAX_CHARS)
    return { error: `Keep it under ${POST_MAX_CHARS} characters.` };
  if (!bookRaw) return { error: "Attach a book to your note." };

  let bookId: string;
  try {
    const book = JSON.parse(String(bookRaw)) as BookResult;
    bookId = await upsertBook(supabase, book);
  } catch {
    return { error: "That book could not be attached. Try again." };
  }

  const { error } = await supabase.from("posts").insert({
    author_id: user.id,
    book_id: bookId,
    body,
    kind: ["note", "quote", "review"].includes(kind) ? kind : "note",
  });

  if (error) return { error: error.message };

  revalidatePath("/");
  return { error: null };
}

/** Set the current user's "Currently Reading" book. */
export async function setCurrentlyReading(book: BookResult) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const bookId = await upsertBook(supabase, book);
  // Starting a new book resets progress to 0.
  await supabase
    .from("profiles")
    .update({ currently_reading: bookId, reading_progress: 0 })
    .eq("id", user.id);

  revalidatePath("/", "layout");
}

/** Set how far along (0–100%) the current user is in their current book. */
export async function setReadingProgress(progress: number) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  await supabase
    .from("profiles")
    .update({ reading_progress: clamped })
    .eq("id", user.id);

  revalidatePath("/", "layout");
}

/** Clear the current user's "Currently Reading" book. */
export async function clearCurrentlyReading() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("profiles")
    .update({ currently_reading: null, reading_progress: 0 })
    .eq("id", user.id);

  revalidatePath("/", "layout");
}

/** Follow / unfollow another user by their profile id. */
export async function toggleFollow(targetId: string, isFollowing: boolean) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (isFollowing) {
    await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", targetId);
  } else {
    await supabase
      .from("follows")
      .insert({ follower_id: user.id, following_id: targetId });
  }
  revalidatePath("/", "layout");
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
