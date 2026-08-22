import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import configPromise from "@/payload.config";

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
]);
const MAX_BYTES = 5 * 1024 * 1024;
const BUCKET = "media";

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config: configPromise });
    const { user } = await payload.auth({ headers: req.headers });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized — sign in to Payload admin first." }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file field." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: `Unsupported type ${file.type}. Allowed: ${[...ALLOWED_TYPES].join(", ")}` }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: `File too large (${Math.round(file.size / 1024)} KB). Max 5120 KB.` }, { status: 400 });
    }

    const ext = (file.name.split(".").pop()?.toLowerCase() || "jpg").replace(/[^a-z0-9]/g, "") || "jpg";
    const key = `chapters/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl) {
      return NextResponse.json({ error: "Server missing NEXT_PUBLIC_SUPABASE_URL." }, { status: 500 });
    }

    // Prefer service role (bypasses RLS). Fall back to anon key if service key not configured.
    const authKey = svc || anon;
    if (!authKey) {
      return NextResponse.json({ error: "Server missing Supabase service/anon key." }, { status: 500 });
    }
    const usingServiceRole = Boolean(svc);

    const uploadUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${BUCKET}/${key}`;
    const upRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authKey}`,
        apikey: authKey,
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "false",
      },
      body: bytes,
    });

    if (!upRes.ok) {
      const body = await upRes.text().catch(() => "");
      // Common case when bucket doesn't exist or RLS without service role
      const hint = !usingServiceRole ? " Tip: set SUPABASE_SERVICE_ROLE_KEY in .env.local so the server can bypass RLS." : "";
      return NextResponse.json(
        { error: `Storage upload failed (${upRes.status}): ${body.slice(0, 500)}.${hint}` },
        { status: 502 }
      );
    }

    const publicUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${key}`;
    return NextResponse.json({ url: publicUrl, key, bucket: BUCKET });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
