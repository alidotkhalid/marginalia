"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  booksBySubject,
  booksByAuthor,
  searchBooks,
  type BookResult,
} from "@/lib/openlibrary";
import { postLimit, type PostKind } from "@/lib/constants";
import { isGenre } from "@/lib/genres";
import { subjectForGenre, subjectForMood } from "@/lib/books";
import { isAvatarIcon } from "@/lib/avatarIcons";
import { isRoomGenre, isRoomMode, MIXED } from "@/lib/rooms";
import type { CommentRow } from "@/lib/comments";

/**
 * Cache a book row (de-duplicated on Open Library id) and return its uuid.
 * Called before creating a post so we can attach a stable book_id.
 */
async function upsertBook(
  supabase: ReturnType<typeof createClient>,
  book: BookResult
): Promise<string> {
  // `books` is a shared table that every reader can write to, and its rows are
  // visible site-wide on book pages. The payload arrives from the client, so
  // nothing here is trusted: ids and lengths are bounded before insert.
  const olid = String(book?.olid ?? "")
    .trim()
    .slice(0, 64);
  if (!/^[A-Za-z0-9:_-]{1,64}$/.test(olid)) {
    throw new Error("That book could not be attached.");
  }

  const title = String(book?.title ?? "").trim().slice(0, 300);
  if (!title) throw new Error("That book could not be attached.");

  const authorRaw = String(book?.author ?? "").trim().slice(0, 200);
  const author = authorRaw.length ? authorRaw : null;

  const coverId =
    Number.isInteger(book?.coverId) &&
    (book.coverId as number) > 0 &&
    (book.coverId as number) < 1e12
      ? (book.coverId as number)
      : null;

  const year =
    Number.isInteger(book?.firstYear) &&
    (book.firstYear as number) > 0 &&
    (book.firstYear as number) <= new Date().getFullYear() + 1
      ? (book.firstYear as number)
      : null;

  // Try to find an existing cached row first.
  const { data: existing } = await supabase
    .from("books")
    .select("id")
    .eq("olid", olid)
    .maybeSingle();

  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("books")
    .insert({
      olid,
      title,
      author,
      cover_id: coverId,
      first_year: year,
    })
    .select("id")
    .single();

  if (error) {
    // A concurrent insert may have won the race; take theirs.
    const { data: raced } = await supabase
      .from("books")
      .select("id")
      .eq("olid", olid)
      .maybeSingle();
    if (raced) return raced.id;
    throw new Error(error.message);
  }
  return data.id;
}

/**
 * Star rating, only kept on reviews. Anything outside 1 to 5 becomes null.
 */
function parseRating(
  raw: FormDataEntryValue | number | null,
  kind: PostKind
): number | null {
  if (kind !== "review") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return n;
}

/**
 * Create a read. A read is exactly one kind: a note, a quote, or a review,
 * chosen in the composer. `book` is the JSON-serialized BookResult.
 */
export async function createPost(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // A read is exactly one thing: a note, a quote, or a review.
  const kindRaw = String(formData.get("kind") ?? "note");
  const kind: PostKind =
    kindRaw === "quote" || kindRaw === "review" ? kindRaw : "note";
  const text = String(formData.get("text") ?? "").trim();
  const genreRaw = String(formData.get("genre") ?? "");
  const genre = isGenre(genreRaw) ? genreRaw : null;
  const rating = parseRating(formData.get("rating"), kind);
  const bookRaw = formData.get("book");

  if (!text) return { error: "Write something first." };
  if (text.length > postLimit(kind))
    return { error: `Keep your ${kind} under ${postLimit(kind)} characters.` };
  if (!bookRaw) return { error: "Attach a book to your read." };

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
    genre,
    kind,
    rating,
    body: text,
    text_note: kind === "note" ? text : null,
    text_quote: kind === "quote" ? text : null,
    text_review: kind === "review" ? text : null,
  });

  if (error) return { error: error.message };

  revalidatePath("/");
  return { error: null };
}

