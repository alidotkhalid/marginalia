import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GoodreadsImport } from "@/components/GoodreadsImport";

export const metadata = { title: "Import from Goodreads" };

export default async function ImportPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold text-cream">
          Bring your library over
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Import your own Goodreads export and your shelves fill themselves:
          finished books, the to-read pile, and what you are reading now.
        </p>
      </div>

      <ol className="card space-y-3 p-5 text-sm text-ink-soft">
        <li>
          <span className="font-mono text-brass">I.</span> On Goodreads, open{" "}
          <span className="font-semibold text-ink">
            My Books → Import and export → Export Library
          </span>
          .
        </li>
        <li>
          <span className="font-mono text-brass">II.</span> Wait for the email
          or refresh, then download{" "}
          <span className="font-mono text-xs">
            goodreads_library_export.csv
          </span>
          .
        </li>
        <li>
          <span className="font-mono text-brass">III.</span> Upload it below.
          The file is yours, exported by you; nothing is fetched from Goodreads.
        </li>
      </ol>

      <GoodreadsImport />
    </div>
  );
}
