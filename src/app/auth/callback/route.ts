import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNext(raw: string | undefined) {
  return raw && /^\/join\/[A-Za-z0-9]{4,16}$/.test(raw) ? raw : "/";
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const failed = NextResponse.redirect(new URL("/login?error=callback", origin));
  if (!code) return failed;

  const supabase = await createClient();
  if (!supabase) return failed;

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return failed;

  const response = NextResponse.redirect(new URL(safeNext(request.cookies.get("mm_next")?.value), origin));
  response.cookies.delete("mm_next");
  return response;
}
