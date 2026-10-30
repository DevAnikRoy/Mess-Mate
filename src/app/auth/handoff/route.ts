import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function isHandoffId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9-]{8,80}$/.test(value);
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { h?: unknown; code?: unknown } | null;
  if (!isHandoffId(body?.h) || typeof body?.code !== "string" || body.code.length < 8) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ ok: false }, { status: 503 });
  const { error } = await supabase.rpc("put_auth_handoff", { p_id: body.h, p_code: body.code });
  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const h = request.nextUrl.searchParams.get("h");
  if (!isHandoffId(h)) return NextResponse.json({ code: null });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ code: null });
  const { data } = await supabase.rpc("take_auth_handoff", { p_id: h });
  return NextResponse.json({ code: typeof data === "string" && data ? data : null });
}
