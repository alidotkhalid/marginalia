"use client";

import { useState, useTransition } from "react";
import { inviteToRoom } from "@/app/actions";
import { Spinner } from "./Spinner";

// Two ways into a room: invite a reader by handle, or copy the link and send it
// however you like.
export function InviteReader({ roomId }: { roomId: string }) {
  const [open, setOpen] = useState(false);
  const [handle, setHandle] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function send() {
    setError(null);
    setMsg(null);
    startTransition(async () => {
      const res = await inviteToRoom(roomId, handle);
      if (res.error) setError(res.error);
      else {
        setMsg(`Invited ${res.invited}.`);
        setHandle("");
      }
    });
  }

  function copyLink() {
    const url = `${window.location.origin}/rooms/${roomId}`;
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => setError("Could not copy the link.")
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="font-mono text-sm text-ink-faint transition-colors hover:text-brass"
      >
        invite a reader
      </button>
    );
  }

  return (
    <div className="card w-full max-w-md p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
          Invite a reader
        </h3>
        <button
          onClick={() => setOpen(false)}
          className="font-mono text-xs text-ink-faint hover:text-ink"
        >
          close
        </button>
      </div>

      <div className="flex items-center gap-2">
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="@username"
          className="input"
        />
        <button
          onClick={send}
          disabled={pending || !handle.trim()}
          className="btn-accent shrink-0 !py-2 text-sm"
        >
          {pending && <Spinner inline />}
          Invite
        </button>
      </div>

      <button
        onClick={copyLink}
        className="mt-2 font-mono text-xs text-ink-faint hover:text-brass"
      >
        {copied ? "link copied" : "or copy the room link"}
      </button>

      {msg && <p className="mt-2 text-sm text-brass">{msg}</p>}
      {error && <p className="mt-2 text-sm text-oxblood">{error}</p>}
    </div>
  );
}
