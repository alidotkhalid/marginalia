import { NextResponse } from "next/server";
import { searchBooks } from "@/lib/openlibrary";

// GET /api/books?q=dune  → normalized Open Library search results.
// Thin proxy so the client never talks to Open Library directly (keeps the
// User-Agent + field selection + caching in one place).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Bounded input: no relaying arbitrary payloads to Open Library.
  const q = (searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ results: [] });
  const results = await searchBooks(q, 8);
  return NextResponse.json({ results });
}
