"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { importGoodreadsRows, type GoodreadsRow } from "@/app/actions";

const MAX_ROWS = 1000;
const CHUNK = 10;

// Minimal CSV parser: handles quoted fields, embedded commas, and newlines
// inside quotes. Goodreads exports are well-formed, so this is enough.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.length > 1 || row[0] !== "") rows.push(row);
  return rows;
}

function toRows(csv: string): GoodreadsRow[] {
  const table = parseCsv(csv);
  if (table.length < 2) return [];
  const header = table[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);

  const iTitle = col("title");
  const iAuthor = col("author");
  const iIsbn13 = col("isbn13");
  const iShelf = col("exclusive shelf");
  if (iTitle === -1 || iShelf === -1) return [];

  const rows: GoodreadsRow[] = [];
  for (const r of table.slice(1)) {
    const shelfRaw = (r[iShelf] ?? "").trim();
    if (!["read", "to-read", "currently-reading"].includes(shelfRaw)) continue;
    const title = (r[iTitle] ?? "").trim();
    if (!title) continue;
    rows.push({
      title,
      author: iAuthor >= 0 ? (r[iAuthor] ?? "").trim() || null : null,
      // Goodreads wraps ISBNs like ="9780316769488"
      isbn13:
        iIsbn13 >= 0
          ? (r[iIsbn13] ?? "").replace(/[^0-9Xx]/g, "") || null
          : null,
      shelf: shelfRaw as GoodreadsRow["shelf"],
    });
    if (rows.length >= MAX_ROWS) break;
  }
  return rows;
}

export function GoodreadsImport() {
  const router = useRouter();
  const [rows, setRows] = useState<GoodreadsRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<{
    imported: number;
    matched: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onFile(file: File | undefined) {
    setError(null);
    setSummary(null);
    setRows(null);
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = toRows(String(reader.result ?? ""));
      if (parsed.length === 0) {
        setError(
          "That doesn't look like a Goodreads export. It needs Title and Exclusive Shelf columns."
        );
      } else {
        setRows(parsed);
      }
    };
    reader.readAsText(file);
  }

  async function run() {
    if (!rows) return;
    setRunning(true);
    setProgress(0);
    let imported = 0;
    let matched = 0;

    for (let i = 0; i < rows.length; i += CHUNK) {
      const res = await importGoodreadsRows(rows.slice(i, i + CHUNK));
      imported += res.imported;
      matched += res.matched;
      setProgress(Math.min(rows.length, i + CHUNK));
    }

    setSummary({ imported, matched });
    setRunning(false);
    router.refresh();
  }

  const counts = rows
    ? {
        read: rows.filter((r) => r.shelf === "read").length,
        tbr: rows.filter((r) => r.shelf === "to-read").length,
        current: rows.filter((r) => r.shelf === "currently-reading").length,
      }
    : null;

  if (summary) {
    return (
      <div className="card p-6 text-center">
        <p className="font-display text-2xl text-ink">
          {summary.imported} books shelved
        </p>
        <p className="mt-1 text-sm text-ink-faint">
          {summary.matched} matched with cover art. The rest keep a quiet
          typographic spine.
        </p>
        <a href="/" className="btn-accent mt-5 inline-flex no-underline">
          See your shelf
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="card block cursor-pointer border-dashed p-8 text-center transition-colors hover:border-brass/50">
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <span className="font-display text-lg text-ink">
          {fileName || "Choose your goodreads_library_export.csv"}
        </span>
        <span className="mt-1 block text-sm text-ink-faint">
          {fileName ? "Choose a different file" : "or drop it on this card"}
        </span>
      </label>

      {error && <p className="text-sm text-oxblood">{error}</p>}

      {rows && counts && !running && (
        <div className="card space-y-4 p-5">
          <p className="text-sm text-ink-soft">
            Found <span className="font-semibold text-ink">{rows.length}</span>{" "}
            books: {counts.read} finished, {counts.tbr} to read
            {counts.current > 0 && `, ${counts.current} in progress`}.
          </p>
          <p className="text-xs text-ink-faint">
            Shelves only. Your Goodreads reviews are not imported or published.
            Books already on your shelves are left untouched.
          </p>
          <button onClick={run} className="btn-accent">
            Import {rows.length} books
          </button>
        </div>
      )}

      {running && rows && (
        <div className="card p-5">
          <p className="mb-2 text-sm text-ink-soft">
            Shelving {progress} of {rows.length}… matching covers as we go.
          </p>
          <div className="progress">
            <span style={{ width: `${(progress / rows.length) * 100}%` }} />
          </div>
          <p className="mt-2 text-xs text-ink-faint">
            Large libraries take a few minutes. Keep this tab open.
          </p>
        </div>
      )}
    </div>
  );
}
