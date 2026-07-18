"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAvatarIcon } from "@/app/actions";
import { AVATAR_ICON_IDS, avatarLabel } from "@/lib/avatarIcons";
import { Avatar } from "./Avatar";
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

  // Escape closes the panel, and the page behind it should not scroll.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

  const options = ["", ...AVATAR_ICON_IDS]; // "" = chosen for you

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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Choose your avatar"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
          />

          <div className="card relative max-h-[85vh] w-full max-w-lg overflow-y-auto p-6">
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

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {options.map((id) => (
                <button
                  key={id || "auto"}
                  type="button"
                  onClick={() => setSelected(id)}
                  className={`flex flex-col items-center gap-1 rounded-card border-2 p-2 transition-colors ${
                    selected === id
                      ? "border-brass bg-brass/10"
                      : "border-transparent hover:border-parchment-dark"
                  }`}
                >
                  <Avatar name={name} icon={id || null} size={44} />
                  <span className="line-clamp-1 text-center text-[11px] text-ink-soft">
                    {id ? avatarLabel(id) : "Auto"}
                  </span>
                </button>
              ))}
            </div>

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
          </div>
        </div>
      )}
    </div>
  );
}
