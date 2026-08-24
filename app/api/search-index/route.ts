import { NextResponse } from "next/server";
import { buildSearchIndex } from "@/lib/search";
import { getPayload } from "payload";
import config from "@payload-config";

export async function GET() {
  try {
    const payload = await getPayload({ config });
    const docs = await buildSearchIndex(payload as never);
    return NextResponse.json(docs, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json([]);
  }
}
