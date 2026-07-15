"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { answerAsk, dismissAsk } from "@/app/actions";
import { Spinner } from "./Spinner";

// Reply to (or dismiss) a single incoming ask. A reply becomes a post.
export function AskReplyForm({ askId }: { askId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<"reply" | "dismiss" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reply() {
    setError(null);
    setBusy("reply");
    startTransition(async () => {
      const res = await answerAsk(askId, text);
      if (res.error) {
        setError(res.error);
        setBusy(null);
      } else {
        router.refresh();
      }
    });
  }

  function dismiss() {
    setBusy("dismiss");
    startTransition(async () => {
      await dismissAsk(askId);
      router.refresh();
    });
  }

  return (
    <div className="mt-3 space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder="Write your reply — it'll be posted on your profile…"
        className="input resize-none text-sm"
      />
      {error && <p className="text-sm text-oxblood">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={reply}
          disabled={pending || !text.trim()}
          className="btn-accent !py-1.5 text-sm"
        >
          {busy === "reply" && <Spinner inline />}
          {busy === "reply" ? "Posting…" : "Post reply"}
        </button>
        <button
          type="button"
          onClick={dismiss}
          disabled={pending}
          className="text-xs font-mono text-ink-faint hover:text-oxblood"
        >
          {busy === "dismiss" ? "dismissing…" : "dismiss"}
        </button>
      </div>
    </div>
  );
}
