"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRoom } from "@/app/actions";
import { Spinner } from "./Spinner";

export function CreateRoomForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createRoom(name);
      if (res.error) setError(res.error);
      else if (res.id) router.push(`/rooms/${res.id}`);
    });
  }

  return (
    <div className="card p-5">
      <h3 className="section-title mb-3 text-lg">Open a room</h3>
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 60))}
          placeholder="e.g. Sunday morning reading"
          className="input"
        />
        <button
          onClick={submit}
          disabled={pending || !name.trim()}
          className="btn-accent shrink-0"
        >
          {pending && <Spinner inline />}
          Create
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-oxblood">{error}</p>}
    </div>
  );
}
