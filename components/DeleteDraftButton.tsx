"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteDraft } from "@/app/actions";

export function DeleteDraftButton({ draftId }: { draftId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          await deleteDraft(draftId);
          router.refresh();
        })
      }
      disabled={pending}
      className="font-mono text-xs text-ink-faint hover:text-oxblood"
    >
      delete
    </button>
  );
}
