"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BookResult } from "@/lib/openlibrary";
import { setCurrentlyReading, addReadBook } from "@/app/actions";
import { Spinner } from "./Spinner";

// The shelf buttons on a book's page: start it, pile it, or file it as read.
export function BookShelfActions({ book }: { book: BookResult }) {
  const router = useRouter();
  const [done, setDone] = useState<null | "reading" | "shelf" | "tbr">(null);
  const [pending, startTransition] = useTransition();

  const act = (
    fn: () => Promise<unknown>,
    result: "reading" | "shelf" | "tbr"
  ) => {
    startTransition(async () => {
      await fn();
      setDone(result);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => act(() => setCurrentlyReading(book), "reading")}
        disabled={pending}
        className="btn-accent !py-2 text-sm"
      >
        {pending && <Spinner inline />}
        {done === "reading" ? "Reading ✓" : "Start reading"}
      </button>
      <button
        onClick={() => act(() => addReadBook(book, "to-read"), "tbr")}
        disabled={pending}
        className="btn-ghost !py-2 text-sm"
      >
        {done === "tbr" ? "On the pile ✓" : "Want to read"}
      </button>
      <button
        onClick={() => act(() => addReadBook(book, "finished"), "shelf")}
        disabled={pending}
        className="btn-ghost !py-2 text-sm"
      >
        {done === "shelf" ? "On shelf ✓" : "Read it already"}
      </button>
    </div>
  );
}
