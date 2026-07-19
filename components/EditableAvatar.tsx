"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAvatarIcon } from "@/app/actions";
import { avatarLabel } from "@/lib/avatarIcons";
import { Avatar } from "./Avatar";
import { AvatarGrid } from "./AvatarGrid";
import { Modal } from "./Modal";
import { Spinner } from "./Spinner";

/**
 * The reader's avatar with an inline edit affordance, matching the name editor.
 * Choosing opens a panel over the profile with every avatar; nothing is written
 * until Save, so browsing the options costs nothing.
 */
export function EditableAvatar({
  name,
  current,
}: {
  name: string;
  current: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>(current ?? "");
  const [pending, startTransition] = useTransition();

  function close() {
    setSelected(current ?? "");
    setOpen(false);
  }

  function save() {
    startTransition(async () => {
      await updateAvatarIcon(selected);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Avatar name={name} icon={current} size={104} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono text-xs uppercase tracking-wider text-ink-faint transition-colors hover:text-brass"
        aria-label="Edit avatar"
      >
        ✎ edit avatar
      </button>

      {open && (
        <Modal label="Choose your avatar" onClose={close}>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-display text-xl italic text-brass">
              Choose your avatar
            </h2>
            <button
              type="button"
              onClick={close}
              className="font-mono text-xs text-ink-faint hover:text-ink"
            >
              close
            </button>
          </div>

          <div className="mb-5 flex items-center gap-3">
            <Avatar name={name} icon={selected || null} size={56} />
            <p className="text-sm text-ink-faint">
              {selected
                ? avatarLabel(selected)
                : "Chosen for you, from your name."}
            </p>
          </div>

          <AvatarGrid name={name} selected={selected} onSelect={setSelected} />

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={close}
              className="font-mono text-xs text-ink-faint hover:text-oxblood"
            >
              cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="btn-accent"
            >
              {pending && <Spinner inline />}
              {pending ? "Saving…" : "Save avatar"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
