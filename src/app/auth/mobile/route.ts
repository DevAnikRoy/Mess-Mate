import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code") ?? "";
  const encoded = encodeURIComponent(code);
  const deep = `messmate://auth/callback${code ? `?code=${encoded}` : ""}`;
  const intent = `intent://auth/callback${code ? `?code=${encoded}` : ""}#Intent;scheme=messmate;package=com.messmate.app;end`;
  return new NextResponse(
    `<!DOCTYPE html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>মেসমেট</title>
<script>
location.replace(${JSON.stringify(intent)});
setTimeout(function () { location.href = ${JSON.stringify(deep)}; }, 350);
</script>
</head><body style="font-family:system-ui,sans-serif;padding:32px;background:#E9E1FF;color:#1B1730">
<p style="font-weight:700;font-size:22px">মেসমেট</p>
<p>অ্যাপে ফিরে যাচ্ছি…</p>
<p style="margin-top:24px"><a href="${intent}" style="display:inline-block;background:#6C4DFF;color:#fff;font-weight:700;text-decoration:none;padding:14px 18px;border-radius:14px">অ্যাপে খুলুন</a></p>
</body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
}
