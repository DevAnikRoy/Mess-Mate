import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function safeNext(raw: string | undefined) {
  return raw && /^\/join\/[A-Za-z0-9]{4,16}$/.test(raw) ? raw : "/";
}

function isHandoffId(value: string | null): value is string {
  return Boolean(value && /^[A-Za-z0-9-]{8,80}$/.test(value));
}

async function saveHandoff(id: string, code: string) {
  const supabase = await createClient();
  if (!supabase) return;
  await supabase.rpc("put_auth_handoff", { p_id: id, p_code: code });
}

function bounceToApp(code: string, origin: string, handoff: string | null) {
  const encoded = encodeURIComponent(code);
  const deep = `messmate://auth/callback?code=${encoded}${handoff ? `&h=${encodeURIComponent(handoff)}` : ""}`;
  const intent = `intent://auth/callback?code=${encoded}${handoff ? `&h=${encodeURIComponent(handoff)}` : ""}#Intent;scheme=messmate;package=com.messmate.app;end`;
  const stay = `${origin}/auth/callback?code=${encoded}&browser=1`;
  const post = handoff
    ? `fetch("/auth/handoff",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({h:${JSON.stringify(handoff)},code:${JSON.stringify(code)}})}).catch(function(){});`
    : "";
  return new NextResponse(
    `<!DOCTYPE html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>মেসমেট</title>
<script>
${post}
(function () {
  var intent = ${JSON.stringify(intent)};
  var deep = ${JSON.stringify(deep)};
  location.replace(intent);
  setTimeout(function () { location.href = deep; }, 400);
})();
</script>
</head><body style="font-family:system-ui,sans-serif;padding:32px;background:#E9E1FF;color:#1B1730">
<p style="font-weight:700;font-size:22px">মেসমেট</p>
<p>লগইন হয়েছে। ব্রাউজার বন্ধ করলে অ্যাপেই থাকবেন।</p>
<p style="margin-top:24px"><a href="${intent}" style="display:inline-block;background:#6C4DFF;color:#fff;font-weight:700;text-decoration:none;padding:14px 18px;border-radius:14px">অ্যাপে ফিরুন</a></p>
<p style="margin-top:16px"><a href="${deep}">অ্যাপ না খুললে এখানে চাপুন</a></p>
<p style="margin-top:28px"><a href="${stay}" style="color:#8E8AA3">ওয়েবেই থাকুন</a></p>
</body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const failed = NextResponse.redirect(new URL("/login?error=callback", origin));
  if (!code) return failed;

  const handoff = searchParams.get("h");
  if (isHandoffId(handoff)) await saveHandoff(handoff, code);

  const ua = request.headers.get("user-agent") ?? "";
  const android = /Android/i.test(ua);
  const stayOnWeb = searchParams.get("browser") === "1";
  const fromApp = searchParams.get("source") === "mobile" || isHandoffId(handoff);
  if ((android || fromApp) && !stayOnWeb) return bounceToApp(code, origin, isHandoffId(handoff) ? handoff : null);

  const supabase = await createClient();
  if (!supabase) return failed;

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return failed;

  const response = NextResponse.redirect(new URL(safeNext(request.cookies.get("mm_next")?.value), origin));
  response.cookies.delete("mm_next");
  return response;
}