/** Edit one of your own reads (its text, kind, rating, genre). RLS enforces owner. */
export async function updatePost(
  postId: string,
  input: { kind: string; text: string; genre: string; rating?: number }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const kind: PostKind =
    input.kind === "quote" || input.kind === "review" ? input.kind : "note";
  const text = input.text.trim();
  const genre = isGenre(input.genre) ? input.genre : null;
  const rating = parseRating(input.rating ?? null, kind);

  if (!text) return { error: "Write something first." };
  if (text.length > postLimit(kind))
    return { error: `Keep your ${kind} under ${postLimit(kind)} characters.` };

  const { error } = await supabase
    .from("posts")
    .update({
      text_note: kind === "note" ? text : null,
      text_quote: kind === "quote" ? text : null,
      text_review: kind === "review" ? text : null,
      genre,
      kind,
      rating,
      body: text,
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("comments")
    .select(
      "id, body, created_at, author_id, parent_id, author:profiles!author_id (username, display_name, avatar_icon)"
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  const base = (data ?? []) as unknown as Omit<CommentRow, "score" | "my_vote">[];
  if (base.length === 0) return [];

  const ids = base.map((c) => c.id);
  const { data: votes } = await supabase
    .from("comment_votes")
    .select("comment_id, user_id, value")
    .in("comment_id", ids);

  const scoreMap = new Map<string, number>();
  const myVoteMap = new Map<string, number>();
  for (const v of votes ?? []) {
    scoreMap.set(v.comment_id, (scoreMap.get(v.comment_id) ?? 0) + v.value);
    if (user && v.user_id === user.id) myVoteMap.set(v.comment_id, v.value);
  }

  return base.map((c) => ({
    ...c,
    score: scoreMap.get(c.id) ?? 0,
    my_vote: myVoteMap.get(c.id) ?? 0,
  }));
}

/** Upvote (1), downvote (-1), or clear (0) your vote on a comment. */
export async function voteComment(commentId: string, value: number) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (value === 0) {
    await supabase
      .from("comment_votes")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", user.id);
  } else {
    await supabase
      .from("comment_votes")
      .upsert(
        { comment_id: commentId, user_id: user.id, value: value === 1 ? 1 : -1 },
        { onConflict: "comment_id,user_id" }
      );
  }
  revalidatePath("/", "layout");
}

/** Add a comment to a post, or a reply if parentId is given. */
export async function addComment(
  postId: string,
  body: string,
  parentId?: string
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const text = body.trim().slice(0, 500);
  if (!text) return { error: "Write something first." };

  const { error } = await supabase.from("comments").insert({
    post_id: postId,
    author_id: user.id,
    body: text,
    parent_id: parentId ?? null,
  });
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

  // RLS allows this for the comment's author and for the author of the read it
  // sits on. Replies are ordinary comments, so they follow the same rule.
  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) return { error: "That comment could not be removed." };
  revalidatePath("/", "layout");
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
      // Finishing wins: even a book that sat on the to-read shelf flips over.
      await supabase.from("read_books").upsert(
        {
          user_id: user.id,
          book_id: currentId,
          status: "finished",
          finished_at: new Date().toISOString(),
        },
        { onConflict: "user_id,book_id" }
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

/** Set the reader's preset avatar icon (empty string = auto identicon). */
export async function updateAvatarIcon(icon: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const value = icon && isAvatarIcon(icon) ? icon : null;
  await supabase.from("profiles").update({ avatar_icon: value }).eq("id", user.id);
  revalidatePath("/", "layout");
}

/**
 * Finish the welcome flow: name, avatar, bio, and what they are reading now.
 * Everything is optional except that we mark the reader as onboarded, so they
 * are not sent back here on the next visit.
 */
export async function completeOnboarding(input: {
  displayName: string;
  bio: string;
  avatarIcon: string;
  book: BookResult | null;
  progress: number;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const displayName = input.displayName.trim().slice(0, 60);
  const bio = input.bio.trim().slice(0, 280);
  const progress = Math.min(100, Math.max(0, Math.round(input.progress)));

  const patch: Record<string, unknown> = {
    onboarded_at: new Date().toISOString(),
    reading_progress: input.book ? progress : 0,
  };
  if (displayName) patch.display_name = displayName;
  if (bio) patch.bio = bio;
  if (input.avatarIcon && isAvatarIcon(input.avatarIcon)) {
    patch.avatar_icon = input.avatarIcon;
  }

  if (input.book) {
    try {
      patch.currently_reading = await upsertBook(supabase, input.book);
    } catch {
      return { error: "That book could not be saved. Try another." };
    }
  }

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { error: null };
}

/** Add a book to one of the current user's shelves: finished, or to-read. */
export async function addReadBook(
  book: BookResult,
  status: "finished" | "to-read" = "finished"
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const bookId = await upsertBook(supabase, book);
  await supabase.from("read_books").upsert(
    {
      user_id: user.id,
      book_id: bookId,
      status,
      finished_at: new Date().toISOString(),
    },
    { onConflict: "user_id,book_id" }
  );
  revalidatePath("/", "layout");
}

export type GoodreadsRow = {
  title: string;
  author: string | null;
  isbn13: string | null;
  shelf: "read" | "to-read" | "currently-reading";
};

/**
 * Import a small batch of rows from the reader's own Goodreads export. Each
 * book is matched against Open Library (ISBN first, then title + author) for
 * cover art; unmatched books are still shelved, just with a typographic spine.
 * The client sends chunks so no single call runs long.
 */
export async function importGoodreadsRows(rows: GoodreadsRow[]) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let imported = 0;
  let matched = 0;

  for (const row of rows.slice(0, 12)) {
    const title = (row.title ?? "").trim().slice(0, 300);
    if (!title) continue;
    const isbn = (row.isbn13 ?? "").replace(/[^0-9Xx]/g, "");

    // Match on Open Library for the cover.
    let result: BookResult | null = null;
    try {
      const q = isbn ? `isbn:${isbn}` : `${title} ${row.author ?? ""}`.trim();
      const hit = (await searchBooks(q, 1))[0];
      if (hit) {
        const a = hit.title.toLowerCase();
        const b = title.toLowerCase();
        if (isbn || a.includes(b.slice(0, 24)) || b.includes(a)) {
          result = hit;
          matched++;
        }
      }
    } catch {
      /* Open Library hiccup: fall through to the spine fallback */
    }

    if (!result) {
      // Deterministic pseudo-id so re-imports never duplicate the book.
      const slug = (isbn || `${title}-${row.author ?? ""}`)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48);
      result = {
        olid: `gr:${slug}`,
        title,
        author: row.author?.trim() || null,
        coverId: null,
        firstYear: null,
      };
    }

    try {
      const bookId = await upsertBook(supabase, result);

      if (row.shelf === "currently-reading") {
        // Only fill the slot if it is empty; never evict a live book.
        const { data: prof } = await supabase
          .from("profiles")
          .select("currently_reading")
          .eq("id", user.id)
          .maybeSingle();
        if (!prof?.currently_reading) {
          await supabase
            .from("profiles")
            .update({ currently_reading: bookId })
            .eq("id", user.id);
        } else {
          await supabase.from("read_books").upsert(
            { user_id: user.id, book_id: bookId, status: "to-read" },
            { onConflict: "user_id,book_id", ignoreDuplicates: true }
          );
        }
      } else {
        // ignoreDuplicates: an import never overwrites an existing shelf row.
        await supabase.from("read_books").upsert(
          {
            user_id: user.id,
            book_id: bookId,
            status: row.shelf === "read" ? "finished" : "to-read",
          },
          { onConflict: "user_id,book_id", ignoreDuplicates: true }
        );
      }
      imported++;
    } catch {
      /* skip the row; the summary reports what made it */
    }
  }

  revalidatePath("/", "layout");
  return { imported, matched };
}

/** Move a shelved book between finished and to-read. */
export async function setReadBookStatus(
  bookId: string,
  status: "finished" | "to-read"
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("read_books")
    .update({ status, finished_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("book_id", bookId);
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

/** Fetch another page of books for the Books tab's infinite scroll. */
export async function fetchMoreBooks(params: {
  by: string;
  tag: string;
  author: string;
  page: number;
}): Promise<BookResult[]> {
  const page = Math.max(1, Math.min(20, Math.round(params.page)));
  if (params.by === "author") {
    return params.author ? booksByAuthor(params.author, 30, page) : [];
  }
  const subject =
    params.by === "mood"
      ? subjectForMood(params.tag)
      : subjectForGenre(params.tag);
  return booksBySubject(subject, 30, page);
}

// ---------------------------------------------------------------------------
// Live reading rooms
// ---------------------------------------------------------------------------

/** Create a reading room and return its id. */
export async function createRoom(
  name: string,
  genre: string = MIXED,
  mode: string = "quiet",
  book: BookResult | null = null
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const clean = name.trim().slice(0, 60);
  if (!clean) return { error: "Name your room.", id: null };

  const { data, error } = await supabase
    .from("rooms")
    .insert({
      name: clean,
      created_by: user.id,
      genre: isRoomGenre(genre) ? genre : MIXED,
      mode: isRoomMode(mode) ? mode : "quiet",
      // A buddy read: the book this room is reading together.
      book_olid: book?.olid ?? null,
      book_title: book?.title?.slice(0, 300) ?? null,
      book_cover_id: book?.coverId ?? null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message, id: null };
  revalidatePath("/rooms");
  return { error: null, id: data.id as string };
}

/** Invite a reader, by username, into a room. */
export async function inviteToRoom(roomId: string, username: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const handle = username.trim().replace(/^@/, "").toLowerCase();
  if (!handle) return { error: "Who would you like to invite?" };

  const { data: invitee } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .eq("username", handle)
    .maybeSingle();

  if (!invitee) return { error: `No reader called @${handle}.` };
  if (invitee.id === user.id) return { error: "You are already here." };

  const { error } = await supabase.from("room_invites").upsert(
    { room_id: roomId, inviter_id: user.id, invitee_id: invitee.id },
    { onConflict: "room_id,invitee_id", ignoreDuplicates: true }
  );

  // A block on either side is what the RLS policy turns away.
  if (error) return { error: "That reader cannot be invited." };

  revalidatePath("/rooms", "layout");
  return {
    error: null,
    invited: (invitee.display_name as string | null) ?? `@${handle}`,
  };
}

/**
 * Quietly store the browser's IANA timezone so streak days match the reader's
 * own midnight. Validation happens in the database function.
 */
export async function syncTimezone(tz: string) {
  if (!/^[A-Za-z0-9_+\-/]{1,64}$/.test(tz)) return;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.rpc("set_timezone", { new_tz: tz });
}

/** Mark Notifications as read, clearing the dot on the nav tab. */
export async function markNotificationsSeen() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.rpc("mark_notifications_seen");
  revalidatePath("/", "layout");
}

/** Clear an invitation: the invitee dismisses it, or the inviter retracts it. */
export async function dismissRoomInvite(roomId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("room_invites")
    .delete()
    .eq("room_id", roomId)
    .eq("invitee_id", user.id);
  revalidatePath("/rooms", "layout");
}

/** Join a room (or refresh presence). Prefills the book from Currently Reading. */
export async function joinRoom(roomId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Try to prefill the book (title + cover) from the user's Currently Reading.
  const { data: prof } = await supabase
    .from("profiles")
    .select("books!currently_reading (title, cover_id)")
    .eq("id", user.id)
    .maybeSingle();
  const book = prof?.books as unknown as
    | { title: string; cover_id: number | null }
    | null;

  await supabase.from("room_participants").upsert(
    {
      room_id: roomId,
      user_id: user.id,
      book_title: book?.title ?? null,
      book_cover_id: book?.cover_id ?? null,
      last_seen: new Date().toISOString(),
    },
    { onConflict: "room_id,user_id", ignoreDuplicates: false }
  );
  revalidatePath(`/rooms/${roomId}`);
}

/** Heartbeat: keep the current user marked as present in a room. */
export async function touchPresence(roomId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("room_participants")
    .update({ last_seen: new Date().toISOString() })
    .eq("room_id", roomId)
    .eq("user_id", user.id);
}

/** Update your current page (and optionally your book) in a room. */
export async function updateRoomPage(
  roomId: string,
  page: number,
  bookTitle?: string
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const clamped = Math.max(0, Math.min(100000, Math.round(page)));
  const patch: Record<string, unknown> = {
    current_page: clamped,
    last_seen: new Date().toISOString(),
  };
  if (typeof bookTitle === "string") patch.book_title = bookTitle.trim() || null;

  await supabase
    .from("room_participants")
    .update(patch)
    .eq("room_id", roomId)
    .eq("user_id", user.id);
  revalidatePath(`/rooms/${roomId}`);
}

/** Leave a room. */
export async function leaveRoom(roomId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("room_participants")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", user.id);
  revalidatePath(`/rooms/${roomId}`);
}

/** Ensure the current user is a participant of a room (so room-update RLS passes). */
async function ensureParticipant(
  supabase: ReturnType<typeof createClient>,
  roomId: string,
  userId: string
) {
  await supabase.from("room_participants").upsert(
    { room_id: roomId, user_id: userId, last_seen: new Date().toISOString() },
    { onConflict: "room_id,user_id", ignoreDuplicates: false }
  );
}

/** Start the shared room timer for `minutes` (any participant can). */
export async function startTimer(roomId: string, minutes: number) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await ensureParticipant(supabase, roomId, user.id);
  const mins = Math.max(1, Math.min(180, Math.round(minutes)));
  const endsAt = new Date(Date.now() + mins * 60_000).toISOString();
  const { error } = await supabase
    .from("rooms")
    .update({ timer_ends_at: endsAt })
    .eq("id", roomId);
  revalidatePath(`/rooms/${roomId}`);
  return { error: error?.message ?? null };
}

/** Clear the shared room timer. */
export async function stopTimer(roomId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await ensureParticipant(supabase, roomId, user.id);
  await supabase.from("rooms").update({ timer_ends_at: null }).eq("id", roomId);
  revalidatePath(`/rooms/${roomId}`);
}

/** Delete a room (creator only; RLS enforces). */
export async function deleteRoom(roomId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await supabase.from("rooms").delete().eq("id", roomId).eq("created_by", user.id);
  redirect("/rooms");
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

/** Follow or unfollow a genre tag. */
export async function setTagFollow(tag: string, follow: boolean) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isGenre(tag)) return;

  if (follow) {
    await supabase
      .from("tag_follows")
      .upsert(
        { user_id: user.id, tag },
        { onConflict: "user_id,tag", ignoreDuplicates: true }
      );
  } else {
    await supabase
      .from("tag_follows")
      .delete()
      .eq("user_id", user.id)
      .eq("tag", tag);
  }
  revalidatePath("/", "layout");
}

/** Save (bookmark) or unsave a read. */
export async function setSave(postId: string, save: boolean) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (save) {
    await supabase
      .from("saves")
      .upsert(
        { post_id: postId, user_id: user.id },
        { onConflict: "post_id,user_id", ignoreDuplicates: true }
      );
  } else {
    await supabase
      .from("saves")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
  }
  revalidatePath("/", "layout");
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
 * Flag a read or a comment as objectionable. Reports are private to the
 * reporter and reviewed by the operator in the Supabase dashboard. Required by
 * the App Store for user-generated content.
 */
export async function reportContent(input: {
  kind: "read" | "comment";
  id: string;
  reason: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const reason = input.reason.trim().slice(0, 500);
  if (!reason) return { error: "Tell us what is wrong." };
  if (!/^[0-9a-f-]{36}$/i.test(input.id))
    return { error: "That item could not be reported." };

  // One row shape, with exactly one of the two ids set (the DB check enforces
  // this too). A single shape keeps Supabase's insert types happy.
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    post_id: input.kind === "read" ? input.id : null,
    comment_id: input.kind === "comment" ? input.id : null,
    reason,
  });

  // A duplicate (already reported) is a success from the reader's point of view.
  if (error && !/duplicate|unique/i.test(error.message)) {
    return { error: "That report could not be filed. Try again." };
  }
  return { error: null };
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
