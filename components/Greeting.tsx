"use client";

import { useEffect, useState } from "react";

function greetingFor(hour: number): string {
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * "Good evening, Ali · Friday · 3 friends reading now".
 *
 * The hour and weekday come from the reader's own clock, so this is filled in
 * after mount rather than on the server (whose timezone is not theirs).
 */
export function Greeting({
  name,
  readersNow,
}: {
  name: string;
  readersNow: number;
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const hello = now ? `${greetingFor(now.getHours())}, ${name}` : name;
  const weekday = now
    ? now.toLocaleDateString(undefined, { weekday: "long" })
    : null;

  return (
    <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <h1 className="font-display text-4xl font-bold text-cream">{hello}</h1>
      <p className="text-sm text-ink-faint">
        {weekday}
        {weekday && readersNow > 0 && " · "}
        {readersNow > 0 &&
          `${readersNow} ${readersNow === 1 ? "friend" : "friends"} reading now`}
      </p>
    </header>
  );
}
