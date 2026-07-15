"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateDisplayName } from "@/app/actions";

// Inline editor for the reader's display name (own profile only). The @username
// is set once at signup and never changes; only this display name is editable.
export function EditableName({ current }: { current: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    const fd = new FormData();
    fd.set("display_name", name);
    startTransition(async () => {
      const res = await updateDisplayName(fd);
      if (res?.error) {
        setError(res.error);
      } else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
          {current}
        </h1>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-mono uppercase tracking-wider text-ink-faint hover:text-brass"
          aria-label="Edit name"
        >
          ✎ edit
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          autoFocus
          className="input max-w-xs !py-1.5 font-display text-xl"
        />
        <button type="button" onClick={save} disabled={pending} className="btn-primary !py-1.5">
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setName(current);
            setError(null);
          }}
          className="text-xs font-mono text-ink-faint hover:text-oxblood"
        >
          cancel
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-oxblood">{error}</p>}
    </div>
  );
}
