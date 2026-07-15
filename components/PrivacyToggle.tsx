"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPrivacy } from "@/app/actions";

// Public ⇄ Private switch. When private, new followers must be approved from the
// Requests page before they can see your notes and reading.
export function PrivacyToggle({ initialPrivate }: { initialPrivate: boolean }) {
  const router = useRouter();
  const [isPrivate, setIsPrivate] = useState(initialPrivate);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !isPrivate;
    setIsPrivate(next);
    startTransition(async () => {
      await setPrivacy(next);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="font-display text-base font-semibold text-ink">
          Private account
        </p>
        <p className="text-sm text-ink-faint">
          {isPrivate
            ? "New followers must be approved before they see your notes."
            : "Anyone can follow you and see your notes."}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isPrivate}
        onClick={toggle}
        disabled={pending}
        className={`relative h-7 w-12 shrink-0 rounded-pill transition-colors ${
          isPrivate ? "bg-forest" : "bg-parchment-dark"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-pill bg-parchment-light transition-all ${
            isPrivate ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}
