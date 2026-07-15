"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BookResult } from "@/lib/openlibrary";
import { postLimit } from "@/lib/constants";
import { isGenre } from "@/lib/genres";
import type { CommentRow } from "@/lib/comments";

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
 * Create a post. A post can carry up to three text sections — note, quote,
 * review — each drawn from the composer's tabs. `book` is the JSON-serialized
 * BookResult. At least one section must be non-empty.
 */
export async function createPost(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const clean = (v: FormDataEntryValue | null) => {
    const s = String(v ?? "").trim();
    return s.length ? s : null;
  };
  const note = clean(formData.get("text_note"));
  const quote = clean(formData.get("text_quote"));
  const review = clean(formData.get("text_review"));
  const genreRaw = String(formData.get("genre") ?? "");
  const genre = isGenre(genreRaw) ? genreRaw : null;
  const bookRaw = formData.get("book");

  if (!note && !quote && !review) return { error: "Write something first." };
  if (note && note.length > postLimit("note"))
    return { error: `Keep your note under ${postLimit("note")} characters.` };
  if (quote && quote.length > postLimit("quote"))
    return { error: `Keep your quote under ${postLimit("quote")} characters.` };
  if (review && review.length > postLimit("review"))
    return { error: `Keep your review under ${postLimit("review")} characters.` };
  if (!bookRaw) return { error: "Attach a book to your post." };

  let bookId: string;
  try {
    const book = JSON.parse(String(bookRaw)) as BookResult;
    bookId = await upsertBook(supabase, book);
  } catch {
    return { error: "That book could not be attached. Try again." };
  }

  // The primary (first non-empty) section fills the legacy body/kind columns.
  const primaryKind = note ? "note" : quote ? "quote" : "review";
  const { error } = await supabase.from("posts").insert({
    author_id: user.id,
    book_id: bookId,
    genre,
    kind: primaryKind,
    body: note ?? quote ?? review,
    text_note: note,
    text_quote: quote,
    text_review: review,
  });

  if (error) return { error: error.message };

  revalidatePath("/");
  return { error: null };
}

