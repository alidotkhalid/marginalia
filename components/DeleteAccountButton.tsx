"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "@/app/actions";
import { Spinner } from "./Spinner";

// Two-step account deletion: a first click reveals a typed confirmation before
// the destructive action can run.
export function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setError(null);
    startTransition(async () => {
      const res = await deleteAccount();
      if (res?.error) setError(res.error);
      // On success the action signs out and redirects away.
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="btn bg-oxblood text-cream hover:bg-oxblood-light border border-oxblood"
      >
        Delete account
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-ink-soft">
        This permanently deletes your account, posts, comments, and follows. Type{" "}
        <span className="font-mono font-semibold text-oxblood">DELETE</span> to
        confirm.
      </p>
      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="DELETE"
          className="input max-w-[10rem] font-mono"
        />
        <button
          type="button"
          onClick={run}
          disabled={pending || text !== "DELETE"}
          className="btn bg-oxblood text-cream hover:bg-oxblood-light border border-oxblood"
        >
          {pending && <Spinner inline />}
          {pending ? "Deleting…" : "Permanently delete"}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setText("");
            setError(null);
          }}
          className="text-xs font-mono text-ink-faint hover:text-ink"
        >
          cancel
        </button>
      </div>
      {error && <p className="text-sm text-oxblood">{error}</p>}
    </div>
  );
}
