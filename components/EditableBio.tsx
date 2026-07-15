"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBio } from "@/app/actions";
import { Spinner } from "./Spinner";

const MAX = 280;

// Inline bio editor for your own profile. Shows the bio (or an "add" prompt) and
// swaps to a textarea when editing.
export function EditableBio({ current }: { current: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(current ?? "");
  const [pending, startTransition] = useTransition();

  function save() {
    const fd = new FormData();
    fd.set("bio", bio);
    startTransition(async () => {
      await updateBio(fd);
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <div className="mt-4 max-w-prose">
        {current ? (
          <p className="text-ink-soft">{current}</p>
        ) : (
          <p className="text-sm italic text-ink-faint">No bio yet.</p>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-1 font-mono text-xs uppercase tracking-wider text-ink-faint hover:text-brass"
        >
          ✎ {current ? "edit bio" : "add bio"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 max-w-prose">
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value.slice(0, MAX))}
        maxLength={MAX}
        rows={3}
        placeholder="Tell readers a little about yourself…"
        className="input resize-none"
        autoFocus
      />
      <div className="mt-1 flex items-center gap-3">
        <button onClick={save} disabled={pending} className="btn-primary !py-1.5 text-sm">
          {pending && <Spinner inline />}
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setBio(current ?? "");
          }}
          className="text-xs font-mono text-ink-faint hover:text-oxblood"
        >
          cancel
        </button>
        <span className="ml-auto font-mono text-xs text-ink-faint">
          {MAX - bio.length} left
        </span>
      </div>
    </div>
  );
}