/** Edit one of your own posts (its three sections + genre). RLS enforces owner. */
export async function updatePost(
  postId: string,
  sections: { note: string; quote: string; review: string; genre: string }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const note = sections.note.trim() || null;
  const quote = sections.quote.trim() || null;
  const review = sections.review.trim() || null;
  const genre = isGenre(sections.genre) ? sections.genre : null;

  if (!note && !quote && !review) return { error: "Write something first." };
  if (note && note.length > postLimit("note"))
    return { error: `Keep your note under ${postLimit("note")} characters.` };
  if (quote && quote.length > postLimit("quote"))
    return { error: `Keep your quote under ${postLimit("quote")} characters.` };
  if (review && review.length > postLimit("review"))
    return { error: `Keep your review under ${postLimit("review")} characters.` };

  const primaryKind = note ? "note" : quote ? "quote" : "review";
  const { error } = await supabase
    .from("posts")
    .update({
      text_note: note,
      text_quote: quote,
      text_review: review,
      genre,
      kind: primaryKind,
      body: note ?? quote ?? review,
    })
    .eq("id", postId)
    .eq("author_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { error: null };
}

/** Delete one of your own posts (its comments cascade). RLS enforces owner. */
export async function deletePost(postId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("posts").delete().eq("id", postId).eq("author_id", user.id);
  revalidatePath("/", "layout");
}

/** Create or update a draft. Returns the draft id. */
export async function saveDraft(input: {
  id?: string;
  note: string;
  quote: string;
  review: string;
  genre: string;
  book: BookResult | null;
}): Promise<{ error: string | null; id: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const note = input.note.trim() || null;
  const quote = input.quote.trim() || null;
  const review = input.review.trim() || null;
  if (!note && !quote && !review && !input.book)
    return { error: "Nothing to save yet.", id: input.id ?? null };

  const row = {
    author_id: user.id,
    text_note: note,
    text_quote: quote,
    text_review: review,
    genre: isGenre(input.genre) ? input.genre : null,
    book_olid: input.book?.olid ?? null,
    book_title: input.book?.title ?? null,
    book_author: input.book?.author ?? null,
    book_cover_id: input.book?.coverId ?? null,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await supabase
      .from("drafts")
      .update(row)
      .eq("id", input.id)
      .eq("author_id", user.id);
    revalidatePath("/drafts");
    return { error: error?.message ?? null, id: input.id };
  }

  const { data, error } = await supabase
    .from("drafts")
    .insert(row)
    .select("id")
    .single();
  revalidatePath("/drafts");
  if (error) return { error: error.message, id: null };
  return { error: null, id: data.id as string };
}

/** Delete a draft. */
export async function deleteDraft(draftId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("drafts").delete().eq("id", draftId).eq("author_id", user.id);
  revalidatePath("/drafts");
}

/** Fetch the comments for a post (author info joined). */
export async function getComments(postId: string): Promise<CommentRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("comments")
    .select(
      "id, body, created_at, author_id, author:profiles!author_id (username, display_name)"
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  return (data ?? []) as unknown as CommentRow[];
}

/** Add a comment to a post. */
export async function addComment(postId: string, body: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const text = body.trim().slice(0, 500);
  if (!text) return { error: "Write something first." };

  const { error } = await supabase
    .from("comments")
    .insert({ post_id: postId, author_id: user.id, body: text });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { error: null };
}

/** Delete a comment (your own, or one on your post). RLS enforces this. */
export async function deleteComment(commentId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("comments").delete().eq("id", commentId);
  revalidatePath("/", "layout");
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

/**
 * Set how far along (0–100%) the current user is in their current book.
 * Reaching 100% "finishes" the book: it moves to the Read shelf and the
 * Currently Reading slot is cleared so a new book can be started.
 */
export async function setReadingProgress(progress: number) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const clamped = Math.max(0, Math.min(100, Math.round(progress)));

  if (clamped >= 100) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("currently_reading")
      .eq("id", user.id)
      .maybeSingle();
    const currentId = prof?.currently_reading as string | null | undefined;
    if (currentId) {
      await supabase
        .from("read_books")
        .upsert(
          { user_id: user.id, book_id: currentId },
          { onConflict: "user_id,book_id", ignoreDuplicates: true }
        );
    }
    await supabase
      .from("profiles")
      .update({ currently_reading: null, reading_progress: 0 })
      .eq("id", user.id);
  } else {
    await supabase
      .from("profiles")
      .update({ reading_progress: clamped })
      .eq("id", user.id);
  }

  revalidatePath("/", "layout");
}

/** Update the reader's display name (their handle/@username never changes). */
export async function updateDisplayName(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("display_name") ?? "").trim().slice(0, 60);
  if (!name) return { error: "Your name can't be empty." };

  await supabase.from("profiles").update({ display_name: name }).eq("id", user.id);
  revalidatePath("/", "layout");
  return { error: null };
}

/** Update the reader's bio (up to 280 characters; empty clears it). */
export async function updateBio(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const bio = String(formData.get("bio") ?? "").trim().slice(0, 280);
  await supabase
    .from("profiles")
    .update({ bio: bio.length ? bio : null })
    .eq("id", user.id);
  revalidatePath("/", "layout");
  return { error: null };
}

/** Save the reader's profile accent color (#rrggbb) and banner style. */
export async function updateProfileTheme(accentColor: string, bannerStyle: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const color = /^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : "#b1934f";
  const banner = ["gradient", "shelf", "marble", "plain"].includes(bannerStyle)
    ? bannerStyle
    : "gradient";

  await supabase
    .from("profiles")
    .update({ accent_color: color, banner_style: banner })
    .eq("id", user.id);
  revalidatePath("/", "layout");
}

/** Add a book to the current user's "Books Read" shelf. */
export async function addReadBook(book: BookResult) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const bookId = await upsertBook(supabase, book);
  await supabase
    .from("read_books")
    .upsert(
      { user_id: user.id, book_id: bookId },
      { onConflict: "user_id,book_id", ignoreDuplicates: true }
    );
  revalidatePath("/", "layout");
}

