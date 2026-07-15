import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BookCover } from "@/components/BookCover";
import { DeleteDraftButton } from "@/components/DeleteDraftButton";
import { genreLabel } from "@/lib/genres";

type DraftRow = {
  id: string;
  text_note: string | null;
  text_quote: string | null;
  text_review: string | null;
  genre: string | null;
  book_title: string | null;
  book_author: string | null;
  book_cover_id: number | null;
  updated_at: string;
};

export default async function DraftsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("drafts")
    .select("*")
    .eq("author_id", user.id)
    .order("updated_at", { ascending: false });

  const drafts = (data ?? []) as unknown as DraftRow[];

  return (
    <div className="mx-auto max-w-prose space-y-6">
      <div>
        <h1 className="mb-1 font-display text-3xl font-bold text-cream">Drafts</h1>
        <p className="text-sm text-cream-soft">
          Posts you saved to finish later. Continue one to edit and publish it.
        </p>
      </div>

      {drafts.length === 0 ? (
        <div className="card p-6 text-center text-ink-faint">
          No drafts yet. Use &ldquo;Save draft&rdquo; in the composer to keep one here.
        </div>
      ) : (
        <ul className="space-y-4">
          {drafts.map((d) => {
            const preview =
              d.text_note || d.text_quote || d.text_review || "(no text yet)";
            return (
              <li key={d.id} className="card p-5">
                <div className="flex items-start gap-3">
                  {d.book_title && (
                    <BookCover
                      coverId={d.book_cover_id}
                      title={d.book_title}
                      size="S"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-ink">{preview}</p>
                    <p className="mt-1 font-mono text-xs text-ink-faint">
                      {d.book_title ? `${d.book_title} · ` : ""}
                      {d.genre ? `#${d.genre} · ` : ""}
                      {new Date(d.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-4 border-t border-parchment-dark pt-3">
                  <Link href={`/?draft=${d.id}`} className="link text-sm">
                    Continue →
                  </Link>
                  <DeleteDraftButton draftId={d.id} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
