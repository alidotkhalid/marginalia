import { Spinner } from "@/components/Spinner";

// Shown automatically by Next.js during route transitions and server data
// loading, so a click always gets immediate feedback instead of a dead page.
export default function Loading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <Spinner size={44} />
      <p className="font-display italic text-brass">Turning the page…</p>
    </div>
  );
}