/** Remove a book from the current user's "Books Read" shelf. */
export async function removeReadBook(bookId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("read_books")
    .delete()
    .eq("user_id", user.id)
    .eq("book_id", bookId);
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

export type FollowStatus = "none" | "pending" | "accepted";

/**
 * Follow a user. A trigger sets the resulting status: "accepted" for public
 * accounts, "pending" (a follow request) for private ones. Returns the status.
 */
export async function followUser(
  targetId: string
): Promise<{ status: FollowStatus; error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: user.id, following_id: targetId });
  if (error) return { status: "none", error: error.message };

  const { data } = await supabase
    .from("follows")
    .select("status")
    .eq("follower_id", user.id)
    .eq("following_id", targetId)
    .maybeSingle();

  revalidatePath("/", "layout");
  return { status: (data?.status as FollowStatus) ?? "accepted", error: null };
}

/** Unfollow, or cancel a pending follow request. */
export async function unfollowUser(targetId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", targetId);
  revalidatePath("/", "layout");
}

/** Approve an incoming follow request (private accounts). */
export async function acceptFollow(followerId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("follows")
    .update({ status: "accepted" })
    .eq("follower_id", followerId)
    .eq("following_id", user.id);
  revalidatePath("/", "layout");
}

/** Decline an incoming follow request (or remove an existing follower). */
export async function rejectFollow(followerId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", user.id);
  revalidatePath("/", "layout");
}

/** Block a user: removes any follow relationship both ways, then blocks. */
export async function blockUser(targetId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", targetId);
  await supabase
    .from("follows")
    .delete()
    .eq("follower_id", targetId)
    .eq("following_id", user.id);
  await supabase
    .from("blocks")
    .upsert(
      { blocker_id: user.id, blocked_id: targetId },
      { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true }
    );
  revalidatePath("/", "layout");
}

/** Unblock a user. */
export async function unblockUser(targetId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", targetId);
  revalidatePath("/", "layout");
}

/** Toggle the current user's account between public and private. */
export async function setPrivacy(isPrivate: boolean) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("profiles")
    .update({ is_private: isPrivate })
    .eq("id", user.id);
  revalidatePath("/", "layout");
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Ask a question to a reader you follow. Trigger enforces follow/block rules. */
export async function askReader(targetId: string, question: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const q = question.trim();
  if (!q) return { error: "Type a question first." };
  if (q.length > 300) return { error: "Keep your question under 300 characters." };

  const { error } = await supabase
    .from("asks")
    .insert({ asker_id: user.id, target_id: targetId, question: q });
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { error: null };
}

/** Answer an ask: creates a post on your profile showing the question + reply. */
export async function answerAsk(askId: string, answer: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const text = answer.trim();
  if (!text) return { error: "Write a reply first." };
  if (text.length > 2000)
    return { error: "Keep your reply under 2000 characters." };

  const { data: ask } = await supabase
    .from("asks")
    .select("id, question, target_id, asker:profiles!asker_id (username)")
    .eq("id", askId)
    .maybeSingle();
  if (!ask || ask.target_id !== user.id) return { error: "Question not found." };

  const askerUsername =
    (ask.asker as unknown as { username: string } | null)?.username ?? null;

  const { error: postErr } = await supabase.from("posts").insert({
    author_id: user.id,
    kind: "note",
    body: text,
    text_note: text,
    answer_question: ask.question as string,
    answer_asker: askerUsername,
  });
  if (postErr) return { error: postErr.message };

  await supabase.from("asks").delete().eq("id", askId);
  revalidatePath("/", "layout");
  return { error: null };
}

/** Dismiss (delete) an ask without answering. */
export async function dismissAsk(askId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("asks").delete().eq("id", askId).eq("target_id", user.id);
  revalidatePath("/", "layout");
}

/**
 * Permanently delete the current user's account and all their data (via DB
 * cascade), then sign out. Backed by the delete_current_user() SQL function.
 */
export async function deleteAccount() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("delete_current_user");
  if (error) return { error: error.message };

  await supabase.auth.signOut();
  redirect("/signup");
}
