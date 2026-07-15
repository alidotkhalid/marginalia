import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { AskReplyForm } from "@/components/AskReplyForm";

type AskRow = {
  id: string;
  question: string;
  created_at: string;
  asker: { username: string; display_name: string | null } | null;
};

// Inbox of questions other readers have asked you. Reply (creates a post) or dismiss.
export default async function AsksPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("asks")
    .select("id, question, created_at, asker:profiles!asker_id (username, display_name)")
    .eq("target_id", user.id)
    .order("created_at", { ascending: false });

  const asks = (data ?? []) as unknown as AskRow[];

  return (
    <div className="mx-auto max-w-prose space-y-6">
      <div>
        <h1 className="mb-1 font-display text-3xl font-bold text-cream">Asks</h1>
        <p className="text-sm text-cream-soft">
          Questions from readers who follow you. Your reply is posted on your profile.
        </p>
      </div>

      {asks.length === 0 ? (
        <div className="card p-6 text-center text-ink-faint">
          No questions right now.
        </div>
      ) : (
        <ul className="space-y-4">
          {asks.map((a) => (
            <li key={a.id} className="card p-5">
              <div className="flex items-start gap-3">
                <Link href={`/profile/${a.asker?.username ?? ""}`}>
                  <Avatar
                    name={a.asker?.display_name ?? a.asker?.username ?? "?"}
                    size={40}
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/profile/${a.asker?.username ?? ""}`}
                    className="font-display font-semibold text-ink no-underline hover:text-brass"
                  >
                    {a.asker?.display_name ?? a.asker?.username ?? "Someone"}
                  </Link>
                  <p className="mt-1 italic text-ink-soft">{a.question}</p>
                </div>
              </div>
              <AskReplyForm askId={a.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
