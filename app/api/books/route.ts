import { NextResponse } from "next/server";
import { searchBooks } from "@/lib/openlibrary";

// GET /api/books?q=dune  → normalized Open Library search results.
// Thin proxy so the client never talks to Open Library directly (keeps the
// User-Agent + field selection + caching in one place).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const results = await searchBooks(q, 8);
  return NextResponse.json({ results });
}
